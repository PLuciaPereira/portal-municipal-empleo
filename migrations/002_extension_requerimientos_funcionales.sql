-- ==============================================================================
-- MIGRACIÓN 002: EXTENSIÓN DE REQUERIMIENTOS FUNCIONALES Y SEGURIDAD
-- ==============================================================================
-- Portal de Empleo Funes
-- Esta migración extiende el esquema de Supabase/PostgreSQL para cumplir con:
-- 1. Gestión de múltiples CVs (límite de 5 activos, borrado lógico, concurrencia).
-- 2. Integridad y snapshot de CV en postulaciones, retiro voluntario y rechazo empresarial.
-- 3. Módulo de cursos y capacitaciones con trazabilidad de asignación.
-- 4. Aprobación municipal de empresas (pendiente, aprobada, rechazada con motivo).
-- 5. Modelo de múltiples administradores con exactamente UN superadministrador activo.
-- 6. Blindaje de datos sensibles de postulantes (resolución H-01: vista segura + RPC).
--
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Abrir el SQL Editor en el Dashboard de Supabase.
-- 2. Copiar y pegar todo el contenido de este archivo.
-- 3. Ejecutar ("Run").
-- ==============================================================================

-- ==============================================================================
-- 1. TIPOS ENUM Y VALORES ADICIONALES
-- ==============================================================================

-- A. Tipo enum para estado de empresas
DO $$ BEGIN
    CREATE TYPE public.estado_empresa AS ENUM ('pendiente', 'aprobada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- B. Agregar 'retirado_por_postulante' a application_status si no existe
DO $$ BEGIN
    ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'retirado_por_postulante';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- C. Agregar 'rechazado_por_empresa' a application_status si no existe
DO $$ BEGIN
    ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'rechazado_por_empresa';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ==============================================================================
-- 2. EXTENSIÓN DE PERFILES (public.perfil) Y MODELO DE ADMINISTRADORES
-- ==============================================================================

-- A. Incorporar columnas de administración, ubicación y baja lógica en perfil
ALTER TABLE public.perfil ADD COLUMN IF NOT EXISTS es_admin_general BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.perfil ADD COLUMN IF NOT EXISTS es_superadmin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.perfil ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.perfil ADD COLUMN IF NOT EXISTS localidad TEXT DEFAULT 'Funes';
ALTER TABLE public.perfil ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- B. Restricciones de consistencia de roles y administradores
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_superadmin_es_admin') THEN
        ALTER TABLE public.perfil ADD CONSTRAINT check_superadmin_es_admin
            CHECK (NOT es_superadmin OR es_admin_general);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_admin_rol') THEN
        ALTER TABLE public.perfil ADD CONSTRAINT check_admin_rol
            CHECK (NOT es_admin_general OR rol::text IN ('admin', 'municipalidad'));
    END IF;
END $$;

-- C. Índice único parcial: garantiza a nivel de base de datos que exista como máximo UN superadministrador activo
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfil_unico_superadmin_activo
    ON public.perfil (es_superadmin)
    WHERE (es_superadmin = true AND activo = true);

-- D. Bootstrap: designar al primer admin existente como superadmin inicial si no existe ninguno
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Solo ejecutar bootstrap si NO existe ningún superadministrador activo
    IF NOT EXISTS (
        SELECT 1 FROM public.perfil
        WHERE es_superadmin = true AND activo = true
    ) THEN
        -- Asegurar que los administradores existentes tengan activo = true y es_admin_general = true
        UPDATE public.perfil
        SET es_admin_general = true,
            activo = true
        WHERE rol::text IN ('admin', 'municipalidad');

        -- Designar al primer administrador existente por fecha de creación como superadministrador
        SELECT id INTO v_admin_id
        FROM public.perfil
        WHERE rol::text IN ('admin', 'municipalidad')
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_admin_id IS NOT NULL THEN
            UPDATE public.perfil
            SET es_superadmin = true,
                es_admin_general = true,
                activo = true
            WHERE id = v_admin_id;
        END IF;
    END IF;
END $$;

-- E. Funciones auxiliares de verificación de roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.perfil
        WHERE id = auth.uid()
          AND activo = true
          AND (rol::text IN ('admin', 'municipalidad') OR es_admin_general = true OR es_superadmin = true)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.perfil
        WHERE id = auth.uid()
          AND activo = true
          AND es_superadmin = true
    );
$$;

-- F. Trigger para impedir la eliminación física de perfiles administrativos (exige baja lógica)
CREATE OR REPLACE FUNCTION public.prevent_admin_physical_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.es_admin_general = true OR OLD.es_superadmin = true OR OLD.rol::text IN ('admin', 'municipalidad')) THEN
        RAISE EXCEPTION 'No se permite la eliminación física de perfiles administrativos. Se debe utilizar la desactivación lógica (activo = false).';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_prevent_admin_physical_delete ON public.perfil;
CREATE TRIGGER trigger_prevent_admin_physical_delete
    BEFORE DELETE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_physical_delete();

-- G. Trigger para proteger reglas de autorización y unicidad del superadministrador
CREATE OR REPLACE FUNCTION public.validate_perfil_admin_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_uid UUID;
    v_is_superadmin BOOLEAN;
    v_is_target_admin BOOLEAN;
    v_count_other_superadmins INTEGER;
    v_is_transferring BOOLEAN;
