-- ==============================================================================
-- MIGRACIÓN 001: ADAPTACIÓN Y AJUSTES DEL ESQUEMA EXISTENTE
-- ==============================================================================
-- Portal de Empleo Funes
-- Esta migración adapta la base de datos existente en Supabase a los requerimientos
-- funcionales utilizando los nombres reales de las tablas existentes:
-- (perfil, empresas, ofertas, postulaciones, rubros, historial_postulacion, seguimiento)
--
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Abrir el SQL Editor en el Dashboard de Supabase.
-- 2. Copiar y pegar todo el contenido de este archivo.
-- 3. Ejecutar ("Run").
-- ==============================================================================

-- 1. CREACIÓN DE TABLA DE CONTROL DE MIGRACIONES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. AJUSTES EN TIPOS ENUM (Valores adicionales)
-- ------------------------------------------------------------------------------
-- Agregar 'municipalidad' a user_role si aún no existe
DO $$ BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'municipalidad';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Agregar 'rechazada' a job_status si aún no existe
DO $$ BEGIN
    ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'rechazada';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. AJUSTES EN TABLA PERFIL (public.perfil)
-- ------------------------------------------------------------------------------
-- A. Eliminar columna email de perfil (el email pertenece y se administra en auth.users)
ALTER TABLE public.perfil DROP COLUMN IF EXISTS email;

-- B. Asegurar que no haya restricción obligatoria de residencia en Funes para la v1
ALTER TABLE public.perfil ALTER COLUMN es_residente_funes DROP NOT NULL;
ALTER TABLE public.perfil ALTER COLUMN es_residente_funes SET DEFAULT false;

-- 4. ACTUALIZACIÓN DE FUNCIONES DE ROL Y SEGURIDAD
-- ------------------------------------------------------------------------------
-- A. Función para validar si el usuario autenticado pertenece al rol municipal / administrativo
-- Se evalúa rol::text para evitar error 55P04 con el nuevo valor en la misma transacción.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.perfil
        WHERE id = auth.uid() AND rol::text IN ('admin', 'municipalidad')
    );
$$;

-- B. Función auxiliar para obtener el ID de la empresa del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT id FROM public.empresas
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

-- Alias retrocompatible por si alguna política anterior la invoca
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.get_user_empresa_id();
$$;

-- C. Blindaje del trigger de nuevo usuario:
--    - No almacena email en perfil (evita duplicación con auth.users).
--    - Impide que un usuario se autoasigne rol 'municipalidad' o 'admin' desde el registro público.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    requested_role TEXT;
    final_role public.user_role;
