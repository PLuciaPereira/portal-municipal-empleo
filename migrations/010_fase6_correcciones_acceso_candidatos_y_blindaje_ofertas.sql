-- ==============================================================================
-- MIGRACIÓN 010: FASE 6 · CORRECCIONES DE ACCESO A CANDIDATOS DERIVADOS,
-- REVOCACIÓN ESTRICTA Y BLINDAJE DE OFERTAS PUBLICADAS
-- ==============================================================================
-- Portal Municipal de Empleo — Municipalidad de Funes
-- Estado: PENDIENTE DE EJECUCIÓN MANUAL EN SUPABASE SQL EDITOR
--
-- Contenido y justificación técnica (Requerimientos actualizados de Funes):
-- 1. Acceso a datos de contacto en derivaciones vigentes (Req. 13 y 26):
--    - La empresa formalmente aprobada con derivación activa ('presentado_a_empresa')
--      debe poder consultar todos los datos del postulante: DNI, teléfono, email,
--      domicilio, localidad, formación, habilidades, experiencia laboral y CV.
-- 2. Revocación inmediata en estados finales (Req. 13, 27):
--    - Cuando la postulación pasa a 'contratado', 'rechazado_por_empresa' o
--      'retirado_por_postulante', el acceso empresarial finaliza totalmente:
--      DNI, teléfono, email, domicilio y cv_url se devuelven como NULL.
-- 3. Blindaje de edición de ofertas publicadas (Req. 7, 19, 20):
--    - Una oferta 'publicada' no puede ser editada por la empresa. Solo puede
--      ser dada de baja lógicamente ('deleted_at' + 'motivo_baja') o finalizada.
-- 4. Soporte para operaciones de mantenimiento / scripts en el trigger:
--    - En 'validate_postulacion_integrity_and_status', se habilita que la
--      sesión superusuario 'postgres' o 'service_role' (donde auth.uid() es NULL)
--      pueda realizar operaciones administrativas y derivaciones sin error P0001.
-- 5. Solución al error PostgreSQL 42P16:
--    - Desvinculación de la política dependiente de storage, DROP VIEW CASCADE y recreación
--      limpia de la vista y la política de almacenamiento.
-- 6. Registro de la versión '010' en public._schema_migrations.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. TRIGGER DE INTEGRIDAD DE POSTULACIONES: SOPORTE DE SESIONES DE MANTENIMIENTO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_postulacion_integrity_and_status()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_uid UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_empresa_id UUID;
    v_is_reactivation BOOLEAN := false;
BEGIN
    -- Permitir si es admin autenticado, rol superusuario de Postgres o service_role
    v_is_admin := public.is_admin()
                  OR current_user = 'postgres'
                  OR (nullif(current_setting('request.jwt.claim.role', true), '') = 'service_role');

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

            -- La empresa solo puede resolver contratando o rechazando
            IF NEW.estado::text NOT IN ('rechazado_por_empresa', 'contratado') THEN
                RAISE EXCEPTION 'Transición de estado no autorizada para la empresa. Debe resolver contratando o rechazando al candidato.';
            END IF;

            IF NEW.estado::text = 'rechazado_por_empresa' AND (NEW.motivo_rechazo_empresa IS NULL OR length(trim(NEW.motivo_rechazo_empresa)) = 0) THEN
                RAISE EXCEPTION 'El motivo de rechazo es obligatorio para la empresa.';
            END IF;
        END IF;

        -- Control para administradores o sesiones de sistema en derivación
        IF v_is_admin AND NEW.estado::text = 'presentado_a_empresa' AND OLD.estado::text != 'presentado_a_empresa' THEN
            IF NEW.fecha_derivacion IS NULL THEN
                NEW.fecha_derivacion := timezone('utc'::text, now());
            END IF;
            IF NEW.derivado_por IS NULL AND v_caller_uid IS NOT NULL THEN
                NEW.derivado_por := v_caller_uid;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;


-- ==============================================================================
-- 2. DESVINCULACIÓN PREVIA Y RECREACIÓN LIMPIA DE VISTA Y POLÍTICA DE STORAGE
-- ==============================================================================
-- Evita el error 42P16 eliminando primero la política dependiente y la vista previa
DROP POLICY IF EXISTS "cv_empresa_read_presented" ON storage.objects;
DROP VIEW IF EXISTS public.vista_candidatos_empresa CASCADE;

