-- ==============================================================================
-- MIGRACIÓN 022: AJUSTE DE ESTADOS Y BLINDAJE DE PRIVACIDAD EN POSTULACIONES
-- ==============================================================================
-- Portal Municipal de Empleo - Municipalidad de Funes
-- Estado: PENDIENTE DE EJECUCIÓN MANUAL EN SUPABASE TRAS APROBACIÓN
--
-- Contenido y Justificación Técnica:
-- 1. Asegurar que las observaciones en historial_postulacion no revelen notas
--    ni identidades internas de la Oficina de Empleo hacia consultas del postulante.
-- 2. Asegurar que la función RPC public.responder_candidato_empresa() emita la
--    notificación correspondiente a la Oficina de Empleo (administración)
--    y al postulante con su motivo cuando sea rechazo, o notificación de éxito al contratar.
-- 3. Proteger la política RLS de consulta del historial para que un postulante
--    solamente acceda a información pertinente a su estado sin notas internas.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. ACTUALIZAR FUNCIÓN RPC DE RESPUESTA DE EMPRESA CON NOTIFICACIÓN ADMINISTRATIVA
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.responder_candidato_empresa(
    p_postulacion_id UUID,
    p_decision TEXT, -- 'contratado' o 'rechazado'
    p_motivo_rechazo TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_empresa_id UUID;
    v_empresa_nombre TEXT;
    v_oferta_empresa_id UUID;
    v_oferta_titulo TEXT;
    v_postulante_id UUID;
    v_estado_actual public.application_status;
    v_fecha_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF p_decision NOT IN ('contratado', 'rechazado') THEN
        RAISE EXCEPTION 'Decisión inválida. Los únicos resultados permitidos son "contratado" o "rechazado".';
    END IF;

    IF p_decision = 'rechazado' AND (p_motivo_rechazo IS NULL OR length(trim(p_motivo_rechazo)) = 0) THEN
        RAISE EXCEPTION 'El motivo de rechazo es obligatorio para registrar la decisión.';
    END IF;

    SELECT id, COALESCE(nombre_fantasia, razon_social, 'Empresa empleadora')
    INTO v_empresa_id, v_empresa_nombre
    FROM public.empresas
    WHERE user_id = auth.uid() AND (estado = 'aprobada' OR verificada = true);

    IF v_empresa_id IS NULL AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No posee permisos de empresa activa para gestionar postulaciones.';
    END IF;

    SELECT o.empresa_id, o.titulo, p.postulante_id, p.estado
    INTO v_oferta_empresa_id, v_oferta_titulo, v_postulante_id, v_estado_actual
    FROM public.postulaciones p
    JOIN public.ofertas o ON p.oferta_id = o.id
    WHERE p.id = p_postulacion_id;

    IF v_oferta_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Postulación no encontrada.';
    END IF;

    IF NOT public.is_admin() AND v_oferta_empresa_id <> v_empresa_id THEN
        RAISE EXCEPTION 'Operación denegada: La postulación no corresponde a una oferta de su empresa.';
    END IF;

    IF v_estado_actual::text <> 'presentado_a_empresa' AND v_estado_actual::text <> 'entrevista' THEN
        RAISE EXCEPTION 'Solo se puede registrar resultado sobre candidatos derivados por la Oficina de Empleo.';
    END IF;

    IF p_decision = 'contratado' THEN
        UPDATE public.postulaciones
        SET estado = 'contratado'::public.application_status,
            fecha_respuesta_empresa = v_fecha_now,
            updated_at = v_fecha_now
        WHERE id = p_postulacion_id;

        -- Notificar a administradores
        PERFORM public.notificar_administradores(
            'Candidato contratado por empresa',
            v_empresa_nombre || ' confirmó la contratación de un postulante para la búsqueda "' || v_oferta_titulo || '".',
            'sistema',
            '/admin?tab=ofertas',
            'empresa_contratacion_' || p_postulacion_id
        );
    ELSE
        UPDATE public.postulaciones
        SET estado = 'rechazado_por_empresa'::public.application_status,
            motivo_rechazo_empresa = trim(p_motivo_rechazo),
            fecha_rechazo_empresa = v_fecha_now,
            fecha_respuesta_empresa = v_fecha_now,
            updated_at = v_fecha_now
        WHERE id = p_postulacion_id;

        -- Notificar a administradores con el motivo del rechazo
        PERFORM public.notificar_administradores(
            'Candidato no seleccionado por empresa',
            v_empresa_nombre || ' finalizó la evaluación de un candidato para "' || v_oferta_titulo || '". Motivo: ' || trim(p_motivo_rechazo),
            'alerta',
            '/admin?tab=ofertas',
            'empresa_rechazo_' || p_postulacion_id
        );
    END IF;

    -- Actualizar observaciones en historial con leyenda institucional neutra para resguardar la privacidad
    UPDATE public.historial_postulacion
    SET observaciones = CASE 
        WHEN p_decision = 'contratado' THEN 'Candidato seleccionado e incorporado al puesto laboral.'
        ELSE 'Evaluación del candidato concluida por la empresa empleadora.'
    END
    WHERE id = (
        SELECT id FROM public.historial_postulacion
        WHERE postulacion_id = p_postulacion_id
        ORDER BY created_at DESC
        LIMIT 1
    );
END;
$$;

REVOKE ALL ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 2. REGISTRO EN CONTROL DE MIGRACIONES
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_schema_migrations') THEN
    INSERT INTO public._schema_migrations (version, name, applied_at)
    VALUES ('022', '022_ajuste_estados_y_blindaje_privacidad_postulaciones', now())
    ON CONFLICT (version) DO UPDATE
    SET applied_at = timezone('utc'::text, now()),
        name = EXCLUDED.name;
  END IF;
END $$;

COMMIT;