BEGIN
    requested_role := NEW.raw_user_meta_data->>'rol';
    IF requested_role IS NULL THEN
        requested_role := NEW.raw_user_meta_data->>'role';
    END IF;

    -- Solo se permite 'postulante' o 'empresa' desde el registro público.
    -- El rol municipal únicamente puede asignarse de forma interna/administrativa.
    IF requested_role = 'empresa' THEN
        final_role := 'empresa'::public.user_role;
    ELSE
        final_role := 'postulante'::public.user_role;
    END IF;

    INSERT INTO public.perfil (
        id,
        rol,
        nombre,
        apellido,
        dni,
        telefono,
        es_residente_funes
    ) VALUES (
        NEW.id,
        final_role,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
        NEW.raw_user_meta_data->>'apellido',
        NEW.raw_user_meta_data->>'dni',
        NEW.raw_user_meta_data->>'telefono',
        COALESCE((NEW.raw_user_meta_data->>'es_residente_funes')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-asociar trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. CATEGORÍAS LABORALES (RELACIONES N:M REUTILIZANDO public.rubros)
-- ------------------------------------------------------------------------------
-- A. Tabla intermedia para ofertas laborales y rubros/categorías
CREATE TABLE IF NOT EXISTS public.ofertas_rubros (
    oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
    rubro_id INTEGER NOT NULL REFERENCES public.rubros(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (oferta_id, rubro_id)
);

-- Migrar datos preexistentes de ofertas.rubro_id hacia ofertas_rubros si existen
INSERT INTO public.ofertas_rubros (oferta_id, rubro_id)
SELECT id, rubro_id FROM public.ofertas
WHERE rubro_id IS NOT NULL
ON CONFLICT (oferta_id, rubro_id) DO NOTHING;

-- B. Tabla intermedia para postulantes (perfil) y rubros/categorías de interés
CREATE TABLE IF NOT EXISTS public.perfil_rubros (
    perfil_id UUID NOT NULL REFERENCES public.perfil(id) ON DELETE CASCADE,
    rubro_id INTEGER NOT NULL REFERENCES public.rubros(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (perfil_id, rubro_id)
);

-- RLS para ofertas_rubros y perfil_rubros
ALTER TABLE public.ofertas_rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_rubros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ofertas_rubros_select" ON public.ofertas_rubros;
CREATE POLICY "ofertas_rubros_select"
    ON public.ofertas_rubros FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "ofertas_rubros_admin_all" ON public.ofertas_rubros;
CREATE POLICY "ofertas_rubros_admin_all"
    ON public.ofertas_rubros FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ofertas_rubros_empresa_manage" ON public.ofertas_rubros;
CREATE POLICY "ofertas_rubros_empresa_manage"
    ON public.ofertas_rubros FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = ofertas_rubros.oferta_id AND o.empresa_id = public.get_user_empresa_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = ofertas_rubros.oferta_id AND o.empresa_id = public.get_user_empresa_id()
        )
    );

DROP POLICY IF EXISTS "perfil_rubros_owner_select" ON public.perfil_rubros;
CREATE POLICY "perfil_rubros_owner_select"
    ON public.perfil_rubros FOR SELECT
    TO authenticated
    USING (perfil_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "perfil_rubros_owner_manage" ON public.perfil_rubros;
CREATE POLICY "perfil_rubros_owner_manage"
    ON public.perfil_rubros FOR ALL
    TO authenticated
    USING (perfil_id = auth.uid() OR public.is_admin())
    WITH CHECK (perfil_id = auth.uid() OR public.is_admin());

-- 6. AJUSTES EN OFERTAS LABORALES (public.ofertas)
-- ------------------------------------------------------------------------------
-- A. Columnas de auditoría municipal y baja lógica
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS revisado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- B. Regla en PostgreSQL: Las empresas NO pueden auto-publicar ni rechazar ofertas
CREATE OR REPLACE FUNCTION public.check_oferta_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Si una empresa crea una oferta, no puede crearla directamente como 'publicada' ni 'rechazada'
        IF (NEW.estado::text IN ('publicada', 'rechazada')) AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Las ofertas laborales deben crearse como borrador o pendientes de revisión para ser aprobadas por la Municipalidad.';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.estado::text IS DISTINCT FROM NEW.estado::text) THEN
            -- Si el estado pasa a 'publicada' o 'rechazada' y el usuario no es admin/municipalidad, bloquear
            IF (NEW.estado::text IN ('publicada', 'rechazada')) AND NOT public.is_admin() THEN
                IF (OLD.estado::text != 'publicada' AND NEW.estado::text = 'publicada') THEN
                    RAISE EXCEPTION 'Solo la Oficina de Empleo Municipal puede aprobar y publicar una oferta laboral.';
                END IF;
                IF (NEW.estado::text = 'rechazada') THEN
                    RAISE EXCEPTION 'Solo la Oficina de Empleo Municipal puede rechazar una oferta laboral.';
                END IF;
            END IF;

            -- Si se aprueba la oferta, registrar fecha y revisor si no vienen establecidos
            IF (NEW.estado::text = 'publicada' AND OLD.estado::text != 'publicada') THEN
                IF NEW.fecha_revision IS NULL THEN
                    NEW.fecha_revision := timezone('utc'::text, now());
                END IF;
                IF NEW.revisado_por IS NULL THEN
                    NEW.revisado_por := auth.uid();
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_oferta_status ON public.ofertas;
CREATE TRIGGER trigger_check_oferta_status
    BEFORE INSERT OR UPDATE ON public.ofertas
    FOR EACH ROW EXECUTE FUNCTION public.check_oferta_status_transition();

-- C. Políticas RLS actualizadas sobre ofertas
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_public_select_published" ON public.ofertas;
DROP POLICY IF EXISTS "ofertas_public_select_published" ON public.ofertas;
CREATE POLICY "ofertas_public_select_published" ON public.ofertas FOR SELECT
    USING (estado = 'publicada' OR empresa_id = public.get_user_empresa_id() OR public.is_admin());

DROP POLICY IF EXISTS "jobs_company_insert" ON public.ofertas;
DROP POLICY IF EXISTS "ofertas_empresa_insert" ON public.ofertas;
CREATE POLICY "ofertas_empresa_insert" ON public.ofertas FOR INSERT TO authenticated
    WITH CHECK (empresa_id = public.get_user_empresa_id());

DROP POLICY IF EXISTS "jobs_company_update" ON public.ofertas;
DROP POLICY IF EXISTS "ofertas_empresa_update" ON public.ofertas;
CREATE POLICY "ofertas_empresa_update" ON public.ofertas FOR UPDATE TO authenticated
    USING (empresa_id = public.get_user_empresa_id())
    WITH CHECK (empresa_id = public.get_user_empresa_id());

DROP POLICY IF EXISTS "jobs_admin_all" ON public.ofertas;
DROP POLICY IF EXISTS "ofertas_admin_all" ON public.ofertas;
CREATE POLICY "ofertas_admin_all" ON public.ofertas FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7. AJUSTES EN POSTULACIONES Y DERIVACIÓN (public.postulaciones)
-- ------------------------------------------------------------------------------
-- A. Columnas para registrar la derivación formal a la empresa
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS derivado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS fecha_derivacion TIMESTAMPTZ;
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS observaciones_derivacion TEXT;

-- B. Garantizar restricción UNIQUE para evitar postulaciones duplicadas
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_postulacion_usuario_oferta'
    ) THEN
        ALTER TABLE public.postulaciones ADD CONSTRAINT unique_postulacion_usuario_oferta UNIQUE (oferta_id, postulante_id);
    END IF;
END $$;

-- C. Triggers de auditoría de postulaciones adaptados a las tablas e identificadores reales
CREATE OR REPLACE FUNCTION public.record_initial_application_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.historial_postulacion (
        postulacion_id,
        estado_anterior,
        estado_nuevo,
        cambiado_por,
        observaciones
    ) VALUES (
        NEW.id,
        NULL,
        NEW.estado,
        auth.uid(),
        'Postulación inicial registrada'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.track_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO public.historial_postulacion (
            postulacion_id,
            estado_anterior,
            estado_nuevo,
            cambiado_por,
            observaciones
        ) VALUES (
            NEW.id,
            OLD.estado,
            NEW.estado,
            auth.uid(),
            'Cambio automático de estado'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_application_status ON public.postulaciones;
DROP TRIGGER IF EXISTS trigger_track_postulacion_status ON public.postulaciones;
CREATE TRIGGER trigger_track_postulacion_status
    AFTER UPDATE OF estado ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.track_application_status_change();

DROP TRIGGER IF EXISTS trigger_record_initial_application ON public.postulaciones;
DROP TRIGGER IF EXISTS trigger_record_initial_postulacion ON public.postulaciones;
CREATE TRIGGER trigger_record_initial_postulacion
    AFTER INSERT ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.record_initial_application_status();

-- D. Actualizar políticas RLS completas sobre postulaciones
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_postulante_select" ON public.postulaciones;
DROP POLICY IF EXISTS "postulaciones_postulante_select" ON public.postulaciones;
CREATE POLICY "postulaciones_postulante_select" ON public.postulaciones FOR SELECT
    TO authenticated
    USING (postulante_id = auth.uid());

DROP POLICY IF EXISTS "applications_postulante_insert" ON public.postulaciones;
DROP POLICY IF EXISTS "postulaciones_postulante_insert" ON public.postulaciones;
CREATE POLICY "postulaciones_postulante_insert" ON public.postulaciones FOR INSERT
    TO authenticated
    WITH CHECK (
        postulante_id = auth.uid() AND
        EXISTS (SELECT 1 FROM public.ofertas WHERE id = oferta_id AND estado = 'publicada')
    );

DROP POLICY IF EXISTS "applications_company_select" ON public.postulaciones;
DROP POLICY IF EXISTS "postulaciones_empresa_select" ON public.postulaciones;
CREATE POLICY "postulaciones_empresa_select" ON public.postulaciones FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = postulaciones.oferta_id
              AND o.empresa_id = public.get_user_empresa_id()
        ) AND
        estado IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'contratado')
    );

DROP POLICY IF EXISTS "applications_company_update" ON public.postulaciones;
DROP POLICY IF EXISTS "postulaciones_empresa_update" ON public.postulaciones;
CREATE POLICY "postulaciones_empresa_update" ON public.postulaciones FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = postulaciones.oferta_id
              AND o.empresa_id = public.get_user_empresa_id()
        ) AND
        estado IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'contratado')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = postulaciones.oferta_id
              AND o.empresa_id = public.get_user_empresa_id()
        ) AND
        estado IN ('presentado_a_empresa', 'seleccionado', 'no_seleccionado', 'contratado')
    );

