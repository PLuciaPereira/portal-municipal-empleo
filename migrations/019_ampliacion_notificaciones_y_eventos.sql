-- ==============================================================================
-- Migración 019: Ampliación del Sistema de Notificaciones, Deduplicación y Eventos
-- Portal de Empleo - Municipalidad de Funes
-- ==============================================================================
-- Instrucciones:
-- Ejecutar este script en el SQL Editor de Supabase.
-- Es completamente idempotente (puede ejecutarse múltiples veces de forma segura).
-- ==============================================================================

BEGIN;

-- 1. Ampliar columnas en public.notificaciones para metadatos y deduplicación
ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS agrupador_key TEXT DEFAULT NULL;

-- 2. Asegurar índices para búsqueda y deduplicación
CREATE INDEX IF NOT EXISTS idx_notificaciones_agrupador 
  ON public.notificaciones(user_id, agrupador_key) 
  WHERE agrupador_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notificaciones_metadata_gin 
  ON public.notificaciones USING gin (metadata);

-- 3. Permisos GRANT asegurados
GRANT ALL ON TABLE public.notificaciones TO service_role, postgres;
GRANT SELECT, INSERT, UPDATE ON public.notificaciones TO authenticated;

-- Asegurar RLS de inserción para authenticated
DROP POLICY IF EXISTS "Insercion autorizada de notificaciones" ON public.notificaciones;
CREATE POLICY "Insercion autorizada de notificaciones"
  ON public.notificaciones
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- 4. Función RPC para insertar notificación deduplicada individual
CREATE OR REPLACE FUNCTION public.crear_notificacion_deduplicada(
    p_user_id UUID,
    p_titulo TEXT,
    p_mensaje TEXT,
    p_tipo TEXT DEFAULT 'info',
    p_link TEXT DEFAULT NULL,
    p_agrupador_key TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_dias_ventana INTEGER DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existente UUID;
    v_nueva_id UUID;
BEGIN
    IF p_agrupador_key IS NOT NULL THEN
        -- Verificar si ya existe notificación con esa clave en la ventana de días
        SELECT id INTO v_existente
        FROM public.notificaciones
        WHERE user_id = p_user_id
          AND agrupador_key = p_agrupador_key
          AND created_at >= (now() - (p_dias_ventana || ' days')::INTERVAL)
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existente IS NOT NULL THEN
            RETURN v_existente; -- Ya existía, se evita duplicar
        END IF;
    END IF;

    INSERT INTO public.notificaciones (
        user_id,
        titulo,
        mensaje,
        tipo,
        link,
        agrupador_key,
        metadata,
        leida
    ) VALUES (
        p_user_id,
        p_titulo,
        p_mensaje,
        p_tipo,
        p_link,
        p_agrupador_key,
        COALESCE(p_metadata, '{}'::jsonb),
        false
    )
    RETURNING id INTO v_nueva_id;

    RETURN v_nueva_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_notificacion_deduplicada(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_notificacion_deduplicada(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) TO authenticated, service_role;

-- 5. Función RPC SECURITY DEFINER para notificar al equipo de administradores sin bloqueos de RLS
CREATE OR REPLACE FUNCTION public.notificar_administradores(
    p_titulo TEXT,
    p_mensaje TEXT,
    p_tipo TEXT DEFAULT 'sistema',
    p_link TEXT DEFAULT NULL,
    p_agrupador_key TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_dias_ventana INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r_admin RECORD;
    v_count INTEGER := 0;
    v_dedup_key TEXT;
BEGIN
    FOR r_admin IN
        SELECT id
        FROM public.perfil
        WHERE rol = 'admin' AND activo = true AND deleted_at IS NULL
    LOOP
        v_dedup_key := CASE 
            WHEN p_agrupador_key IS NOT NULL THEN r_admin.id || '_' || p_agrupador_key 
            ELSE NULL 
        END;

        PERFORM public.crear_notificacion_deduplicada(
            r_admin.id,
            p_titulo,
            p_mensaje,
            p_tipo,
            p_link,
            v_dedup_key,
            p_metadata,
            p_dias_ventana
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Firma alternativa para retrocompatibilidad con llamadas simples (4 argumentos)
CREATE OR REPLACE FUNCTION public.notificar_administradores(
    p_titulo TEXT,
    p_mensaje TEXT,
    p_tipo TEXT DEFAULT 'sistema',
    p_link TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.notificar_administradores(
        p_titulo,
        p_mensaje,
        p_tipo,
        p_link,
        NULL,
        '{}'::jsonb,
        1
    );
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_administradores(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar_administradores(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.notificar_administradores(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar_administradores(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 6. Función RPC para verificar ofertas próximas a vencer (5 días) y vencidas para un usuario o administradores
CREATE OR REPLACE FUNCTION public.verificar_vencimientos_notificaciones(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rol TEXT;
    v_empresa_id UUID;
    v_count INTEGER := 0;
    r_oferta RECORD;
    v_hoy DATE := CURRENT_DATE;
    v_limite_aviso DATE := CURRENT_DATE + 5;
    v_admins_notificados INTEGER := 0;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT rol INTO v_rol
    FROM public.perfil
    WHERE id = p_user_id;

    -- A) Caso Empresa: verificar ofertas propias
    IF v_rol = 'empresa' THEN
        SELECT id INTO v_empresa_id
        FROM public.empresas
        WHERE user_id = p_user_id;

        IF v_empresa_id IS NOT NULL THEN
            -- 1. Ofertas próximas a vencer (entre hoy y hoy + 5 días)
            FOR r_oferta IN
                SELECT id, titulo, fecha_limite
                FROM public.ofertas
                WHERE empresa_id = v_empresa_id
                  AND estado = 'publicada'
                  AND deleted_at IS NULL
                  AND fecha_limite IS NOT NULL
                  AND fecha_limite::DATE >= v_hoy
                  AND fecha_limite::DATE <= v_limite_aviso
            LOOP
                PERFORM public.crear_notificacion_deduplicada(
                    p_user_id,
                    'Oferta próxima a vencer',
                    'Tu oferta "' || r_oferta.titulo || '" vence el ' || to_char(r_oferta.fecha_limite::DATE, 'DD/MM/YYYY') || '. Podés renovarla por 30 días adicionales desde tu panel.',
                    'vencimiento',
                    '/empresa',
                    'vence_5d_' || r_oferta.id,
                    jsonb_build_object('oferta_id', r_oferta.id, 'fecha_limite', r_oferta.fecha_limite),
                    10
                );
                v_count := v_count + 1;
            END LOOP;

            -- 2. Ofertas vencidas (fecha_limite < hoy)
            FOR r_oferta IN
                SELECT id, titulo, fecha_limite
                FROM public.ofertas
                WHERE empresa_id = v_empresa_id
                  AND estado = 'publicada'
                  AND deleted_at IS NULL
                  AND fecha_limite IS NOT NULL
                  AND fecha_limite::DATE < v_hoy
            LOOP
                PERFORM public.crear_notificacion_deduplicada(
                    p_user_id,
                    'Oferta vencida',
                    'Tu búsqueda "' || r_oferta.titulo || '" ha cumplido su fecha límite (' || to_char(r_oferta.fecha_limite::DATE, 'DD/MM/YYYY') || '). Revisá los candidatos o renová la publicación.',
                    'vencimiento',
                    '/empresa',
                    'vencida_' || r_oferta.id,
                    jsonb_build_object('oferta_id', r_oferta.id, 'fecha_limite', r_oferta.fecha_limite),
                    30
                );
                v_count := v_count + 1;
            END LOOP;
        END IF;

    -- B) Caso Administrador: verificar resumen de ofertas por vencer/vencidas
    ELSIF v_rol = 'admin' THEN
        SELECT count(*) INTO v_admins_notificados
        FROM public.ofertas
        WHERE estado = 'publicada'
          AND deleted_at IS NULL
          AND fecha_limite IS NOT NULL
          AND fecha_limite::DATE >= v_hoy
          AND fecha_limite::DATE <= v_limite_aviso;

        IF v_admins_notificados > 0 THEN
            PERFORM public.crear_notificacion_deduplicada(
                p_user_id,
                'Ofertas próximas a vencer',
                'Hay ' || v_admins_notificados || ' oferta(s) laboral(es) que vencerán en los próximos 5 días.',
                'vencimiento',
                '/admin?tab=ofertas',
                'admin_resumen_vence_' || to_char(v_hoy, 'YYYY_MM_DD'),
                jsonb_build_object('cantidad', v_admins_notificados),
                1
            );
            v_count := v_count + 1;
        END IF;
    END IF;

    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_vencimientos_notificaciones(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verificar_vencimientos_notificaciones(UUID) TO authenticated, service_role;

-- 7. Función RPC para notificar a postulantes sobre nuevas ofertas en sus rubros
CREATE OR REPLACE FUNCTION public.notificar_postulantes_ofertas_rubro(p_oferta_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_oferta_titulo TEXT;
    v_rubro_id INTEGER;
    v_rubros_adicionales INTEGER[];
    v_count INTEGER := 0;
    r_postulante RECORD;
    v_agrupador TEXT := 'nueva_oferta_rubro_' || to_char(CURRENT_DATE, 'YYYY_MM_DD');
BEGIN
    SELECT titulo, rubro_id INTO v_oferta_titulo, v_rubro_id
    FROM public.ofertas
    WHERE id = p_oferta_id AND estado = 'publicada' AND deleted_at IS NULL;

    IF v_oferta_titulo IS NULL THEN
        RETURN 0;
    END IF;

    SELECT array_agg(DISTINCT r_id) INTO v_rubros_adicionales
    FROM (
        SELECT v_rubro_id AS r_id WHERE v_rubro_id IS NOT NULL
        UNION
        SELECT rubro_id AS r_id FROM public.ofertas_rubros WHERE oferta_id = p_oferta_id
    ) t;

    IF v_rubros_adicionales IS NULL OR array_length(v_rubros_adicionales, 1) = 0 THEN
        RETURN 0;
    END IF;

    FOR r_postulante IN
        SELECT DISTINCT pr.perfil_id
        FROM public.perfil_rubros pr
        JOIN public.perfil p ON pr.perfil_id = p.id
        WHERE pr.rubro_id = ANY(v_rubros_adicionales)
          AND p.rol = 'postulante'
          AND p.activo = true
          AND p.deleted_at IS NULL
    LOOP
        PERFORM public.crear_notificacion_deduplicada(
            r_postulante.perfil_id,
            'Nueva oferta de tu interés',
            'Se publicó una nueva oportunidad laboral: "' || v_oferta_titulo || '", coincidente con tus rubros de preferencia.',
            'postulacion',
            '/ofertas',
            v_agrupador || '_' || p_oferta_id,
            jsonb_build_object('oferta_id', p_oferta_id),
            7
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_postulantes_ofertas_rubro(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar_postulantes_ofertas_rubro(UUID) TO authenticated, service_role;

-- 8. Actualización de la función RPC retirar_postulacion
CREATE OR REPLACE FUNCTION public.retirar_postulacion(
    p_postulacion_id UUID,
    p_motivo TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_postulante_id UUID;
    v_estado_actual public.application_status;
    v_oferta_id UUID;
    v_oferta_titulo TEXT;
    v_empresa_user_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT p.postulante_id, p.estado, p.oferta_id, o.titulo, e.user_id
    INTO v_postulante_id, v_estado_actual, v_oferta_id, v_oferta_titulo, v_empresa_user_id
    FROM public.postulaciones p
    JOIN public.ofertas o ON p.oferta_id = o.id
    JOIN public.empresas e ON o.empresa_id = e.id
    WHERE p.id = p_postulacion_id;

    IF v_postulante_id IS NULL THEN
        RAISE EXCEPTION 'Postulación no encontrada.';
    END IF;

    IF v_postulante_id <> auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No puede retirar una postulación que no le pertenece.';
    END IF;

    IF v_estado_actual::text IN ('contratado', 'retirado_por_postulante') THEN
        RAISE EXCEPTION 'No se puede retirar una postulación finalizada o ya retirada.';
    END IF;

    UPDATE public.postulaciones
    SET estado = 'retirado_por_postulante'::public.application_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_postulacion_id;

    IF p_motivo IS NOT NULL AND length(trim(p_motivo)) > 0 THEN
        UPDATE public.historial_postulacion
        SET observaciones = 'Retiro voluntario: ' || p_motivo
        WHERE postulacion_id = p_postulacion_id
          AND estado_nuevo::text = 'retirado_por_postulante'
          AND created_at >= (now() - interval '5 seconds');
    END IF;

    IF v_estado_actual::text IN ('presentado_a_empresa', 'entrevista') AND v_empresa_user_id IS NOT NULL THEN
        PERFORM public.crear_notificacion_deduplicada(
            v_empresa_user_id,
            'Candidato retiró su postulación',
            'Un candidato derivado ha retirado voluntariamente su postulación para la búsqueda "' || v_oferta_titulo || '".',
            'alerta',
            '/empresa',
            'retiro_' || p_postulacion_id,
            jsonb_build_object(
                'postulacion_id', p_postulacion_id,
                'oferta_id', v_oferta_id,
                'motivo', p_motivo
            ),
            30
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.retirar_postulacion(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retirar_postulacion(UUID, TEXT) TO authenticated, service_role;

-- 9. Registrar migración en _schema_migrations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_schema_migrations') THEN
    INSERT INTO public._schema_migrations (version, name, applied_at)
    VALUES ('019', '019_ampliacion_notificaciones_y_eventos', now())
    ON CONFLICT (version) DO UPDATE
    SET applied_at = timezone('utc'::text, now()),
        name = EXCLUDED.name;
  END IF;
END $$;

COMMIT;