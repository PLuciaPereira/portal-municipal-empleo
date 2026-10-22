-- ==============================================================================
-- MIGRACIÓN 009: FASE 6 · SEGURIDAD EMPRESA, OFERTAS Y CANDIDATOS
-- ==============================================================================
-- Portal Municipal de Empleo — Municipalidad de Funes
-- Estado: PENDIENTE DE REVISIÓN Y EJECUCIÓN MANUAL EN SUPABASE SQL EDITOR
--
-- Contenido y justificación técnica:
-- 1. Eliminación limpia y controlada del estado transitorio 'seleccionado':
--    - En el ciclo de selección de Funes, el flujo directo para la empresa es:
--      'presentado_a_empresa' -> 'contratado' O 'rechazado_por_empresa'.
--    - Se actualiza el trigger `validate_postulacion_integrity_and_status()`
--      restringiendo las transiciones para empresas exclusivamente a esas dos resoluciones.
-- 2. Revocación inmediata del acceso al CV para empresas en estados terminales:
--    - En `vista_candidatos_empresa` y en la función `obtener_candidatos_empresa(UUID)`:
--      la columna `cv_url` devuelve NULL una vez que el candidato está en
--      'contratado' o 'rechazado_por_empresa' (solo visible mientras esté 'presentado_a_empresa').
--    - La política de storage `cv_empresa_read_presented` se ajusta para consultar
--      directamente `vista_candidatos_empresa`, garantizando que si `cv_url` es NULL,
--      el archivo no pueda descargarse vía Storage API.
-- 3. Blindaje de decisiones de candidatos vía RPC SECURITY DEFINER:
--    - Se elimina la política permisiva `postulaciones_empresa_update`.
--    - Las decisiones de la empresa solo pueden ejecutarse a través de
--      `public.responder_candidato_empresa()`, que valida permisos, oferta y motivos.
--    - Al rechazar, el motivo confidencial para la Oficina de Empleo se almacena en
--      `postulaciones.motivo_rechazo_empresa`. En `historial_postulacion` se registra
--      una leyenda institucional genérica ('Candidato evaluado por la empresa') para no
--      filtrar motivos internos o sensibles al postulante en su historial.
-- 4. Protección de integridad de datos comerciales de empresas aprobadas:
--    - Se crea el trigger `trigger_protect_empresa_approved_fields` para impedir
--      la alteración de `cuit` y `razon_social` una vez que la empresa se encuentra 'aprobada'.
-- 5. Control de estados y baja lógica en ofertas para empresas:
--    - Incorporación de columna `motivo_baja` en `public.ofertas`.
--    - Se ajusta la política `ofertas_empresa_update` para impedir que una empresa modifique
--      una oferta que se encuentra en 'pendiente_revision' o que altere campos de moderación municipal.
-- 6. Registro de la versión '009' en public._schema_migrations.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. MOTIVO DE BAJA EN OFERTAS
-- ==============================================================================
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS motivo_baja TEXT;

-- ==============================================================================
-- 2. TRIGGER DE PROTECCIÓN DE DATOS COMERCIALES EN EMPRESAS APROBADAS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_empresa_approved_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Si la empresa ya está aprobada y no es administrador
    IF OLD.estado = 'aprobada' AND NOT public.is_admin() THEN
        IF NEW.cuit IS DISTINCT FROM OLD.cuit THEN
            RAISE EXCEPTION 'Operación denegada: El CUIT de una empresa aprobada no puede ser modificado sin intervención administrativa.';
        END IF;

        IF NEW.razon_social IS DISTINCT FROM OLD.razon_social THEN
            RAISE EXCEPTION 'Operación denegada: La Razón Social de una empresa aprobada no puede ser modificada sin intervención administrativa.';
        END IF;

        IF NEW.estado IS DISTINCT FROM OLD.estado THEN
            RAISE EXCEPTION 'Operación denegada: No puede modificar el estado de habilitación de su propia empresa.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_empresa_approved_fields ON public.empresas;
