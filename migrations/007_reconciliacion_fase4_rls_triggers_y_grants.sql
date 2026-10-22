-- ==============================================================================
-- MIGRACIÓN 007: RECONCILIACIÓN FASE 4 · RLS, TRIGGERS DE SEGURIDAD Y GRANTS
-- ==============================================================================
-- Proyecto: Portal Municipal de Empleo de Funes
-- Fecha: 2026-10-19
-- Propósito:
--   1. Restaurar privilegios GRANT sobre el esquema public para el rol administrativo
--      interno de Supabase (`service_role`) y `SELECT` público en `public.cursos` para `anon`.
--   2. Asegurar `public.get_user_empresa_id()` como `SECURITY DEFINER` con permiso de
--      ejecución para `anon` y `authenticated`, evitando que las políticas RLS de
--      `public.ofertas` consulten directamente la columna privada `empresas.user_id`
--      cuando navega un visitante (`anon`).
--   3. Homologar `public.check_oferta_status_transition()` con `auth.uid() IS NOT NULL`
--      para permitir ejecuciones administrativas desde Supabase SQL Editor (como seeds)
--      manteniendo el bloqueo estricto para usuarios autenticados no administradores.
--   4. Reforzar `public.check_admin_self_deactivation()` en `public.perfil` para impedir
--      que usuarios no administradores modifiquen su propio `rol`, `es_admin_general`,
--      `activo`, `deleted_at` o `created_at` vía API REST.
--   5. Consolidar políticas RLS de `public.ofertas`, `public.postulaciones` y `public.empresas`.
-- Seguridad: Migración 100% aditiva e idempotente. No elimina tablas ni datos.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PRIVILEGIOS GRANT PARA service_role Y anon
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Asegurar que anon pueda consultar cursos activos tal como define la política cursos_public_select
GRANT SELECT ON public.cursos TO anon;

-- ------------------------------------------------------------------------------
-- 2. FUNCIÓN AUXILIAR SECURITY DEFINER PARA RESOLVER EMPRESA DEL USUARIO ACTUAL
-- ------------------------------------------------------------------------------
-- Importante: Al ser SECURITY DEFINER, permite evaluar `empresa_id = public.get_user_empresa_id()`
-- en las políticas RLS de `public.ofertas` sin exigir que el rol `anon` tenga permiso
-- SELECT sobre la columna privada `public.empresas.user_id`.
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT id FROM public.empresas
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_empresa_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER DE TRANSICIÓN DE ESTADO EN public.ofertas
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_oferta_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Si hay un usuario autenticado en sesión y NO es administrador:
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.estado::text IN ('publicada', 'rechazada') THEN
                RAISE EXCEPTION 'Las empresas no pueden publicar ni rechazar ofertas directamente. Deben ser aprobadas por la Oficina de Empleo.';
            END IF;
            NEW.destacada := false;
            NEW.revisado_por := NULL;
            NEW.fecha_revision := NULL;
            NEW.motivo_rechazo := NULL;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
                RAISE EXCEPTION 'No está permitido transferir una oferta a otra empresa.';
            END IF;

            IF (NEW.estado IS DISTINCT FROM OLD.estado) AND (NEW.estado::text IN ('publicada', 'rechazada')) THEN
                RAISE EXCEPTION 'Solo la Oficina de Empleo (admin) puede aprobar o rechazar ofertas.';
            END IF;

            IF (NEW.destacada IS DISTINCT FROM OLD.destacada) THEN
                RAISE EXCEPTION 'Solo la Oficina de Empleo puede destacar ofertas.';
            END IF;

            IF (NEW.revisado_por IS DISTINCT FROM OLD.revisado_por)
               OR (NEW.fecha_revision IS DISTINCT FROM OLD.fecha_revision)
               OR (NEW.motivo_rechazo IS DISTINCT FROM OLD.motivo_rechazo) THEN
                RAISE EXCEPTION 'No tenés permisos para modificar los metadatos de auditoría de revisión.';
            END IF;
        END IF;
    END IF;

    IF NEW.estado::text IN ('publicada', 'rechazada') AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM NEW.estado) THEN
        NEW.fecha_revision := COALESCE(NEW.fecha_revision, timezone('utc'::text, now()));
        IF auth.uid() IS NOT NULL AND public.is_admin() THEN
            NEW.revisado_por := COALESCE(NEW.revisado_por, auth.uid());
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_oferta_status_before_write ON public.ofertas;
DROP TRIGGER IF EXISTS trigger_check_oferta_status ON public.ofertas;
CREATE TRIGGER trigger_check_oferta_status
    BEFORE INSERT OR UPDATE ON public.ofertas
    FOR EACH ROW EXECUTE FUNCTION public.check_oferta_status_transition();