DROP POLICY IF EXISTS "applications_admin_all" ON public.postulaciones;
DROP POLICY IF EXISTS "postulaciones_admin_all" ON public.postulaciones;
CREATE POLICY "postulaciones_admin_all" ON public.postulaciones FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8. ACTUALIZACIÓN DE POLÍTICAS RLS EN PERFIL, HISTORIAL Y SEGUIMIENTO
-- ------------------------------------------------------------------------------
-- A. Políticas en public.perfil (adaptadas a ofertas y postulaciones reales)
ALTER TABLE public.perfil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_owner_select" ON public.perfil;
DROP POLICY IF EXISTS "perfil_owner_select" ON public.perfil;
CREATE POLICY "perfil_owner_select" ON public.perfil FOR SELECT
    TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_owner_update" ON public.perfil;
DROP POLICY IF EXISTS "perfil_owner_update" ON public.perfil;
CREATE POLICY "perfil_owner_update" ON public.perfil FOR UPDATE
    TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_all" ON public.perfil;
DROP POLICY IF EXISTS "perfil_admin_all" ON public.perfil;
CREATE POLICY "perfil_admin_all" ON public.perfil FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_company_select_presented" ON public.perfil;
DROP POLICY IF EXISTS "perfil_empresa_select_derivado" ON public.perfil;
CREATE POLICY "perfil_empresa_select_derivado" ON public.perfil FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.postulaciones p
            JOIN public.ofertas o ON p.oferta_id = o.id
            WHERE p.postulante_id = perfil.id
              AND o.empresa_id = public.get_user_empresa_id()
              AND p.estado IN ('presentado_a_empresa', 'seleccionado', 'contratado')
        )
    );

