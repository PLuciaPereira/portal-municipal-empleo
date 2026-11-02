-- ==============================================================================
-- Migración 016: Blindaje de Acceso a Candidatos por Oferta en Revisión
-- Portal de Empleo - Municipalidad de Funes
-- ==============================================================================
-- Justificación:
-- Refuerza del lado de la base de datos (PostgreSQL / RPC) que ninguna empresa
-- pueda acceder a datos o listados de candidatos vinculados a ofertas laborales
-- que se encuentren en estado 'pendiente_revision' o que no hayan sido aprobadas/publicadas.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.obtener_candidatos_empresa(p_oferta_id UUID DEFAULT NULL)
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
    v_jwt_role TEXT;
    v_oferta_estado public.job_status;
BEGIN
    -- 1. Validar autenticación
    v_jwt_role := nullif(current_setting('request.jwt.claim.role', true), '');
    IF auth.uid() IS NULL AND v_jwt_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Acceso no autorizado: usuario no autenticado.';
    END IF;

    -- 2. Evaluar permisos de administración
    v_is_admin := public.is_admin() OR (v_jwt_role = 'service_role');

    -- 3. Si no es administrador, resolver y validar obligatoriamente la empresa del usuario
    IF NOT v_is_admin THEN
        SELECT e.id INTO v_empresa_id
        FROM public.empresas e
        WHERE e.user_id = auth.uid()
          AND e.estado = 'aprobada';

        IF v_empresa_id IS NULL THEN
            -- El usuario no pertenece a una empresa aprobada activa; retornar vacío de forma segura
            RETURN;
        END IF;

        -- Si se filtró por una oferta específica, asegurar que dicha oferta pertenece a su empresa
        -- y que NO se encuentre en estado 'pendiente_revision', 'borrador' o 'rechazada'
        IF p_oferta_id IS NOT NULL THEN
            SELECT o.estado INTO v_oferta_estado
            FROM public.ofertas o
            WHERE o.id = p_oferta_id AND o.empresa_id = v_empresa_id;

            IF v_oferta_estado IS NULL OR v_oferta_estado = 'pendiente_revision' THEN
                -- Oferta inexistente, ajena o en revisión: retorno vacío inmediato
                RETURN;
            END IF;
        END IF;
    END IF;

    -- 4. Retornar candidatos presentados o gestionados
    RETURN QUERY
    SELECT
        p.id AS postulacion_id,
        p.oferta_id,
        o.titulo AS oferta_titulo,
        o.empresa_id,
        per.id AS postulante_id,
        per.nombre,
        per.apellido,
        -- Datos de contacto visibles únicamente mientras la derivación está en curso
        CASE 
            WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista', 'seleccionado') THEN per.dni
            ELSE NULL
        END AS dni,
        CASE 
            WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista', 'seleccionado') THEN per.telefono
            ELSE NULL
        END AS telefono,
        CASE 
            WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista', 'seleccionado') THEN u.email::text
            ELSE NULL
        END AS email,
        CASE 
            WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista', 'seleccionado') THEN per.direccion
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
            WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista', 'seleccionado') THEN COALESCE(p.cv_url_snapshot, cv.archivo_url, per.cv_url)
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
            'entrevista',
            'seleccionado',
            'rechazado_por_empresa',
            'contratado'
        )
        AND (
            v_is_admin
            OR (
                emp.id = v_empresa_id 
                AND o.deleted_at IS NULL 
                AND o.estado NOT IN ('borrador', 'pendiente_revision')
                AND (p_oferta_id IS NULL OR p.oferta_id = p_oferta_id)
            )
        )
    ORDER BY p.fecha_derivacion DESC NULLS LAST, p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_candidatos_empresa(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_candidatos_empresa(UUID) TO authenticated;

COMMIT;