-- ------------------------------------------------------------------------------
-- 4. TRIGGER DE PROTECCIÓN DE ROL Y ESTADO EN public.perfil
-- ------------------------------------------------------------------------------
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
        -- Usuarios no administradores no pueden alterar su propio rol, flags administrativos,
        -- estado de activación, baja lógica ni fecha de creación
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.rol IS DISTINCT FROM OLD.rol THEN
                RAISE EXCEPTION 'Operación denegada: No tenés permisos para modificar el rol de tu cuenta.';
            END IF;
            IF NEW.es_admin_general IS DISTINCT FROM OLD.es_admin_general THEN
                RAISE EXCEPTION 'Operación denegada: No tenés permisos para modificar privilegios administrativos.';
            END IF;
            IF NEW.activo IS DISTINCT FROM OLD.activo OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
                RAISE EXCEPTION 'Operación denegada: No tenés permisos para modificar el estado administrativo de activación.';
            END IF;
            IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
                RAISE EXCEPTION 'Operación denegada: No está permitido modificar la fecha de creación del perfil.';
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
            IF OLD.es_admin_general IS TRUE AND NEW.es_admin_general IS FALSE THEN
                RAISE EXCEPTION 'Operación denegada: Un administrador general no puede quitarse su propia condición.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_self_deactivation ON public.perfil;
DROP TRIGGER IF EXISTS trigger_prevent_admin_self_deactivation ON public.perfil;
DROP TRIGGER IF EXISTS trigger_check_admin_self_deactivation ON public.perfil;
CREATE TRIGGER trigger_check_admin_self_deactivation
    BEFORE INSERT OR UPDATE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.check_admin_self_deactivation();

-- ------------------------------------------------------------------------------
-- 5. REFUERZO Y CONSOLIDACIÓN DE POLÍTICAS RLS EN OFERTAS, POSTULACIONES Y EMPRESAS
-- ------------------------------------------------------------------------------

-- 5.1. Ofertas: limpiar cualquier política histórica en public.ofertas que referencie
--      directamente public.empresas.user_id sin SECURITY DEFINER y recrear las 4 canónicas.
DO $$
DECLARE
    v_pol RECORD;
BEGIN
    FOR v_pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ofertas'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.ofertas', v_pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "ofertas_public_select_published"
    ON public.ofertas FOR SELECT
    USING (
        (estado = 'publicada'::public.job_status AND deleted_at IS NULL)
        OR empresa_id = public.get_user_empresa_id()
        OR public.is_admin()
    );

CREATE POLICY "ofertas_empresa_insert"
    ON public.ofertas FOR INSERT
    TO authenticated
    WITH CHECK (
        empresa_id = public.get_user_empresa_id()
        AND EXISTS (
            SELECT 1 FROM public.empresas
            WHERE id = public.get_user_empresa_id()
              AND estado = 'aprobada'
        )
    );

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
    )
    WITH CHECK (
        empresa_id = public.get_user_empresa_id()
        AND EXISTS (
            SELECT 1 FROM public.empresas
            WHERE id = public.get_user_empresa_id()
              AND estado = 'aprobada'
        )
    );

CREATE POLICY "ofertas_admin_all"
    ON public.ofertas FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5.2. Postulaciones: exigir rol 'postulante' activo y sin baja lógica, oferta publicada vigente y CV vigente
DROP POLICY IF EXISTS "postulaciones_postulante_insert" ON public.postulaciones;
CREATE POLICY "postulaciones_postulante_insert"
    ON public.postulaciones FOR INSERT
    TO authenticated
    WITH CHECK (
        postulante_id = auth.uid()
        AND estado = 'postulado'::public.application_status
        AND EXISTS (
            SELECT 1 FROM public.perfil p
            WHERE p.id = auth.uid()
              AND p.rol = 'postulante'::public.user_role
              AND p.activo = true
              AND p.deleted_at IS NULL
        )
        AND EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = oferta_id
              AND o.estado = 'publicada'::public.job_status
              AND o.deleted_at IS NULL
        )
        AND (
            cv_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.curriculums c
                WHERE c.id = cv_id
                  AND c.postulante_id = auth.uid()
                  AND c.activo = true
                  AND c.deleted_at IS NULL
            )
        )
    );

-- 5.3. Empresas: exigir que el usuario que registra una empresa tenga rol 'empresa' activo (o sea admin)
DROP POLICY IF EXISTS "empresas_owner_insert" ON public.empresas;
CREATE POLICY "empresas_owner_insert"
    ON public.empresas FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            user_id = auth.uid()
            AND estado = 'pendiente'
            AND verificada = false
            AND EXISTS (
                SELECT 1 FROM public.perfil p
                WHERE p.id = auth.uid()
                  AND p.rol = 'empresa'::public.user_role
                  AND p.activo = true
                  AND p.deleted_at IS NULL
            )
        )
        OR public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 6. REGISTRO EN CONTROL DE MIGRACIONES (esquema real: version, name, applied_at)
-- ------------------------------------------------------------------------------
INSERT INTO public._schema_migrations (version, name)
VALUES ('007', '007_reconciliacion_fase4_rls_triggers_y_grants')
ON CONFLICT (version) DO UPDATE SET
    name = EXCLUDED.name,
    applied_at = timezone('utc'::text, now());

COMMIT;