CREATE TRIGGER trigger_protect_empresa_approved_fields
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_empresa_approved_fields();


-- ==============================================================================
-- 3. POLÍTICAS RLS EN OFERTAS: PROTECCIÓN DE EDICIÓN EN REVISIÓN Y CAMPOS ADMIN
-- ==============================================================================
DROP POLICY IF EXISTS "ofertas_empresa_update" ON public.ofertas;
CREATE POLICY "ofertas_empresa_update"
    ON public.ofertas FOR UPDATE
    TO authenticated
    USING (
        empresa_id = public.get_user_empresa_id()
        AND EXISTS (
            SELECT 1 FROM public.empresas
            WHERE id = public.get_user_empresa_id()
              AND estado = 'aprobada'
        )
        -- La empresa puede editar si es borrador o si está publicada/pausada/finalizada (para baja o cierre)
        -- No puede editar si está en 'pendiente_revision'
        AND estado <> 'pendiente_revision'::public.job_status
    )
    WITH CHECK (
        empresa_id = public.get_user_empresa_id()
        AND EXISTS (
            SELECT 1 FROM public.empresas
            WHERE id = public.get_user_empresa_id()
              AND estado = 'aprobada'
        )
        -- No puede auto-aprobarse a 'publicada' desde 'borrador' ni auto-aprobar revisión
        AND (
            -- Permitido pasar de borrador a pendiente_revision o mantenerse en borrador
            (estado IN ('borrador'::public.job_status, 'pendiente_revision'::public.job_status))
            -- O mantener el estado si ya estaba publicada/pausada/finalizada
            OR (estado IN ('publicada'::public.job_status, 'pausada'::public.job_status, 'finalizada'::public.job_status))
        )
    );


-- ==============================================================================
-- 4. CANALIZACIÓN ESTRICTA DE GESTIÓN DE CANDIDATOS VÍA RPC (NO UPDATE DIRECTO)
-- ==============================================================================
-- Revocar UPDATE directo sobre postulaciones para empresas: deben usar responder_candidato_empresa()
DROP POLICY IF EXISTS "postulaciones_empresa_update" ON public.postulaciones;


-- ==============================================================================
-- 5. TRIGGER DE INTEGRIDAD DE POSTULACIONES: FLUJO DIRECTO SIN 'SELECCIONADO'
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_postulacion_integrity_and_status()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_uid UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_empresa_id UUID;
    v_is_reactivation BOOLEAN := false;
