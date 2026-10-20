-- ==============================================================================
-- MIGRACIÓN 006: PERMISOS PÚBLICOS POR COLUMNA EN EMPRESAS Y SINCRONIZACIÓN DE CANDIDATOS
-- ==============================================================================
-- Portal Municipal de Empleo — Municipalidad de Funes
-- Estado: PENDIENTE DE REVISIÓN Y EJECUCIÓN MANUAL EN SUPABASE SQL EDITOR
--
-- Contenido y justificación técnica:
-- 1. Concesión de privilegio SELECT a nivel de columnas públicas no sensibles sobre
--    public.empresas para el rol anon. Permite resolver la relación embebida
--    ofertas -> empresas (ofertas_empresa_id_fkey) en el catálogo público sin exponer
--    CUIT, teléfono, email_contacto, persona_contacto, dirección, user_id ni campos
--    administrativos de revisión. La visibilidad de filas continúa restringida por la
--    política RLS empresas_public_select (estado = 'aprobada' OR verificada = true).
-- 2. Sincronización de contrato (20 columnas), filtro de empresa aprobada y estados
--    válidos de derivación entre la vista public.vista_candidatos_empresa y la función
--    RPC public.obtener_candidatos_empresa(UUID).
-- 3. Consolidación del trigger de seguridad sobre public.perfil para evitar duplicidad
--    entre trigger_check_admin_self_deactivation (Migración 004) y
--    trigger_prevent_admin_self_deactivation (Migración 005), preservando todas las
--    reglas de protección contra auto-asignación de rol y auto-desactivación.
-- 4. Registro de la versión '006' en public._schema_migrations.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. SEGURIDAD DE EMPRESAS: PERMISO SELECT POR COLUMNA PARA ROL ANON
-- ==============================================================================

-- Asegurar que el rol anon no tenga privilegios de tabla completa sobre public.empresas
REVOKE ALL ON public.empresas FROM anon;

-- Otorgar SELECT exclusivamente sobre las 9 columnas públicas no sensibles.
-- Columnas excluidas deliberadamente para el rol anon:
--   user_id, cuit, direccion, telefono, email_contacto, persona_contacto,
--   motivo_rechazo, revisado_por, fecha_revision, created_at, updated_at.
GRANT SELECT (
    id,
    nombre_fantasia,
    razon_social,
    localidad,
    rubro,
    descripcion,
    sitio_web,
    verificada,
    estado
) ON public.empresas TO anon;

-- Verificar que RLS permanezca activo y con la política de lectura pública restringida
-- a empresas aprobadas o verificadas (además de su titular o administradores autenticados).
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_public_select" ON public.empresas;
CREATE POLICY "empresas_public_select" ON public.empresas FOR SELECT
    USING (
        estado = 'aprobada'
        OR verificada = true
        OR user_id = auth.uid()
        OR public.is_admin()
    );


-- ==============================================================================
-- 2. SINCRONIZACIÓN DE VISTA Y RPC DE CANDIDATOS DERIVADOS A EMPRESAS
-- ==============================================================================

-- A. Actualizar public.vista_candidatos_empresa conservando el orden exacto de las
--    20 columnas actuales, security_barrier = true, exigencia de empresa aprobada
--    para titulares de empresa y todos los estados válidos de derivación.
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
    COALESCE(p.cv_url_snapshot, cv.archivo_url, per.cv_url) AS cv_url,
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
        'seleccionado',
        'no_seleccionado',
        'rechazado_por_empresa',
        'contratado'
    )
    AND (
        (emp.user_id = auth.uid() AND emp.estado = 'aprobada')
        OR public.is_admin()
    );

REVOKE ALL ON public.vista_candidatos_empresa FROM PUBLIC, anon;
GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;