-- Creación de la vista con columnas de contacto completas y revocables
CREATE VIEW public.vista_candidatos_empresa
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
    -- Datos de contacto sensibles solo expuestos durante la derivación activa
    CASE 
        WHEN p.estado::text = 'presentado_a_empresa' THEN per.dni
        ELSE NULL
    END AS dni,
    CASE 
        WHEN p.estado::text = 'presentado_a_empresa' THEN per.telefono
        ELSE NULL
    END AS telefono,
    CASE 
        WHEN p.estado::text = 'presentado_a_empresa' THEN u.email
        ELSE NULL
    END AS email,
    CASE 
        WHEN p.estado::text = 'presentado_a_empresa' THEN per.direccion
        ELSE NULL
    END AS direccion,
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
LEFT JOIN auth.users u ON per.id = u.id
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
        OR current_user = 'postgres'
    );

REVOKE ALL ON public.vista_candidatos_empresa FROM PUBLIC, anon;
GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;

-- Recreación de la política de Storage sobre la nueva vista
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
-- 3. RPC DE CONSULTA DE CANDIDATOS CON CAMPOS DE CONTACTO REVOCABLES
-- ==============================================================================
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
    dni TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
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
    IF auth.uid() IS NULL AND current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Acceso no autorizado: usuario no autenticado.';
    END IF;

    v_is_admin := public.is_admin() OR current_user = 'postgres';

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
        CASE 
            WHEN p.estado::text = 'presentado_a_empresa' THEN per.dni
            ELSE NULL
        END AS dni,
        CASE 
            WHEN p.estado::text = 'presentado_a_empresa' THEN per.telefono
            ELSE NULL
        END AS telefono,
        CASE 
            WHEN p.estado::text = 'presentado_a_empresa' THEN u.email::text
            ELSE NULL
        END AS email,
        CASE 
            WHEN p.estado::text = 'presentado_a_empresa' THEN per.direccion
            ELSE NULL
        END AS direccion,
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
    LEFT JOIN auth.users u ON per.id = u.id
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
-- 4. POLÍTICAS RLS EN OFERTAS: PROHIBICIÓN ESTRICTA DE EDICIÓN EN PUBLICADAS
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
        -- Si estaba en borrador o rechazada: puede mantenerse o pasar a pendiente_revision
        AND (
            (estado IN ('borrador'::public.job_status, 'pendiente_revision'::public.job_status))
            -- Si ya estaba publicada, solo puede mantenerse en publicada o finalizada (cierre/baja)
            OR (estado IN ('publicada'::public.job_status, 'pausada'::public.job_status, 'finalizada'::public.job_status))
        )
    );

-- Trigger de validación de inmutabilidad en ofertas publicadas
CREATE OR REPLACE FUNCTION public.protect_oferta_published_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Si la oferta ya estaba publicada y no es administrador
    IF OLD.estado = 'publicada'::public.job_status AND NOT public.is_admin() AND current_user <> 'postgres' THEN
        -- Solo se autoriza la baja lógica (deleted_at, motivo_baja, updated_at) o pase a finalizada
        IF NEW.titulo IS DISTINCT FROM OLD.titulo OR
           NEW.descripcion IS DISTINCT FROM OLD.descripcion OR
           NEW.requisitos IS DISTINCT FROM OLD.requisitos OR
           NEW.tipo_jornada IS DISTINCT FROM OLD.tipo_jornada OR
           NEW.ubicacion IS DISTINCT FROM OLD.ubicacion OR
           NEW.vacantes IS DISTINCT FROM OLD.vacantes OR
           NEW.rubro_id IS DISTINCT FROM OLD.rubro_id THEN
            RAISE EXCEPTION 'Operación denegada: Una oferta publicada no puede ser modificada. Para cambiar sus condiciones debe tramitar una nueva convocatoria ante la Oficina de Empleo.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_oferta_published_fields ON public.ofertas;
CREATE TRIGGER trigger_protect_oferta_published_fields
    BEFORE UPDATE ON public.ofertas
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_oferta_published_fields();


-- ==============================================================================
-- 5. REGISTRO EN CONTROL DE VERSIONES INTERNO
-- ==============================================================================
INSERT INTO public._schema_migrations (version, name)
VALUES ('010', 'Fase 6: Acceso a contacto completo para candidatos derivados, revocacion en estados terminales, inmutabilidad de ofertas publicadas y soporte de mantenimiento en trigger')
ON CONFLICT (version) DO UPDATE 
SET applied_at = timezone('utc'::text, now()),
    name = EXCLUDED.name;

COMMIT;