-- B. Políticas en public.historial_postulacion
ALTER TABLE public.historial_postulacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_postulante_select" ON public.historial_postulacion;
DROP POLICY IF EXISTS "historial_postulante_select" ON public.historial_postulacion;
CREATE POLICY "historial_postulante_select" ON public.historial_postulacion FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.postulaciones p
            WHERE p.id = historial_postulacion.postulacion_id
              AND p.postulante_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "history_admin_all" ON public.historial_postulacion;
DROP POLICY IF EXISTS "historial_admin_all" ON public.historial_postulacion;
CREATE POLICY "historial_admin_all" ON public.historial_postulacion FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- C. Políticas en public.seguimiento
ALTER TABLE public.seguimiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follow_ups_admin_all" ON public.seguimiento;
DROP POLICY IF EXISTS "seguimiento_admin_all" ON public.seguimiento;
CREATE POLICY "seguimiento_admin_all" ON public.seguimiento FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. STORAGE PARA CVs (BUCKET PRIVADO Y POLÍTICAS RLS)
-- ------------------------------------------------------------------------------
-- Crear bucket privado postulantes-cvs si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('postulantes-cvs', 'postulantes-cvs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Políticas de Storage sobre storage.objects
DROP POLICY IF EXISTS "cv_owner_upload" ON storage.objects;
CREATE POLICY "cv_owner_upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'postulantes-cvs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "cv_owner_update" ON storage.objects;
CREATE POLICY "cv_owner_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'postulantes-cvs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'postulantes-cvs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "cv_owner_read" ON storage.objects;
CREATE POLICY "cv_owner_read"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'postulantes-cvs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "cv_municipalidad_read_all" ON storage.objects;
CREATE POLICY "cv_municipalidad_read_all"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'postulantes-cvs' AND
        public.is_admin()
    );

-- 10. REGISTRO EN CONTROL DE MIGRACIONES
-- ------------------------------------------------------------------------------
INSERT INTO public._schema_migrations (version, name)
VALUES ('001', 'adaptar_esquema_existente')
ON CONFLICT (version) DO NOTHING;