-- B. Sincronizar public.obtener_candidatos_empresa(UUID) con las 20 columnas de la vista.
--    En PostgreSQL, modificar las columnas de RETURNS TABLE requiere DROP FUNCTION previo
--    para evitar el error 42P13 (cannot change return type of existing function).
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
    -- 1. Validar autenticación
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso no autorizado: usuario no autenticado.';
    END IF;

    v_is_admin := public.is_admin();

    -- 2. Obtener y validar empresa aprobada del usuario autenticado si no es admin
    IF NOT v_is_admin THEN
        SELECT e.id INTO v_empresa_id
        FROM public.empresas e
        WHERE e.user_id = auth.uid()
          AND e.estado = 'aprobada';

        IF v_empresa_id IS NULL THEN
            RAISE EXCEPTION 'El usuario no pertenece a una empresa aprobada activa.';
        END IF;

        -- 3. Si se especificó una oferta, validar que pertenezca a la empresa
        IF p_oferta_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.ofertas o
                WHERE o.id = p_oferta_id AND o.empresa_id = v_empresa_id
            ) THEN
                RAISE EXCEPTION 'La oferta solicitada no pertenece a la empresa.';
            END IF;
        END IF;
    END IF;

    -- 4. Retornar candidatos autorizados con las 20 columnas sincronizadas
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
        COALESCE(p.cv_url_snapshot, cv.archivo_url, per.cv_url) AS cv_url,
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
            'seleccionado',
            'no_seleccionado',
            'rechazado_por_empresa',
            'contratado'
        );
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_candidatos_empresa(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_candidatos_empresa(UUID) TO authenticated;


-- ==============================================================================
-- 3. CONSOLIDACIÓN DE TRIGGER DE SEGURIDAD SOBRE public.perfil
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_admin_self_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- 1. En INSERT: un usuario no administrador no puede auto-asignarse rol o flags administrativos
    IF TG_OP = 'INSERT' THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.rol::text IN ('admin', 'municipalidad') OR NEW.es_admin_general IS TRUE THEN
                RAISE EXCEPTION 'Operación denegada: Solo un administrador puede dar de alta a otro administrador.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- 2. En UPDATE: proteger escalación de privilegios y auto-desactivación de administradores
    IF TG_OP = 'UPDATE' THEN
        -- Un usuario no administrador no puede promoverse a sí mismo ni activar flags administrativos
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF (NEW.rol::text IN ('admin', 'municipalidad') AND OLD.rol::text NOT IN ('admin', 'municipalidad'))
               OR (NEW.es_admin_general IS TRUE AND OLD.es_admin_general IS FALSE) THEN
                RAISE EXCEPTION 'Operación denegada: No tiene permisos para asignarse rol administrativo.';
            END IF;
        END IF;

        -- Un administrador no puede desactivarse, darse de baja lógica ni quitarse el rol a sí mismo
        IF auth.uid() IS NOT NULL
           AND auth.uid() = OLD.id
           AND (OLD.rol::text IN ('admin', 'municipalidad') OR OLD.es_admin_general IS TRUE) THEN
            IF NEW.activo IS FALSE AND OLD.activo IS TRUE THEN
                RAISE EXCEPTION 'Operación denegada: Un administrador no puede desactivar su propia cuenta.';
            END IF;
            IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
                RAISE EXCEPTION 'Operación denegada: Un administrador no puede eliminar lógicamente su propia cuenta.';
            END IF;
            IF NEW.rol IS DISTINCT FROM OLD.rol THEN
                RAISE EXCEPTION 'Operación denegada: Un administrador no puede cambiar su propio rol.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Eliminar trigger duplicado de la migración 005 y mantener un único trigger canónico
DROP TRIGGER IF EXISTS trigger_prevent_admin_self_deactivation ON public.perfil;
DROP TRIGGER IF EXISTS trigger_check_admin_self_deactivation ON public.perfil;

CREATE TRIGGER trigger_check_admin_self_deactivation
    BEFORE INSERT OR UPDATE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.check_admin_self_deactivation();


-- ==============================================================================
-- 4. REGISTRO EN CONTROL DE MIGRACIONES
-- ==============================================================================

INSERT INTO public._schema_migrations (version, name)
VALUES ('006', '006_permisos_empresas_y_sincronizacion_candidatos')
ON CONFLICT (version) DO UPDATE SET
    name = EXCLUDED.name,
    applied_at = timezone('utc'::text, now());

COMMIT;
