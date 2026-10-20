-- ==============================================================================
-- MIGRACIÓN 005: SEGURIDAD, ROLES CANÓNICOS, STORAGE Y RETIRO DE SUPERADMIN
-- ==============================================================================
-- Portal de Empleo Funes
-- Estado: PENDIENTE DE EJECUCIÓN MANUAL POR LA USUARIA EN SUPABASE SQL EDITOR
--
-- Contenido:
-- 1. Unificación del rol administrativo canónico en 'admin' (migrando 'municipalidad').
-- 2. Actualización de is_admin() sin referencias ni dependencias de es_superadmin.
-- 3. Actualización de prevent_admin_physical_delete() sin dependencias de es_superadmin.
-- 4. Retiro definitivo de restricciones y de la columna obsoleta es_superadmin en public.perfil.
-- 5. Trigger de seguridad anti-autodesactivación: Un admin no puede desactivarse ni borrarse a sí mismo.
-- 6. Configuración de límites y tipos MIME (PDF, Word, Imágenes) en el bucket 'postulantes-cvs'.
-- 7. Registro de la migración en public._schema_migrations.
-- ==============================================================================

-- 1. Unificar rol administrativo canónico en 'admin'
UPDATE public.perfil
SET rol = 'admin'::public.user_role
WHERE rol::text = 'municipalidad';

-- 2. Actualizar función is_admin() sin dependencias de superadmin
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
          AND deleted_at IS NULL
          AND rol = 'admin'::public.user_role
    );
$$;

-- 3. Actualizar función de protección contra eliminación física de administradores
CREATE OR REPLACE FUNCTION public.prevent_admin_physical_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.rol = 'admin'::public.user_role OR OLD.rol::text = 'municipalidad' OR OLD.es_admin_general = true) THEN
        RAISE EXCEPTION 'No se permite la eliminación física de perfiles administrativos. Se debe utilizar la desactivación lógica (deleted_at o activo = false).';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Retirar restricciones obsoletas de superadmin y eliminar la columna es_superadmin
ALTER TABLE public.perfil DROP CONSTRAINT IF EXISTS check_superadmin_es_admin;
DROP INDEX IF EXISTS public.idx_perfil_unico_superadmin_activo;

ALTER TABLE public.perfil DROP COLUMN IF EXISTS es_superadmin;

-- 5. Trigger de protección: Un administrador no puede desactivarse ni eliminarse a sí mismo
CREATE OR REPLACE FUNCTION public.check_admin_self_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si quien ejecuta es el propio usuario autenticado y es/era administrador
    IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id AND (OLD.rol = 'admin'::public.user_role OR OLD.rol::text = 'municipalidad') THEN
        -- No permitir auto-desactivación
        IF NEW.activo IS FALSE AND OLD.activo IS TRUE THEN
            RAISE EXCEPTION 'Operación denegada: Un administrador no puede desactivar su propia cuenta.';
        END IF;
        -- No permitir auto-baja lógica
        IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            RAISE EXCEPTION 'Operación denegada: Un administrador no puede eliminar lógicamente su propia cuenta.';
        END IF;
        -- No permitir auto-revocación de rol
        IF NEW.rol != OLD.rol THEN
            RAISE EXCEPTION 'Operación denegada: Un administrador no puede cambiar su propio rol.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_admin_self_deactivation ON public.perfil;
CREATE TRIGGER trigger_prevent_admin_self_deactivation
    BEFORE UPDATE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.check_admin_self_deactivation();

-- 6. Configuración del Bucket 'postulantes-cvs' (10 MB; PDF, Word e Imágenes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'postulantes-cvs',
    'postulantes-cvs',
    false,
    10485760, -- 10 MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

-- 7. Registro en control de migraciones
INSERT INTO public._schema_migrations (version, name)
VALUES ('005', '005_seguridad_roles_storage_y_limpieza_superadmin')
ON CONFLICT (version) DO UPDATE SET
    name = EXCLUDED.name,
    applied_at = timezone('utc'::text, now());