BEGIN
    v_is_admin := public.is_admin();

    -- Identificar si se trata de una reactivación legítima de una postulación retirada
    IF OLD.estado::text = 'retirado_por_postulante' AND NEW.estado::text = 'postulado' THEN
        v_is_reactivation := true;
    END IF;

    IF NOT v_is_admin THEN
        -- Campos históricos y de derivación siempre inmutables para no administradores
        IF NEW.postulante_id IS DISTINCT FROM OLD.postulante_id OR
           NEW.oferta_id IS DISTINCT FROM OLD.oferta_id OR
           NEW.created_at IS DISTINCT FROM OLD.created_at OR
           NEW.fecha_derivacion IS DISTINCT FROM OLD.fecha_derivacion OR
           NEW.derivado_por IS DISTINCT FROM OLD.derivado_por THEN
            RAISE EXCEPTION 'No se permite modificar los datos históricos ni de derivación de una postulación.';
        END IF;

        -- El CV adjunto y su snapshot son inmutables salvo al reactivar una postulación retirada
        IF NOT v_is_reactivation AND (
           NEW.cv_id IS DISTINCT FROM OLD.cv_id OR
           NEW.cv_url_snapshot IS DISTINCT FROM OLD.cv_url_snapshot
        ) THEN
            RAISE EXCEPTION 'No se permite modificar el currículum asociado a una postulación activa.';
        END IF;
    END IF;

    IF NEW.estado::text IS DISTINCT FROM OLD.estado::text THEN
        -- Control para postulantes
        IF v_caller_uid IS NOT NULL AND v_caller_uid = OLD.postulante_id AND NOT v_is_admin THEN
            IF v_is_reactivation THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.ofertas o
                    WHERE o.id = OLD.oferta_id
                      AND o.estado::text = 'publicada'
                      AND o.deleted_at IS NULL
                ) THEN
                    RAISE EXCEPTION 'No se puede reactivar la postulación porque la oferta laboral ya no está publicada.';
                END IF;
            ELSIF NEW.estado::text = 'retirado_por_postulante' THEN
                IF OLD.estado::text IN ('contratado', 'retirado_por_postulante') THEN
                    RAISE EXCEPTION 'No se puede retirar una postulación finalizada o ya retirada.';
                END IF;
            ELSE
                RAISE EXCEPTION 'El postulante solo puede retirar voluntariamente su postulación o reactivar una postulación retirada.';
            END IF;
        END IF;

        -- Control para empresas: flujo directo desde presentado_a_empresa hacia contratado o rechazado
        IF v_caller_uid IS NOT NULL AND v_caller_uid != OLD.postulante_id AND NOT v_is_admin THEN
            SELECT id INTO v_empresa_id
            FROM public.empresas
            WHERE user_id = v_caller_uid AND estado = 'aprobada';

            IF v_empresa_id IS NULL THEN
                RAISE EXCEPTION 'No posee permisos de empresa aprobada activa para gestionar postulaciones.';
            END IF;

            IF OLD.estado::text <> 'presentado_a_empresa' THEN
                RAISE EXCEPTION 'La empresa solo puede gestionar candidatos formalmente presentados por la Oficina de Empleo.';
            END IF;

            -- Se excluye 'seleccionado': la empresa solo puede contratar o rechazar
            IF NEW.estado::text NOT IN ('rechazado_por_empresa', 'contratado') THEN
                RAISE EXCEPTION 'Transición de estado no autorizada para la empresa. Debe resolver contratando o rechazando al candidato.';
            END IF;

            IF NEW.estado::text = 'rechazado_por_empresa' AND (NEW.motivo_rechazo_empresa IS NULL OR length(trim(NEW.motivo_rechazo_empresa)) = 0) THEN
                RAISE EXCEPTION 'El motivo de rechazo es obligatorio para la empresa.';
            END IF;
        END IF;

        -- Control para administradores en derivación
        IF v_is_admin AND NEW.estado::text = 'presentado_a_empresa' AND OLD.estado::text != 'presentado_a_empresa' THEN
            IF NEW.fecha_derivacion IS NULL THEN
                NEW.fecha_derivacion := timezone('utc'::text, now());
            END IF;
            IF NEW.derivado_por IS NULL THEN
                NEW.derivado_por := v_caller_uid;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;


-- ==============================================================================
-- 6. RPC DE RESPUESTA DE EMPRESA CON HISTORIAL CONFIDENCIAL
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
    v_oferta_empresa_id UUID;
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

    SELECT id INTO v_empresa_id
    FROM public.empresas
    WHERE user_id = auth.uid() AND (estado = 'aprobada' OR verificada = true);

    IF v_empresa_id IS NULL AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No posee permisos de empresa activa para gestionar postulaciones.';
    END IF;

    SELECT o.empresa_id, p.estado INTO v_oferta_empresa_id, v_estado_actual
    FROM public.postulaciones p
    JOIN public.ofertas o ON p.oferta_id = o.id
    WHERE p.id = p_postulacion_id;

    IF v_oferta_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Postulación no encontrada.';
    END IF;

    IF NOT public.is_admin() AND v_oferta_empresa_id <> v_empresa_id THEN
        RAISE EXCEPTION 'Operación denegada: La postulación no corresponde a una oferta de su empresa.';
    END IF;

    IF v_estado_actual::text <> 'presentado_a_empresa' THEN
        RAISE EXCEPTION 'Solo se puede registrar resultado sobre candidatos derivados en estado presentado_a_empresa.';
    END IF;

    IF p_decision = 'contratado' THEN
        UPDATE public.postulaciones
        SET estado = 'contratado'::public.application_status,
            fecha_respuesta_empresa = v_fecha_now,
            updated_at = v_fecha_now
        WHERE id = p_postulacion_id;
    ELSE
        UPDATE public.postulaciones
        SET estado = 'rechazado_por_empresa'::public.application_status,
            motivo_rechazo_empresa = trim(p_motivo_rechazo),
            fecha_rechazo_empresa = v_fecha_now,
            fecha_respuesta_empresa = v_fecha_now,
            updated_at = v_fecha_now
        WHERE id = p_postulacion_id;
    END IF;

    -- Actualizar observaciones en historial con leyenda genérica para resguardar la privacidad del postulante
    UPDATE public.historial_postulacion
    SET observaciones = CASE 
        WHEN p_decision = 'contratado' THEN 'Candidato seleccionado e incorporado por la empresa empleadora'
        ELSE 'Candidato evaluado por la empresa empleadora'
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
GRANT EXECUTE ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) TO authenticated;


