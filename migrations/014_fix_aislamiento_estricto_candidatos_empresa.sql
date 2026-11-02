-- ==============================================================================
-- MIGRACIÓN 014: AISLAMIENTO ESTRICTO DE CANDIDATOS DERIVADOS POR EMPRESA
-- Y CORRECCIÓN DE EVALUACIÓN SECURITY DEFINER
-- ==============================================================================
-- Portal Municipal de Empleo - Municipalidad de Funes
-- Estado: PENDIENTE DE EJECUCIÓN MANUAL EN SUPABASE SQL EDITOR TRAS APROBACIÓN
--
-- Contenido y Justificación Técnica (Fase 6):
-- 1. Corrige la función RPC public.obtener_candidatos_empresa:
--    - Elimina completamente la condición vulnerable "OR current_user = 'postgres'".
--    - En funciones SECURITY DEFINER, PostgreSQL ejecuta el código bajo el rol 'postgres',
--      lo que provocaba que cualquier llamada empresarial se evaluara erróneamente como administradora.
--    - Se evalúa la condición de administrador exclusivamente con public.is_admin()
--      sobre auth.uid() o mediante el claim seguro de JWT 'service_role'.
--    - Para empresas, se filtra estrictamente por emp.id = v_empresa_id (empresa autenticada y aprobada).
--    - Si se especifica p_oferta_id y no pertenece a la empresa, se retorna 0 registros.
--    - Unifica el conjunto exacto de estados autorizados para la empresa:
--      'presentado_a_empresa', 'entrevista', 'seleccionado', 'rechazado_por_empresa', 'contratado'.
-- 2. Actualiza public.vista_candidatos_empresa:
--    - Remueve 'OR current_user = postgres', manteniendo el filtro estricto por emp.user_id = auth.uid()
--      y estados sincronizados con la RPC.
-- 3. Recrea la política de storage "cv_empresa_read_presented":
--    - Elimina comparaciones difusas LIKE con comodines '%' para evitar accesos a archivos no autorizados.
--    - Aplica validación por coincidencia exacta de ruta en bucket 'postulantes-cvs'.
-- 4. Registra la versión '014' en public._schema_migrations.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. FUNCIÓN RPC SEGURA: OBTENER CANDIDATOS DERIVADOS EXCLUSIVOS DE LA EMPRESA
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
    v_jwt_role TEXT;
BEGIN
    -- 1. Validar autenticación
    v_jwt_role := nullif(current_setting('request.jwt.claim.role', true), '');
    IF auth.uid() IS NULL AND v_jwt_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Acceso no autorizado: usuario no autenticado.';
    END IF;

    -- 2. Evaluar permisos de administración (estrictamente por token/perfil, NUNCA por current_user)
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
        IF p_oferta_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.ofertas o
                WHERE o.id = p_oferta_id AND o.empresa_id = v_empresa_id
            ) THEN
                -- La oferta no pertenece a la empresa; retornar vacío de forma segura
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
        -- Administradores ven todas las derivaciones; empresas ven ÚNICAMENTE las de su empresa
        (v_is_admin OR (emp.id = v_empresa_id AND emp.estado = 'aprobada'))
        AND (p_oferta_id IS NULL OR p.oferta_id = p_oferta_id)
        AND p.estado::text IN (
            'presentado_a_empresa',
            'entrevista',
            'seleccionado',
            'rechazado_por_empresa',
            'contratado'
        );
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_candidatos_empresa(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_candidatos_empresa(UUID) TO authenticated;


-- ==============================================================================
-- 2. ACTUALIZACIÓN DE VISTA Y POLÍTICA DE STORAGE (SIN COMANDOS DIFUSOS LIKE)
-- ==============================================================================
-- Se elimina primero la política dependiente para evitar bloqueos
DROP POLICY IF EXISTS "cv_empresa_read_presented" ON storage.objects;
DROP VIEW IF EXISTS public.vista_candidatos_empresa CASCADE;

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
        (emp.user_id = auth.uid() AND emp.estado = 'aprobada')
        OR public.is_admin()
        OR (nullif(current_setting('request.jwt.claim.role', true), '') = 'service_role')
    );

REVOKE ALL ON public.vista_candidatos_empresa FROM PUBLIC, anon;
GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;

-- Política de Storage con coincidencia exacta de ruta (sin comodines LIKE)
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
                  OR v.cv_url = 'postulantes-cvs/' || name
                  OR regexp_replace(v.cv_url, '^postulantes-cvs/', '') = name
              )
        )
    );

-- ==============================================================================
-- 3. REGISTRO EN CONTROL DE VERSIONES INTERNO
-- ==============================================================================
INSERT INTO public._schema_migrations (version, name)
VALUES ('014', 'Fix aislamiento estricto de candidatos derivados por empresa sin dependencia de current_user y sanitizacion de storage')
ON CONFLICT (version) DO UPDATE 
SET applied_at = timezone('utc'::text, now()),
    name = EXCLUDED.name;

COMMIT;