BEGIN
    v_caller_uid := auth.uid();
    v_is_transferring := (current_setting('app.transferring_superadmin', true) = 'true')
                         AND (v_caller_uid IS NULL OR public.is_superadmin());

    -- Caso INSERT: verificar si un cliente intenta registrar usuarios con roles o privilegios administrativos
    IF TG_OP = 'INSERT' THEN
        IF v_caller_uid IS NOT NULL AND NOT public.is_superadmin() THEN
            IF NEW.es_admin_general = true OR NEW.es_superadmin = true OR NEW.rol::text IN ('admin', 'municipalidad') THEN
                RAISE EXCEPTION 'Solo el superadministrador puede registrar usuarios con roles o privilegios administrativos.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- Si estamos en una transacción de transferencia atómica autorizada, permitir paso
    IF v_is_transferring THEN
        RETURN NEW;
    END IF;

    -- Identificar si el perfil modificado es o era administrador
    v_is_target_admin := (OLD.es_admin_general = true OR OLD.es_superadmin = true OR OLD.rol::text IN ('admin', 'municipalidad'));

    -- Bloqueo de concurrencia al alterar superadministrador
    IF (OLD.es_superadmin = true OR NEW.es_superadmin = true) THEN
        PERFORM pg_advisory_xact_lock(hashtext('superadmin_lock'));
    END IF;

    -- REGLA: Nunca permitir dejar el sistema sin superadministrador activo
    IF OLD.es_superadmin = true AND (NEW.es_superadmin = false OR NEW.activo = false OR NEW.deleted_at IS NOT NULL) THEN
        SELECT COUNT(*) INTO v_count_other_superadmins
        FROM public.perfil
        WHERE es_superadmin = true
          AND activo = true
          AND id <> OLD.id;

        IF v_count_other_superadmins = 0 THEN
            RAISE EXCEPTION 'Operación denegada: debe existir siempre al menos un superadministrador activo en el sistema.';
        END IF;
    END IF;

    -- REGLA: No se puede asignar o autoasignar superadmin directamente mediante UPDATE (debe usarse transferir_superadmin)
    IF NEW.es_superadmin = true AND OLD.es_superadmin = false THEN
        RAISE EXCEPTION 'No se puede asignar el rol de superadministrador directamente. Debe utilizarse la función transferir_superadmin.';
    END IF;

    -- Validaciones para usuarios autenticados (llamadas desde cliente Supabase/API)
    IF v_caller_uid IS NOT NULL THEN
        v_is_superadmin := public.is_superadmin();

        -- Caso A: Quien modifica NO es superadministrador
        IF NOT v_is_superadmin THEN
            -- Un administrador general no puede modificar a otro administrador
            IF v_is_target_admin AND OLD.id <> v_caller_uid THEN
                RAISE EXCEPTION 'Un administrador general no tiene permisos para modificar a otro administrador.';
            END IF;

            -- No puede modificar flags de administrador ni asignarse rol administrativo
            IF (NEW.es_admin_general IS DISTINCT FROM OLD.es_admin_general OR
                NEW.es_superadmin IS DISTINCT FROM OLD.es_superadmin OR
                NEW.rol::text IS DISTINCT FROM OLD.rol::text) THEN
                RAISE EXCEPTION 'Solo el superadministrador puede otorgar, modificar o quitar roles y privilegios administrativos.';
            END IF;

            -- Un administrador no puede desactivarse ni reactivarse a sí mismo
            IF v_is_target_admin AND (NEW.activo IS DISTINCT FROM OLD.activo OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
                RAISE EXCEPTION 'Solo el superadministrador puede activar, desactivar o modificar el estado de administradores.';
            END IF;

            -- Un usuario común no puede modificar activo ni deleted_at para evadir controles
            IF NOT v_is_target_admin AND NOT public.is_admin() AND
               (NEW.activo IS DISTINCT FROM OLD.activo OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
                RAISE EXCEPTION 'No tiene permisos para modificar el estado de activación de la cuenta.';
            END IF;
        END IF;

        -- Caso B: Quien modifica SÍ es superadministrador
        IF v_is_superadmin THEN
            -- El superadministrador NO puede eliminarse ni desactivarse a sí mismo
            IF OLD.id = v_caller_uid AND (NEW.activo = false OR NEW.deleted_at IS NOT NULL) THEN
                RAISE EXCEPTION 'El superadministrador no puede desactivarse a sí mismo.';
            END IF;

            -- El superadministrador no puede quitarse el rol directamente sin transferirlo
            IF OLD.id = v_caller_uid AND NEW.es_superadmin = false THEN
                RAISE EXCEPTION 'El superadministrador no puede quitarse el rol directamente. Debe utilizar la función de transferencia.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_validate_perfil_admin_changes ON public.perfil;
CREATE TRIGGER trigger_validate_perfil_admin_changes
    BEFORE INSERT OR UPDATE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.validate_perfil_admin_changes();

-- H. Procedimiento / RPC seguro para transferir el rol de superadministrador de forma atómica
CREATE OR REPLACE FUNCTION public.transferir_superadmin(p_nuevo_superadmin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_id UUID := auth.uid();
BEGIN
    -- Validar que quien ejecuta es el superadministrador actual (o backend/postgres)
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Solo el superadministrador actual puede transferir este rol.';
    END IF;

    IF v_current_id IS NOT NULL AND p_nuevo_superadmin_id = v_current_id THEN
        RAISE EXCEPTION 'El usuario seleccionado ya es el superadministrador activo.';
    END IF;

    -- Validar que el nuevo usuario existe, está activo y es administrador
    IF NOT EXISTS (
        SELECT 1 FROM public.perfil
        WHERE id = p_nuevo_superadmin_id
          AND activo = true
          AND (es_admin_general = true OR rol::text IN ('admin', 'municipalidad'))
    ) THEN
        RAISE EXCEPTION 'El destinatario debe ser un administrador activo registrado en el sistema.';
    END IF;

    -- Bloqueo de concurrencia
    PERFORM pg_advisory_xact_lock(hashtext('superadmin_lock'));

    -- Activar variable de contexto de sesión para autorizar el paso en el trigger
    PERFORM set_config('app.transferring_superadmin', 'true', true);

    -- Quitar superadmin al actual
    IF v_current_id IS NOT NULL THEN
        UPDATE public.perfil
        SET es_superadmin = false
        WHERE id = v_current_id;
    ELSE
        UPDATE public.perfil
        SET es_superadmin = false
        WHERE es_superadmin = true;
    END IF;

    -- Promover nuevo superadmin
    UPDATE public.perfil
    SET es_superadmin = true,
        es_admin_general = true,
        activo = true,
        deleted_at = NULL,
        rol = 'admin'::public.user_role
    WHERE id = p_nuevo_superadmin_id;

    -- Limpiar variable de contexto
    PERFORM set_config('app.transferring_superadmin', 'false', true);
END;
$$;

REVOKE ALL ON FUNCTION public.transferir_superadmin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transferir_superadmin(UUID) TO authenticated;

-- I. RPC para que el superadministrador desactive a un administrador general
CREATE OR REPLACE FUNCTION public.desactivar_admin(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Solo el superadministrador puede desactivar administradores.';
    END IF;

    IF p_admin_id = auth.uid() THEN
        RAISE EXCEPTION 'El superadministrador no puede desactivarse a sí mismo.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.perfil WHERE id = p_admin_id AND es_superadmin = true) THEN
        RAISE EXCEPTION 'No se puede desactivar al superadministrador.';
    END IF;

    UPDATE public.perfil
    SET activo = false,
        deleted_at = timezone('utc'::text, now())
    WHERE id = p_admin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.desactivar_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desactivar_admin(UUID) TO authenticated;

-- J. RPC para reactivar un administrador general
CREATE OR REPLACE FUNCTION public.reactivar_admin(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Solo el superadministrador puede reactivar administradores.';
    END IF;

    UPDATE public.perfil
    SET activo = true,
        deleted_at = NULL
    WHERE id = p_admin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reactivar_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivar_admin(UUID) TO authenticated;

-- K. RPC para quitar rol administrativo a un usuario
CREATE OR REPLACE FUNCTION public.quitar_rol_admin(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Solo el superadministrador puede quitar el rol a un administrador.';
    END IF;

    IF p_admin_id = auth.uid() THEN
        RAISE EXCEPTION 'El superadministrador no puede quitarse sus propios privilegios.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.perfil WHERE id = p_admin_id AND es_superadmin = true) THEN
        RAISE EXCEPTION 'No se pueden quitar los privilegios del superadministrador.';
    END IF;

    UPDATE public.perfil
    SET es_admin_general = false,
        rol = 'postulante'::public.user_role
    WHERE id = p_admin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.quitar_rol_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quitar_rol_admin(UUID) TO authenticated;

-- L. RPC para promover un usuario a administrador general
CREATE OR REPLACE FUNCTION public.promover_admin(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Solo el superadministrador puede designar nuevos administradores.';
    END IF;

    UPDATE public.perfil
    SET es_admin_general = true,
        activo = true,
        deleted_at = NULL,
        rol = 'admin'::public.user_role
    WHERE id = p_usuario_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promover_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promover_admin(UUID) TO authenticated;


-- ==============================================================================
-- 3. GESTIÓN DE MÚLTIPLES CURRÍCULUMS (public.curriculums)
-- ==============================================================================

-- A. Creación de la tabla de curriculums
CREATE TABLE IF NOT EXISTS public.curriculums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulante_id UUID NOT NULL REFERENCES public.perfil(id) ON DELETE CASCADE,
    nombre_cv TEXT NOT NULL,
    archivo_url TEXT NOT NULL,
    es_principal BOOLEAN DEFAULT false NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trigger_curriculums_updated_at ON public.curriculums;
CREATE TRIGGER trigger_curriculums_updated_at
    BEFORE UPDATE ON public.curriculums
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- B. Control estricto a nivel de base de datos: máximo 5 CVs activos con bloqueo de concurrencia
CREATE OR REPLACE FUNCTION public.check_max_active_curriculums()
RETURNS TRIGGER AS $$
DECLARE
    v_active_count INTEGER;
BEGIN
    -- Solo verificar si el registro es o pasa a ser activo (borrado lógico no cuenta)
    IF NEW.activo = true AND NEW.deleted_at IS NULL THEN
        -- Bloqueo a nivel de fila sobre el perfil del postulante para serializar transacciones concurrentes
        PERFORM 1 FROM public.perfil WHERE id = NEW.postulante_id FOR UPDATE;

        -- Contar los CV activos actuales del postulante excluyendo la fila en curso si es UPDATE
        SELECT COUNT(*) INTO v_active_count
        FROM public.curriculums
        WHERE postulante_id = NEW.postulante_id
          AND activo = true
          AND deleted_at IS NULL
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF v_active_count >= 5 THEN
            RAISE EXCEPTION 'El postulante no puede tener más de 5 currículums activos simultáneamente.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_check_max_active_curriculums ON public.curriculums;
CREATE TRIGGER trigger_check_max_active_curriculums
    BEFORE INSERT OR UPDATE ON public.curriculums
    FOR EACH ROW EXECUTE FUNCTION public.check_max_active_curriculums();

-- C. Manejo automático del CV principal: al marcar uno como principal, desmarcar los demás
CREATE OR REPLACE FUNCTION public.handle_principal_curriculum()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.es_principal = true AND NEW.activo = true AND NEW.deleted_at IS NULL THEN
        UPDATE public.curriculums
        SET es_principal = false
        WHERE postulante_id = NEW.postulante_id
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND es_principal = true;
    ELSIF (NEW.activo = false OR NEW.deleted_at IS NOT NULL) AND NEW.es_principal = true THEN
        NEW.es_principal := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_handle_principal_curriculum ON public.curriculums;
CREATE TRIGGER trigger_handle_principal_curriculum
    BEFORE INSERT OR UPDATE OF es_principal, activo, deleted_at ON public.curriculums
    FOR EACH ROW EXECUTE FUNCTION public.handle_principal_curriculum();

-- D. Impedir la eliminación física de un CV si ya fue utilizado en alguna postulación
CREATE OR REPLACE FUNCTION public.prevent_used_curriculum_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.postulaciones WHERE cv_id = OLD.id) THEN
        RAISE EXCEPTION 'No se puede eliminar físicamente un currículum utilizado en postulaciones. Debe archivarse lógicamente.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_prevent_used_curriculum_delete ON public.curriculums;
CREATE TRIGGER trigger_prevent_used_curriculum_delete
    BEFORE DELETE ON public.curriculums
    FOR EACH ROW EXECUTE FUNCTION public.prevent_used_curriculum_delete();

-- E. Índices de optimización sobre curriculums
CREATE INDEX IF NOT EXISTS idx_curriculums_postulante_activo
    ON public.curriculums(postulante_id)
    WHERE (activo = true AND deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_curriculums_postulante_all
    ON public.curriculums(postulante_id);

-- F. Migrar CV preexistente desde perfil.cv_url si existe
INSERT INTO public.curriculums (postulante_id, nombre_cv, archivo_url, es_principal, activo)
SELECT id, 'Currículum Principal', cv_url, true, true
FROM public.perfil
WHERE cv_url IS NOT NULL AND trim(cv_url) <> ''
ON CONFLICT DO NOTHING;

-- G. Políticas RLS para curriculums
ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curriculums_owner_select" ON public.curriculums;
CREATE POLICY "curriculums_owner_select" ON public.curriculums FOR SELECT
    TO authenticated
    USING (postulante_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "curriculums_owner_insert" ON public.curriculums;
CREATE POLICY "curriculums_owner_insert" ON public.curriculums FOR INSERT
    TO authenticated
    WITH CHECK (postulante_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "curriculums_owner_update" ON public.curriculums;
CREATE POLICY "curriculums_owner_update" ON public.curriculums FOR UPDATE
    TO authenticated
    USING (postulante_id = auth.uid() OR public.is_admin())
    WITH CHECK (postulante_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "curriculums_owner_delete" ON public.curriculums;
CREATE POLICY "curriculums_owner_delete" ON public.curriculums FOR DELETE
    TO authenticated
    USING (postulante_id = auth.uid() OR public.is_admin());

-- H. RPC para archivado lógico de un currículum
CREATE OR REPLACE FUNCTION public.archivar_curriculum(p_cv_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.curriculums
        WHERE id = p_cv_id AND (postulante_id = auth.uid() OR public.is_admin())
    ) THEN
        RAISE EXCEPTION 'Currículum no encontrado o sin permisos suficientes.';
    END IF;

    UPDATE public.curriculums
    SET activo = false,
        deleted_at = timezone('utc'::text, now()),
        es_principal = false
    WHERE id = p_cv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.archivar_curriculum(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archivar_curriculum(UUID) TO authenticated;


-- ==============================================================================
-- 4. APROBACIÓN MUNICIPAL DE EMPRESAS (public.empresas)
-- ==============================================================================

-- A. Incorporar columnas de estado y trazabilidad
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS estado public.estado_empresa DEFAULT 'pendiente' NOT NULL;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS revisado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;

-- B. Migrar empresas que ya estaban verificadas a estado 'aprobada'
UPDATE public.empresas
SET estado = 'aprobada'
WHERE verificada = true AND estado = 'pendiente';

-- C. Restricción: motivo obligatorio en caso de rechazo
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_empresa_rechazo_motivo') THEN
        ALTER TABLE public.empresas ADD CONSTRAINT check_empresa_rechazo_motivo
            CHECK (estado != 'rechazada' OR (motivo_rechazo IS NOT NULL AND length(trim(motivo_rechazo)) > 0));
    END IF;
END $$;

-- D. Trigger de validación de revisión de empresas y sincronización con 'verificada'
CREATE OR REPLACE FUNCTION public.check_empresa_status_and_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Una empresa nueva registrada por un usuario común debe quedar en estado pendiente y no verificada
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.estado::text != 'pendiente' OR NEW.verificada = true THEN
                RAISE EXCEPTION 'El registro inicial de una empresa debe crearse en estado pendiente y sin verificación.';
            END IF;
            NEW.revisado_por := NULL;
            NEW.fecha_revision := NULL;
            NEW.motivo_rechazo := NULL;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Si el usuario no es admin/municipalidad, bloquear modificación de estado, verificación y auditoría
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.estado::text IS DISTINCT FROM OLD.estado::text THEN
                RAISE EXCEPTION 'Solo los administradores municipales pueden modificar el estado de aprobación de la empresa.';
            END IF;
            IF NEW.verificada IS DISTINCT FROM OLD.verificada THEN
                RAISE EXCEPTION 'Solo los administradores municipales pueden modificar la verificación de la empresa.';
            END IF;
            IF NEW.revisado_por IS DISTINCT FROM OLD.revisado_por OR
               NEW.fecha_revision IS DISTINCT FROM OLD.fecha_revision OR
               NEW.motivo_rechazo IS DISTINCT FROM OLD.motivo_rechazo THEN
                RAISE EXCEPTION 'Solo los administradores municipales pueden modificar los campos de revisión o motivo de rechazo de la empresa.';
            END IF;
        END IF;

        -- Para administradores: si el estado pasa a aprobada o rechazada, autocompletar auditoría si no fue establecida
        IF (OLD.estado::text IS DISTINCT FROM NEW.estado::text) THEN
            IF NEW.estado::text IN ('aprobada', 'rechazada') THEN
                IF NEW.fecha_revision IS NULL THEN
                    NEW.fecha_revision := timezone('utc'::text, now());
                END IF;
                IF NEW.revisado_por IS NULL THEN
                    NEW.revisado_por := auth.uid();
                END IF;
            END IF;
        END IF;
    END IF;

    -- Mantener sincronizada la columna verificada para total compatibilidad hacia atrás
    IF NEW.estado::text = 'aprobada' THEN
        NEW.verificada := true;
    ELSE
        NEW.verificada := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_check_empresa_status ON public.empresas;
CREATE TRIGGER trigger_check_empresa_status
    BEFORE INSERT OR UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.check_empresa_status_and_sync();

-- E. Actualizar políticas RLS sobre public.empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_public_select" ON public.empresas;
DROP POLICY IF EXISTS "empresas_public_select" ON public.empresas;
CREATE POLICY "empresas_public_select" ON public.empresas FOR SELECT
    USING (estado = 'aprobada' OR verificada = true OR user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "companies_owner_insert" ON public.empresas;
DROP POLICY IF EXISTS "empresas_owner_insert" ON public.empresas;
CREATE POLICY "empresas_owner_insert" ON public.empresas FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "companies_owner_update" ON public.empresas;
DROP POLICY IF EXISTS "empresas_owner_update" ON public.empresas;
CREATE POLICY "empresas_owner_update" ON public.empresas FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "companies_admin_all" ON public.empresas;
DROP POLICY IF EXISTS "empresas_admin_all" ON public.empresas;
CREATE POLICY "empresas_admin_all" ON public.empresas FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- F. Restricción en ofertas: empresas no aprobadas NO pueden crear ni publicar ofertas
DROP POLICY IF EXISTS "ofertas_empresa_insert" ON public.ofertas;
CREATE POLICY "ofertas_empresa_insert" ON public.ofertas FOR INSERT
    TO authenticated
    WITH CHECK (
        empresa_id = public.get_user_empresa_id()
        AND EXISTS (
            SELECT 1 FROM public.empresas
            WHERE id = public.get_user_empresa_id()
              AND estado = 'aprobada'
        )
    );

DROP POLICY IF EXISTS "ofertas_empresa_update" ON public.ofertas;
CREATE POLICY "ofertas_empresa_update" ON public.ofertas FOR UPDATE
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


-- ==============================================================================
-- 5. POSTULACIONES: CV UTILIZADO, RETIRO Y RECHAZO DE EMPRESAS
-- ==============================================================================

-- A. Extender public.postulaciones con claves de CV y rechazo
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS cv_id UUID REFERENCES public.curriculums(id) ON DELETE SET NULL;
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS cv_url_snapshot TEXT;
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS motivo_rechazo_empresa TEXT;
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS fecha_rechazo_empresa TIMESTAMPTZ;

-- B. Trigger para congelar el snapshot del CV al momento de la postulación
CREATE OR REPLACE FUNCTION public.snapshot_postulacion_cv()
RETURNS TRIGGER AS $$
BEGIN
    -- Al postularse, congelar el archivo_url real del CV utilizado
    IF NEW.cv_id IS NOT NULL THEN
        SELECT archivo_url INTO NEW.cv_url_snapshot
        FROM public.curriculums
        WHERE id = NEW.cv_id;
    ELSIF NEW.cv_url_snapshot IS NULL THEN
        SELECT cv_url INTO NEW.cv_url_snapshot
        FROM public.perfil
        WHERE id = NEW.postulante_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_snapshot_postulacion_cv ON public.postulaciones;
CREATE TRIGGER trigger_snapshot_postulacion_cv
    BEFORE INSERT ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.snapshot_postulacion_cv();

-- C. Trigger para registrar timestamp cuando una empresa rechaza una postulación
CREATE OR REPLACE FUNCTION public.handle_postulacion_rechazo_empresa()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.estado::text IN ('rechazado_por_empresa', 'no_seleccionado') OR NEW.motivo_rechazo_empresa IS NOT NULL) THEN
        IF NEW.fecha_rechazo_empresa IS NULL THEN
            NEW.fecha_rechazo_empresa := timezone('utc'::text, now());
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_postulacion_rechazo_empresa ON public.postulaciones;
CREATE TRIGGER trigger_postulacion_rechazo_empresa
    BEFORE INSERT OR UPDATE ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.handle_postulacion_rechazo_empresa();

-- D. Trigger de validación de integridad histórica y transiciones de estado
CREATE OR REPLACE FUNCTION public.validate_postulacion_integrity_and_status()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_uid UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_empresa_id UUID;
BEGIN
    v_is_admin := public.is_admin();

    -- REGLA: Los campos históricos y de auditoría son inmutables para usuarios no administradores
    IF NOT v_is_admin THEN
        IF NEW.postulante_id IS DISTINCT FROM OLD.postulante_id OR
           NEW.oferta_id IS DISTINCT FROM OLD.oferta_id OR
           NEW.cv_id IS DISTINCT FROM OLD.cv_id OR
           NEW.cv_url_snapshot IS DISTINCT FROM OLD.cv_url_snapshot OR
           NEW.created_at IS DISTINCT FROM OLD.created_at OR
           NEW.fecha_derivacion IS DISTINCT FROM OLD.fecha_derivacion OR
           NEW.derivado_por IS DISTINCT FROM OLD.derivado_por THEN
            RAISE EXCEPTION 'No se permite modificar los datos históricos ni de derivación de una postulación.';
        END IF;
    END IF;

    -- Validar transiciones de estado
    IF NEW.estado::text IS DISTINCT FROM OLD.estado::text THEN
        -- Caso Postulante: solo puede pasar a retirado_por_postulante
        IF v_caller_uid IS NOT NULL AND v_caller_uid = OLD.postulante_id AND NOT v_is_admin THEN
            IF NEW.estado::text != 'retirado_por_postulante' THEN
                RAISE EXCEPTION 'El postulante solo puede solicitar el retiro voluntario de su postulación.';
            END IF;
            IF OLD.estado::text IN ('contratado', 'retirado_por_postulante') THEN
                RAISE EXCEPTION 'No se puede retirar una postulación finalizada o ya retirada.';
            END IF;
        END IF;

        -- Caso Empresa: solo puede responder sobre candidatos en presentado_a_empresa o seleccionado
        IF v_caller_uid IS NOT NULL AND v_caller_uid != OLD.postulante_id AND NOT v_is_admin THEN
            SELECT id INTO v_empresa_id
            FROM public.empresas
            WHERE user_id = v_caller_uid AND estado = 'aprobada';

            IF v_empresa_id IS NULL THEN
                RAISE EXCEPTION 'No posee permisos de empresa aprobada activa para gestionar postulaciones.';
            END IF;

            IF OLD.estado::text NOT IN ('presentado_a_empresa', 'seleccionado') THEN
                RAISE EXCEPTION 'La empresa solo puede gestionar candidatos formalmente presentados o seleccionados.';
            END IF;

            IF NEW.estado::text NOT IN ('seleccionado', 'rechazado_por_empresa', 'contratado') THEN
                RAISE EXCEPTION 'Transición de estado no autorizada para la empresa.';
            END IF;

            IF NEW.estado::text = 'rechazado_por_empresa' AND (NEW.motivo_rechazo_empresa IS NULL OR length(trim(NEW.motivo_rechazo_empresa)) = 0) THEN
                RAISE EXCEPTION 'El motivo de rechazo es obligatorio para la empresa.';
            END IF;
        END IF;

        -- Para administradores municipales: si pasa a presentado_a_empresa, registrar derivación
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

DROP TRIGGER IF EXISTS trigger_validate_postulacion_integrity ON public.postulaciones;
CREATE TRIGGER trigger_validate_postulacion_integrity
    BEFORE UPDATE ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.validate_postulacion_integrity_and_status();

-- E. Retrocompatibilidad: poblar snapshot para postulaciones históricas existentes
UPDATE public.postulaciones p
SET cv_url_snapshot = per.cv_url
FROM public.perfil per
WHERE p.postulante_id = per.id
  AND p.cv_url_snapshot IS NULL
  AND per.cv_url IS NOT NULL;

-- F. Actualizar políticas RLS sobre postulaciones
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;

-- Postulante puede actualizar para darse de baja (retirado_por_postulante)
DROP POLICY IF EXISTS "postulaciones_postulante_update" ON public.postulaciones;
CREATE POLICY "postulaciones_postulante_update" ON public.postulaciones FOR UPDATE
    TO authenticated
    USING (postulante_id = auth.uid())
    WITH CHECK (
        postulante_id = auth.uid()
        AND estado::text = 'retirado_por_postulante'
    );

-- Postulante puede insertar validando que el CV activo le pertenezca si fue provisto
DROP POLICY IF EXISTS "postulaciones_postulante_insert" ON public.postulaciones;
CREATE POLICY "postulaciones_postulante_insert" ON public.postulaciones FOR INSERT
    TO authenticated
    WITH CHECK (
        postulante_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.ofertas WHERE id = oferta_id AND estado = 'publicada')
        AND (
            cv_id IS NULL OR
            EXISTS (SELECT 1 FROM public.curriculums WHERE id = cv_id AND postulante_id = auth.uid() AND activo = true)
        )
    );

-- Empresa solo puede ver candidatos presentados de sus ofertas si está aprobada
DROP POLICY IF EXISTS "postulaciones_empresa_select" ON public.postulaciones;
CREATE POLICY "postulaciones_empresa_select" ON public.postulaciones FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            JOIN public.empresas emp ON o.empresa_id = emp.id
            WHERE o.id = postulaciones.oferta_id
              AND o.empresa_id = public.get_user_empresa_id()
              AND emp.estado = 'aprobada'
        ) AND
        estado::text IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'rechazado_por_empresa', 'contratado')
    );

-- Empresa solo puede responder (aceptar, rechazar) si está aprobada
DROP POLICY IF EXISTS "postulaciones_empresa_update" ON public.postulaciones;
CREATE POLICY "postulaciones_empresa_update" ON public.postulaciones FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            JOIN public.empresas emp ON o.empresa_id = emp.id
            WHERE o.id = postulaciones.oferta_id
              AND o.empresa_id = public.get_user_empresa_id()
              AND emp.estado = 'aprobada'
        ) AND
        estado::text IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'rechazado_por_empresa', 'contratado')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            JOIN public.empresas emp ON o.empresa_id = emp.id
            WHERE o.id = postulaciones.oferta_id
              AND o.empresa_id = public.get_user_empresa_id()
              AND emp.estado = 'aprobada'
        ) AND
        estado::text IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'rechazado_por_empresa', 'contratado')
    );

-- G. RPCs de acción para postulaciones
-- Retiro voluntario por parte del postulante
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
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT postulante_id, estado INTO v_postulante_id, v_estado_actual
    FROM public.postulaciones
    WHERE id = p_postulacion_id;

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
    SET estado = 'retirado_por_postulante'::public.application_status
    WHERE id = p_postulacion_id;

    IF p_motivo IS NOT NULL AND length(trim(p_motivo)) > 0 THEN
        UPDATE public.historial_postulacion
        SET observaciones = 'Retiro voluntario: ' || p_motivo
        WHERE postulacion_id = p_postulacion_id
          AND estado_nuevo::text = 'retirado_por_postulante'
          AND created_at >= (now() - interval '5 seconds');
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.retirar_postulacion(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retirar_postulacion(UUID, TEXT) TO authenticated;

-- Respuesta de la empresa sobre candidato presentado
CREATE OR REPLACE FUNCTION public.responder_candidato_empresa(
    p_postulacion_id UUID,
    p_decision TEXT, -- 'aceptar' o 'rechazar'
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
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF p_decision NOT IN ('aceptar', 'rechazar') THEN
        RAISE EXCEPTION 'Decisión inválida. Debe ser "aceptar" o "rechazar".';
    END IF;

    IF p_decision = 'rechazar' AND (p_motivo_rechazo IS NULL OR length(trim(p_motivo_rechazo)) = 0) THEN
        RAISE EXCEPTION 'El motivo de rechazo es obligatorio para la empresa.';
    END IF;

    SELECT id INTO v_empresa_id
    FROM public.empresas
    WHERE user_id = auth.uid() AND estado = 'aprobada';

    IF v_empresa_id IS NULL AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No posee permisos de empresa aprobada activa.';
    END IF;

    SELECT o.empresa_id, p.estado INTO v_oferta_empresa_id, v_estado_actual
    FROM public.postulaciones p
    JOIN public.ofertas o ON p.oferta_id = o.id
    WHERE p.id = p_postulacion_id;

    IF v_oferta_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Postulación no encontrada.';
    END IF;

    IF NOT public.is_admin() AND v_oferta_empresa_id <> v_empresa_id THEN
        RAISE EXCEPTION 'La postulación no corresponde a una oferta de su empresa.';
    END IF;

    IF v_estado_actual::text NOT IN ('presentado_a_empresa', 'seleccionado') THEN
        RAISE EXCEPTION 'Solo se puede responder sobre postulaciones en estado presentado_a_empresa o seleccionado.';
    END IF;

    IF p_decision = 'rechazar' THEN
        UPDATE public.postulaciones
        SET estado = 'rechazado_por_empresa'::public.application_status,
            motivo_rechazo_empresa = p_motivo_rechazo,
            fecha_rechazo_empresa = timezone('utc'::text, now())
        WHERE id = p_postulacion_id;
    ELSE
        UPDATE public.postulaciones
        SET estado = 'seleccionado'::public.application_status
        WHERE id = p_postulacion_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) TO authenticated;

-- Registro formal de contratación por parte de la empresa
CREATE OR REPLACE FUNCTION public.registrar_contratacion_empresa(p_postulacion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_empresa_id UUID;
    v_oferta_empresa_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT id INTO v_empresa_id
    FROM public.empresas
    WHERE user_id = auth.uid() AND estado = 'aprobada';

    IF v_empresa_id IS NULL AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No posee permisos de empresa aprobada activa.';
    END IF;

    SELECT o.empresa_id INTO v_oferta_empresa_id
    FROM public.postulaciones p
    JOIN public.ofertas o ON p.oferta_id = o.id
    WHERE p.id = p_postulacion_id;

    IF v_oferta_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Postulación no encontrada.';
    END IF;

    IF NOT public.is_admin() AND v_oferta_empresa_id <> v_empresa_id THEN
        RAISE EXCEPTION 'La postulación no corresponde a una oferta de su empresa.';
    END IF;

    UPDATE public.postulaciones
    SET estado = 'contratado'::public.application_status
    WHERE id = p_postulacion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_contratacion_empresa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_contratacion_empresa(UUID) TO authenticated;


-- ==============================================================================
-- 6. CURSOS Y CAPACITACIONES
-- ==============================================================================

-- A. Tabla de cursos de formación
CREATE TABLE IF NOT EXISTS public.cursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    institucion TEXT,
    duracion TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS trigger_cursos_updated_at ON public.cursos;
CREATE TRIGGER trigger_cursos_updated_at
    BEFORE UPDATE ON public.cursos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- B. Tabla de asignación y derivación de cursos a postulantes
CREATE TABLE IF NOT EXISTS public.postulante_cursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulante_id UUID NOT NULL REFERENCES public.perfil(id) ON DELETE CASCADE,
    curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE RESTRICT,
    asignado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_asignacion TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    estado TEXT DEFAULT 'asignado' NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_postulante_curso_estado CHECK (
        estado IN ('asignado', 'en_curso', 'completado', 'abandonado', 'cancelado')
    )
);

DROP TRIGGER IF EXISTS trigger_postulante_cursos_updated_at ON public.postulante_cursos;
CREATE TRIGGER trigger_postulante_cursos_updated_at
    BEFORE UPDATE ON public.postulante_cursos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C. Índices
CREATE INDEX IF NOT EXISTS idx_postulante_cursos_postulante ON public.postulante_cursos(postulante_id);
CREATE INDEX IF NOT EXISTS idx_postulante_cursos_curso ON public.postulante_cursos(curso_id);

-- D. Políticas RLS
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulante_cursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cursos_public_select" ON public.cursos;
CREATE POLICY "cursos_public_select" ON public.cursos FOR SELECT
    USING (activo = true OR public.is_admin());

DROP POLICY IF EXISTS "cursos_admin_all" ON public.cursos;
CREATE POLICY "cursos_admin_all" ON public.cursos FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "postulante_cursos_owner_select" ON public.postulante_cursos;
CREATE POLICY "postulante_cursos_owner_select" ON public.postulante_cursos FOR SELECT TO authenticated
    USING (postulante_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "postulante_cursos_admin_all" ON public.postulante_cursos;
CREATE POLICY "postulante_cursos_admin_all" ON public.postulante_cursos FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ==============================================================================
-- 7. SEGURIDAD Y PRIVACIDAD DE CANDIDATOS (RESOLUCIÓN H-01)
-- ==============================================================================

-- A. ELIMINAR ACCESO DIRECTO DE EMPRESAS SOBRE public.perfil
-- (Evita que las empresas lean DNI, teléfono, dirección, email u otros datos privados)
DROP POLICY IF EXISTS "profiles_company_select_presented" ON public.perfil;
DROP POLICY IF EXISTS "perfil_empresa_select_derivado" ON public.perfil;

-- B. VISTA SEGURA DE CANDIDATOS PARA EMPRESAS (public.vista_candidatos_empresa)
-- Expone estrictamente los datos de evaluación laboral autorizados.
-- Utiliza security_barrier para evitar filtraciones mediante predicados de optimización.
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
    COALESCE(per.localidad, CASE WHEN per.es_residente_funes THEN 'Funes' ELSE 'Otra localidad' END) AS localidad,
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
    p.fecha_rechazo_empresa
FROM public.postulaciones p
JOIN public.ofertas o ON p.oferta_id = o.id
JOIN public.empresas emp ON o.empresa_id = emp.id
JOIN public.perfil per ON p.postulante_id = per.id
LEFT JOIN public.curriculums cv ON p.cv_id = cv.id
WHERE
    -- La empresa debe estar formalmente aprobada
    emp.estado = 'aprobada'
    -- El candidato debe haber sido presentado formalmente o etapas posteriores
    AND p.estado::text IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'rechazado_por_empresa', 'contratado')
    -- La consulta está restringida al usuario titular de la empresa correspondiente o admin
    AND (
        emp.user_id = auth.uid()
        OR public.is_admin()
    );

GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;
REVOKE ALL ON public.vista_candidatos_empresa FROM anon;

-- C. FUNCIÓN RPC SEGURA PARA CONSULTA DE CANDIDATOS POR PARTE DE LA EMPRESA
CREATE OR REPLACE FUNCTION public.obtener_candidatos_empresa(p_oferta_id UUID DEFAULT NULL)
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
    fecha_rechazo_empresa TIMESTAMPTZ
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

    -- 2. Obtener y validar empresa del usuario autenticado si no es admin
    IF NOT v_is_admin THEN
        SELECT e.id INTO v_empresa_id
        FROM public.empresas e
        WHERE e.user_id = auth.uid()
          AND e.estado = 'aprobada';

        IF v_empresa_id IS NULL THEN
            RAISE EXCEPTION 'El usuario no pertenece a una empresa aprobada activa.';
        END IF;

        -- 3. Si se especificó una oferta, validar que pertenece a la empresa
        IF p_oferta_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.ofertas o
                WHERE o.id = p_oferta_id AND o.empresa_id = v_empresa_id
            ) THEN
                RAISE EXCEPTION 'La oferta solicitada no pertenece a la empresa.';
            END IF;
        END IF;
    END IF;

    -- 4. Retornar candidatos autorizados
    RETURN QUERY
    SELECT
        p.id AS postulacion_id,
        p.oferta_id,
        o.titulo AS oferta_titulo,
        o.empresa_id,
        per.id AS postulante_id,
        per.nombre,
        per.apellido,
        COALESCE(per.localidad, CASE WHEN per.es_residente_funes THEN 'Funes' ELSE 'Otra localidad' END) AS localidad,
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
        p.fecha_rechazo_empresa
    FROM public.postulaciones p
    JOIN public.ofertas o ON p.oferta_id = o.id
    JOIN public.empresas emp ON o.empresa_id = emp.id
    JOIN public.perfil per ON p.postulante_id = per.id
    LEFT JOIN public.curriculums cv ON p.cv_id = cv.id
    WHERE
        (v_is_admin OR emp.id = v_empresa_id)
        AND (p_oferta_id IS NULL OR p.oferta_id = p_oferta_id)
        AND p.estado::text IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'rechazado_por_empresa', 'contratado');
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_candidatos_empresa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_candidatos_empresa(UUID) TO authenticated;

-- D. POLÍTICA DE STORAGE: Permitir a empresas aprobadas leer exclusivamente los CVs de candidatos presentados
DROP POLICY IF EXISTS "cv_empresa_read_presented" ON storage.objects;
CREATE POLICY "cv_empresa_read_presented"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'postulantes-cvs' AND
        EXISTS (
            SELECT 1 FROM public.vista_candidatos_empresa v
            WHERE (storage.foldername(name))[1] = v.postulante_id::text
              AND (
                  v.cv_url = name
                  OR v.cv_url LIKE '%' || name
                  OR name LIKE '%' || v.cv_url
              )
        )
    );


-- ==============================================================================
-- 8. REGISTRO EN CONTROL DE MIGRACIONES
-- ==============================================================================

INSERT INTO public._schema_migrations (version, name)
VALUES ('002', 'extension_requerimientos_funcionales')
ON CONFLICT (version) DO NOTHING;