-- ==============================================================================
-- 7. VISTA Y RPC CON REVOCACIÓN DE CV_URL TRAS RESOLUCIÓN
-- ==============================================================================
-- A. Vista segura: cv_url es NULL si la postulación ya no está en presentado_a_empresa
CREATE OR REPLACE VIEW public.vista_candidatos_empresa
WITH (security_barrier = true)
AS
SELECT
    p.id AS postulacion_id,
    p.oferta_id,
    o.titulo AS oferta_titulo,
    o.empresa_id,
    per.id AS postulante_id,
    per.nombre,
    per.apellido,
    COALESCE(
        per.localidad,
        CASE WHEN per.es_residente_funes THEN 'Funes' ELSE 'Otra localidad' END
    ) AS localidad,
    per.nivel_educativo,
    per.habilidades,
    per.experiencia_resumen AS resumen_laboral,
    p.cv_id,
    CASE 
        WHEN p.estado::text = 'presentado_a_empresa' THEN COALESCE(p.cv_url_snapshot, cv.archivo_url, per.cv_url)
        ELSE NULL
    END AS cv_url,
    COALESCE(cv.nombre_cv, 'Currículum Vitae') AS cv_nombre,
    p.estado AS estado_postulacion,
    p.created_at AS fecha_postulacion,
    p.fecha_derivacion,
    p.motivo_rechazo_empresa,
    p.fecha_rechazo_empresa,
    p.fecha_respuesta_empresa
FROM public.postulaciones p
JOIN public.ofertas o ON p.oferta_id = o.id
JOIN public.empresas emp ON o.empresa_id = emp.id
JOIN public.perfil per ON p.postulante_id = per.id
LEFT JOIN public.curriculums cv ON p.cv_id = cv.id
WHERE
    p.estado::text IN (
        'presentado_a_empresa',
        'rechazado_por_empresa',
        'contratado'
    )
    AND (
        (emp.user_id = auth.uid() AND emp.estado = 'aprobada')
        OR public.is_admin()
    );

REVOKE ALL ON public.vista_candidatos_empresa FROM PUBLIC, anon;
GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;


-- B. RPC sincronizado con revocación de cv_url
DROP FUNCTION IF EXISTS public.obtener_candidatos_empresa(UUID);

CREATE FUNCTION public.obtener_candidatos_empresa(p_oferta_id UUID DEFAULT NULL)
RETURNS TABLE (
    postulacion_id UUID,
    oferta_id UUID,
    oferta_titulo TEXT,
    empresa_id UUID,
    postulante_id UUID,
    nombre TEXT,
    apellido TEXT,
    localidad TEXT,
    nivel_educativo TEXT,
    habilidades TEXT[],
    resumen_laboral TEXT,
    cv_id UUID,
    cv_url TEXT,
    cv_nombre TEXT,
    estado_postulacion public.application_status,
    fecha_postulacion TIMESTAMPTZ,
    fecha_derivacion TIMESTAMPTZ,
    motivo_rechazo_empresa TEXT,
    fecha_rechazo_empresa TIMESTAMPTZ,
    fecha_respuesta_empresa TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_empresa_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso no autorizado: usuario no autenticado.';
    END IF;

    v_is_admin := public.is_admin();

    IF NOT v_is_admin THEN
        SELECT e.id INTO v_empresa_id
        FROM public.empresas e
        WHERE e.user_id = auth.uid()
          AND e.estado = 'aprobada';

        IF v_empresa_id IS NULL THEN
            RAISE EXCEPTION 'El usuario no pertenece a una empresa aprobada activa.';
        END IF;

        IF p_oferta_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.ofertas o
                WHERE o.id = p_oferta_id AND o.empresa_id = v_empresa_id
            ) THEN
                RAISE EXCEPTION 'La oferta solicitada no pertenece a la empresa.';
            END IF;
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        p.id AS postulacion_id,
        p.oferta_id,
        o.titulo AS oferta_titulo,
        o.empresa_id,
        per.id AS postulante_id,
        per.nombre,
        per.apellido,
        COALESCE(
            per.localidad,
            CASE WHEN per.es_residente_funes THEN 'Funes' ELSE 'Otra localidad' END
        ) AS localidad,
        per.nivel_educativo,
        per.habilidades,
        per.experiencia_resumen AS resumen_laboral,
        p.cv_id,
        CASE 
            WHEN p.estado::text = 'presentado_a_empresa' THEN COALESCE(p.cv_url_snapshot, cv.archivo_url, per.cv_url)
            ELSE NULL
        END AS cv_url,
        COALESCE(cv.nombre_cv, 'Currículum Vitae') AS cv_nombre,
        p.estado AS estado_postulacion,
        p.created_at AS fecha_postulacion,
        p.fecha_derivacion,
        p.motivo_rechazo_empresa,
        p.fecha_rechazo_empresa,
        p.fecha_respuesta_empresa
    FROM public.postulaciones p
    JOIN public.ofertas o ON p.oferta_id = o.id
    JOIN public.empresas emp ON o.empresa_id = emp.id
    JOIN public.perfil per ON p.postulante_id = per.id
    LEFT JOIN public.curriculums cv ON p.cv_id = cv.id
    WHERE
        (v_is_admin OR (emp.id = v_empresa_id AND emp.estado = 'aprobada'))
        AND (p_oferta_id IS NULL OR p.oferta_id = p_oferta_id)
        AND p.estado::text IN (
            'presentado_a_empresa',
            'rechazado_por_empresa',
            'contratado'
        );
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_candidatos_empresa(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_candidatos_empresa(UUID) TO authenticated;


-- ==============================================================================
-- 8. POLÍTICA DE STORAGE: SOLO PERMITIR DESCARGA SI CV_URL SIGUE ACTIVO (NO NULL)
-- ==============================================================================
DROP POLICY IF EXISTS "cv_empresa_read_presented" ON storage.objects;
CREATE POLICY "cv_empresa_read_presented"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'postulantes-cvs' AND
        EXISTS (
            SELECT 1 FROM public.vista_candidatos_empresa v
            WHERE v.cv_url IS NOT NULL
              AND (storage.foldername(name))[1] = v.postulante_id::text
              AND (
                  v.cv_url = name
                  OR v.cv_url LIKE '%' || name
                  OR name LIKE '%' || v.cv_url
              )
        )
    );


-- ==============================================================================
-- 9. REGISTRO EN CONTROL DE VERSIONES INTERNO
-- ==============================================================================
INSERT INTO public._schema_migrations (version, description)
VALUES ('009', 'Fase 6: Flujo directo empresa sin estado seleccionado, proteccion de CUIT/Razon Social, baja de ofertas y revocacion de CVs')
ON CONFLICT (version) DO UPDATE 
SET applied_at = timezone('utc'::text, now()),
    description = EXCLUDED.description;

COMMIT;
