-- ==============================================================================
-- ESQUEMA CONSOLIDADO DE BASE DE DATOS — PORTAL DE EMPLEO MUNICIPALIDAD DE FUNES
-- ==============================================================================
-- Estado consolidado resultante de las migraciones 000 a 006 sobre PostgreSQL / Supabase.
-- Propósito: Referencia técnica fidedigna del esquema real (tablas, tipos ENUM,
-- claves foráneas con sus nombres reales en el catálogo, vistas, funciones RPC,
-- triggers, políticas RLS, configuración de Storage y privilegios SQL GRANT).
--
-- NOTA: Para aplicar cambios incrementales sobre la base existente, utilizar los
-- archivos versionados en `migrations/001_...` a `migrations/006_...`.
-- ==============================================================================

-- 1. EXTENSIONES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 2. TIPOS ENUMERADOS (ENUMS)
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('postulante', 'empresa', 'admin', 'municipalidad');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.job_status AS ENUM (
        'borrador',
        'pendiente_revision',
        'publicada',
        'pausada',
        'finalizada',
        'rechazada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.application_status AS ENUM (
        'postulado',
        'en_revision',
        'preseleccionado',
        'entrevista',
        'presentado_a_empresa',
        'seleccionado',
        'no_seleccionado',
        'contratado',
        'retirado_por_postulante',
        'rechazado_por_empresa'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.estado_empresa AS ENUM ('pendiente', 'aprobada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 3. TABLAS DEL ESQUEMA PUBLIC
-- ==============================================================================

-- 3.1 Control de Migraciones
CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.2 Rubros / Categorías Laborales
CREATE TABLE IF NOT EXISTS public.rubros (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.3 Perfiles de Usuarios (vinculados a auth.users)
CREATE TABLE IF NOT EXISTS public.perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol public.user_role NOT NULL DEFAULT 'postulante',
    nombre TEXT NOT NULL,
    apellido TEXT,
    dni TEXT UNIQUE,
    telefono TEXT,
    fecha_nacimiento DATE,
    direccion TEXT,
    localidad TEXT,
    es_residente_funes BOOLEAN DEFAULT false,
    nivel_educativo TEXT,
    situacion_laboral_actual TEXT,
    habilidades TEXT[],
    experiencia_resumen TEXT,
    cv_url TEXT,
    disponibilidad_horaria TEXT,
    movilidad_propia BOOLEAN DEFAULT false,
    es_admin_general BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_admin_rol CHECK (NOT es_admin_general OR rol::text IN ('admin', 'municipalidad'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_perfil_dni_numerico_unico
    ON public.perfil ((regexp_replace(dni, '\D', '', 'g')))
    WHERE dni IS NOT NULL AND length(dni) > 0;

-- 3.4 Currículums de Postulantes (múltiples CVs, máximo 5 activos, borrado lógico)
CREATE TABLE IF NOT EXISTS public.curriculums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulante_id UUID NOT NULL,
    nombre_cv TEXT NOT NULL,
    archivo_url TEXT NOT NULL,
    es_principal BOOLEAN DEFAULT false NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT curriculums_postulante_id_fkey
        FOREIGN KEY (postulante_id) REFERENCES public.perfil(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_curriculums_postulante_activo
    ON public.curriculums(postulante_id)
    WHERE (activo = true AND deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_curriculums_postulante_all
    ON public.curriculums(postulante_id);

-- 3.5 Empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    razon_social TEXT NOT NULL,
    nombre_fantasia TEXT NOT NULL,
    cuit TEXT NOT NULL UNIQUE,
    direccion TEXT NOT NULL,
    localidad TEXT DEFAULT 'Funes' NOT NULL,
    telefono TEXT NOT NULL,
    email_contacto TEXT NOT NULL,
    persona_contacto TEXT NOT NULL,
    rubro TEXT,
    descripcion TEXT,
    sitio_web TEXT,
    verificada BOOLEAN DEFAULT false NOT NULL,
    estado public.estado_empresa DEFAULT 'pendiente' NOT NULL,
    motivo_rechazo TEXT,
    revisado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_revision TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_empresa_rechazo_motivo CHECK (
        estado != 'rechazada' OR (motivo_rechazo IS NOT NULL AND length(trim(motivo_rechazo)) > 0)
    )
);

-- 3.6 Ofertas Laborales
-- Nota: conserva el nombre histórico `jobs_rubro_id_fkey` en la FK hacia `public.rubros`
-- y `ofertas_empresa_id_fkey` en la FK hacia `public.empresas`.
CREATE TABLE IF NOT EXISTS public.ofertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    rubro_id INTEGER,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    requisitos TEXT NOT NULL,
    experiencia_requerida TEXT,
    tipo_jornada TEXT NOT NULL,
    tipo_contrato TEXT,
    ubicacion TEXT DEFAULT 'Funes, Santa Fe' NOT NULL,
    rango_salarial TEXT,
    vacantes INTEGER DEFAULT 1 NOT NULL,
    estado public.job_status DEFAULT 'pendiente_revision' NOT NULL,
    destacada BOOLEAN DEFAULT false NOT NULL,
    fecha_limite DATE,
    revisado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_revision TIMESTAMPTZ,
    motivo_rechazo TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ofertas_empresa_id_fkey
        FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE,
    CONSTRAINT jobs_rubro_id_fkey
        FOREIGN KEY (rubro_id) REFERENCES public.rubros(id) ON DELETE SET NULL
);

-- 3.7 Relación N:M entre Ofertas y Rubros
CREATE TABLE IF NOT EXISTS public.ofertas_rubros (
    oferta_id UUID NOT NULL,
    rubro_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (oferta_id, rubro_id),
    CONSTRAINT ofertas_rubros_oferta_id_fkey
        FOREIGN KEY (oferta_id) REFERENCES public.ofertas(id) ON DELETE CASCADE,
    CONSTRAINT ofertas_rubros_rubro_id_fkey
        FOREIGN KEY (rubro_id) REFERENCES public.rubros(id) ON DELETE CASCADE
);

-- 3.8 Relación N:M entre Perfiles y Rubros de interés
CREATE TABLE IF NOT EXISTS public.perfil_rubros (
    perfil_id UUID NOT NULL,
    rubro_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (perfil_id, rubro_id),
    CONSTRAINT perfil_rubros_perfil_id_fkey
        FOREIGN KEY (perfil_id) REFERENCES public.perfil(id) ON DELETE CASCADE,
    CONSTRAINT perfil_rubros_rubro_id_fkey
        FOREIGN KEY (rubro_id) REFERENCES public.rubros(id) ON DELETE CASCADE
);

-- 3.9 Postulaciones
-- Nota: conserva el nombre histórico `applications_postulante_id_fkey` en la FK hacia `public.perfil`,
-- `postulaciones_oferta_id_fkey` hacia `public.ofertas` y `postulaciones_cv_id_fkey` hacia `public.curriculums`.
CREATE TABLE IF NOT EXISTS public.postulaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id UUID NOT NULL,
    postulante_id UUID NOT NULL,
    cv_id UUID,
    cv_url_snapshot TEXT,
    estado public.application_status DEFAULT 'postulado' NOT NULL,
    mensaje_postulante TEXT,
    notas_oficina_empleo TEXT,
    derivado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_derivacion TIMESTAMPTZ,
    observaciones_derivacion TEXT,
    motivo_rechazo_empresa TEXT,
    fecha_rechazo_empresa TIMESTAMPTZ,
    fecha_respuesta_empresa TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_postulacion_usuario_oferta UNIQUE (oferta_id, postulante_id),
    CONSTRAINT postulaciones_oferta_id_fkey
        FOREIGN KEY (oferta_id) REFERENCES public.ofertas(id) ON DELETE CASCADE,
    CONSTRAINT applications_postulante_id_fkey
        FOREIGN KEY (postulante_id) REFERENCES public.perfil(id) ON DELETE CASCADE,
    CONSTRAINT postulaciones_cv_id_fkey
        FOREIGN KEY (cv_id) REFERENCES public.curriculums(id) ON DELETE SET NULL
);

-- 3.10 Historial de Cambios de Estado en Postulaciones
-- Nota: conserva el nombre histórico `application_history_application_id_fkey` hacia `public.postulaciones`.
CREATE TABLE IF NOT EXISTS public.historial_postulacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulacion_id UUID NOT NULL,
    estado_anterior public.application_status,
    estado_nuevo public.application_status NOT NULL,
    cambiado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT application_history_application_id_fkey
        FOREIGN KEY (postulacion_id) REFERENCES public.postulaciones(id) ON DELETE CASCADE
);

-- 3.11 Cursos de Formación y Capacitación
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

-- 3.12 Asignación de Cursos a Postulantes
CREATE TABLE IF NOT EXISTS public.postulante_cursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulante_id UUID NOT NULL,
    curso_id UUID NOT NULL,
    asignado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_asignacion TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    estado TEXT DEFAULT 'asignado' NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_postulante_curso_estado CHECK (
        estado IN ('asignado', 'en_curso', 'completado', 'abandonado', 'cancelado')
    ),
    CONSTRAINT postulante_cursos_postulante_id_fkey
        FOREIGN KEY (postulante_id) REFERENCES public.perfil(id) ON DELETE CASCADE,
    CONSTRAINT postulante_cursos_curso_id_fkey
        FOREIGN KEY (curso_id) REFERENCES public.cursos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_postulante_cursos_postulante ON public.postulante_cursos(postulante_id);
CREATE INDEX IF NOT EXISTS idx_postulante_cursos_curso ON public.postulante_cursos(curso_id);


-- 4. FUNCIONES AUXILIARES Y TRIGGERS DE INTEGRIDAD
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.perfil;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_curriculums_updated_at ON public.curriculums;
CREATE TRIGGER trigger_curriculums_updated_at
    BEFORE UPDATE ON public.curriculums
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_companies_updated_at ON public.empresas;
CREATE TRIGGER trigger_companies_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_jobs_updated_at ON public.ofertas;
CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON public.ofertas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.postulaciones;
CREATE TRIGGER trigger_applications_updated_at
    BEFORE UPDATE ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_cursos_updated_at ON public.cursos;
CREATE TRIGGER trigger_cursos_updated_at
    BEFORE UPDATE ON public.cursos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_postulante_cursos_updated_at ON public.postulante_cursos;
CREATE TRIGGER trigger_postulante_cursos_updated_at
    BEFORE UPDATE ON public.postulante_cursos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Función canónica de verificación de rol administrativo activo
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

-- Función auxiliar para obtener el ID de la empresa del usuario autenticado
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

-- Alias de compatibilidad
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.get_user_empresa_id();
$$;

-- Protección contra eliminación física de administradores
CREATE OR REPLACE FUNCTION public.prevent_admin_physical_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.rol = 'admin'::public.user_role OR OLD.rol::text = 'municipalidad' OR OLD.es_admin_general = true) THEN
        RAISE EXCEPTION 'No se permite la eliminación física de perfiles administrativos. Se debe utilizar la desactivación lógica (deleted_at o activo = false).';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_admin_physical_delete ON public.perfil;
CREATE TRIGGER trigger_prevent_admin_physical_delete
    BEFORE DELETE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_physical_delete();

-- Protección contra escalación de privilegios y auto-desactivación de administradores
CREATE OR REPLACE FUNCTION public.check_admin_self_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.rol::text IN ('admin', 'municipalidad') OR NEW.es_admin_general IS TRUE THEN
                RAISE EXCEPTION 'Operación denegada: Solo un administrador puede dar de alta a otro administrador.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
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

-- Trigger de aprovisionamiento atómico de nuevos usuarios desde Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    requested_role TEXT;
    final_role public.user_role;
    v_cuit TEXT;
    v_razon_social TEXT;
    v_nombre_fantasia TEXT;
    v_dni TEXT;
    v_clean_dni TEXT;
    v_direccion TEXT;
    v_localidad TEXT;
    v_es_residente BOOLEAN;
BEGIN
    requested_role := NEW.raw_user_meta_data->>'rol';
    IF requested_role IS NULL THEN
        requested_role := NEW.raw_user_meta_data->>'role';
    END IF;

    IF requested_role = 'empresa' THEN
        final_role := 'empresa'::public.user_role;
    ELSE
        final_role := 'postulante'::public.user_role;
    END IF;

    v_dni := trim(NEW.raw_user_meta_data->>'dni');
    IF v_dni IS NOT NULL AND length(v_dni) > 0 THEN
        v_clean_dni := regexp_replace(v_dni, '\D', '', 'g');
        IF length(v_clean_dni) > 0 THEN
            IF EXISTS (
                SELECT 1
                FROM public.perfil
                WHERE regexp_replace(COALESCE(dni, ''), '\D', '', 'g') = v_clean_dni
                  AND id <> NEW.id
            ) THEN
                RAISE EXCEPTION 'El DNI ingresado ya se encuentra registrado en el sistema.';
            END IF;
        ELSE
            v_clean_dni := NULL;
        END IF;
    ELSE
        v_clean_dni := NULL;
    END IF;

    v_direccion := NULLIF(trim(NEW.raw_user_meta_data->>'direccion'), '');
    v_localidad := NULLIF(trim(NEW.raw_user_meta_data->>'localidad'), '');

    IF v_localidad IS NOT NULL AND lower(trim(v_localidad)) = 'funes' THEN
        v_es_residente := true;
    ELSE
        v_es_residente := false;
    END IF;

    INSERT INTO public.perfil (
        id,
        rol,
        nombre,
        apellido,
        dni,
        telefono,
        direccion,
        localidad,
        es_residente_funes
    ) VALUES (
        NEW.id,
        final_role,
        COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''), 'Usuario'),
        NULLIF(trim(NEW.raw_user_meta_data->>'apellido'), ''),
        v_clean_dni,
        NULLIF(trim(NEW.raw_user_meta_data->>'telefono'), ''),
        v_direccion,
        v_localidad,
        v_es_residente
    )
    ON CONFLICT (id) DO NOTHING;

    IF final_role = 'empresa' THEN
        v_cuit := trim(NEW.raw_user_meta_data->>'cuit');
        v_razon_social := trim(NEW.raw_user_meta_data->>'razon_social');
        v_nombre_fantasia := COALESCE(
            NULLIF(trim(NEW.raw_user_meta_data->>'nombre_fantasia'), ''),
            NULLIF(v_razon_social, ''),
            'Empresa'
        );

        IF v_cuit IS NOT NULL AND length(v_cuit) > 0 THEN
            IF EXISTS (SELECT 1 FROM public.empresas WHERE cuit = v_cuit AND user_id <> NEW.id) THEN
                RAISE EXCEPTION 'El CUIT ingresado ya se encuentra registrado en el sistema.';
            END IF;
        END IF;

        IF v_razon_social IS NOT NULL AND length(v_razon_social) > 0
           AND v_cuit IS NOT NULL AND length(v_cuit) > 0 THEN
            INSERT INTO public.empresas (
                user_id,
                razon_social,
                nombre_fantasia,
                cuit,
                direccion,
                localidad,
                telefono,
                email_contacto,
                persona_contacto,
                rubro,
                descripcion,
                sitio_web,
                verificada,
                estado
            ) VALUES (
                NEW.id,
                v_razon_social,
                v_nombre_fantasia,
                v_cuit,
                COALESCE(v_direccion, 'Funes'),
                COALESCE(v_localidad, 'Funes'),
                COALESCE(
                    NULLIF(trim(NEW.raw_user_meta_data->>'telefono_contacto'), ''),
                    NULLIF(trim(NEW.raw_user_meta_data->>'telefono'), ''),
                    'Sin especificar'
                ),
                COALESCE(NEW.email, NULLIF(trim(NEW.raw_user_meta_data->>'email_contacto'), ''), ''),
                COALESCE(
                    NULLIF(trim(NEW.raw_user_meta_data->>'persona_contacto'), ''),
                    NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
                    'Contacto Principal'
                ),
                NULLIF(trim(NEW.raw_user_meta_data->>'rubro'), ''),
                NULLIF(trim(NEW.raw_user_meta_data->>'descripcion'), ''),
                NULLIF(trim(NEW.raw_user_meta_data->>'sitio_web'), ''),
                false,
                'pendiente'::public.estado_empresa
            )
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers de gestión de CVs (límite de 5 activos, CV principal único y protección de CVs usados)
CREATE OR REPLACE FUNCTION public.check_max_active_curriculums()
RETURNS TRIGGER AS $$
DECLARE
    v_active_count INTEGER;
BEGIN
    IF NEW.activo = true AND NEW.deleted_at IS NULL THEN
        PERFORM 1 FROM public.perfil WHERE id = NEW.postulante_id FOR UPDATE;

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

-- Trigger de estado y aprobación de empresas
CREATE OR REPLACE FUNCTION public.check_empresa_status_and_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            IF NEW.estado::text != 'pendiente' OR NEW.verificada = true THEN
                RAISE EXCEPTION 'El registro inicial de una empresa debe crearse en estado pendiente y sin verificación.';
            END IF;
            NEW.revisado_por := NULL;
            NEW.fecha_revision := NULL;
            NEW.motivo_rechazo := NULL;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
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

-- Trigger de transiciones de estado de ofertas
CREATE OR REPLACE FUNCTION public.check_oferta_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
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
CREATE TRIGGER check_oferta_status_before_write
    BEFORE INSERT OR UPDATE ON public.ofertas
    FOR EACH ROW EXECUTE FUNCTION public.check_oferta_status_transition();

-- Triggers de postulaciones (snapshot de CV, rechazo de empresa, integridad e historial)
CREATE OR REPLACE FUNCTION public.snapshot_postulacion_cv()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.validate_postulacion_integrity_and_status()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_uid UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_empresa_id UUID;
    v_is_reactivation BOOLEAN := false;
BEGIN
    v_is_admin := public.is_admin();

    IF OLD.estado::text = 'retirado_por_postulante' AND NEW.estado::text = 'postulado' THEN
        v_is_reactivation := true;
    END IF;

    IF NOT v_is_admin THEN
        IF NEW.postulante_id IS DISTINCT FROM OLD.postulante_id OR
           NEW.oferta_id IS DISTINCT FROM OLD.oferta_id OR
           NEW.created_at IS DISTINCT FROM OLD.created_at OR
           NEW.fecha_derivacion IS DISTINCT FROM OLD.fecha_derivacion OR
           NEW.derivado_por IS DISTINCT FROM OLD.derivado_por THEN
            RAISE EXCEPTION 'No se permite modificar los datos históricos ni de derivación de una postulación.';
        END IF;

        IF NOT v_is_reactivation AND (
           NEW.cv_id IS DISTINCT FROM OLD.cv_id OR
           NEW.cv_url_snapshot IS DISTINCT FROM OLD.cv_url_snapshot
        ) THEN
            RAISE EXCEPTION 'No se permite modificar el currículum asociado a una postulación activa.';
        END IF;
    END IF;

    IF NEW.estado::text IS DISTINCT FROM OLD.estado::text THEN
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

DROP TRIGGER IF EXISTS trigger_track_postulacion_status ON public.postulaciones;
CREATE TRIGGER trigger_track_postulacion_status
    AFTER UPDATE OF estado ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.track_application_status_change();

DROP TRIGGER IF EXISTS trigger_record_initial_postulacion ON public.postulaciones;
CREATE TRIGGER trigger_record_initial_postulacion
    AFTER INSERT ON public.postulaciones
    FOR EACH ROW EXECUTE FUNCTION public.record_initial_application_status();


-- 5. VISTAS Y FUNCIONES RPC DE DOMINIO
-- ==============================================================================

-- 5.1 Gestión de Administradores entre pares
CREATE OR REPLACE FUNCTION public.desactivar_admin(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Operación denegada: Solo un administrador activo puede desactivar a otro administrador.';
    END IF;

    IF p_admin_id = auth.uid() THEN
        RAISE EXCEPTION 'Operación denegada: Un administrador no puede desactivar su propia cuenta.';
    END IF;

    UPDATE public.perfil
    SET activo = false,
        deleted_at = timezone('utc'::text, now())
    WHERE id = p_admin_id AND rol::text = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivar_admin(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Operación denegada: Solo un administrador activo puede reactivar a otro administrador.';
    END IF;

    UPDATE public.perfil
    SET activo = true,
        deleted_at = NULL
    WHERE id = p_admin_id AND rol::text = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.promover_admin(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Operación denegada: Solo un administrador activo puede designar nuevos administradores.';
    END IF;

    UPDATE public.perfil
    SET rol = 'admin'::public.user_role,
        activo = true,
        deleted_at = NULL
    WHERE id = p_usuario_id;
END;
$$;

-- 5.2 Archivado lógico de Currículum
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

-- 5.3 Retiro voluntario de postulación
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

-- 5.3b Reactivación de postulación retirada voluntariamente
CREATE OR REPLACE FUNCTION public.reactivar_postulacion(
    p_postulacion_id UUID,
    p_cv_id UUID DEFAULT NULL,
    p_mensaje TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_postulante_id UUID;
    v_oferta_id UUID;
    v_estado_actual public.application_status;
    v_cv_id UUID;
    v_cv_snapshot TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT postulante_id, oferta_id, estado, cv_id, cv_url_snapshot
    INTO v_postulante_id, v_oferta_id, v_estado_actual, v_cv_id, v_cv_snapshot
    FROM public.postulaciones
    WHERE id = p_postulacion_id;

    IF v_postulante_id IS NULL THEN
        RAISE EXCEPTION 'Postulación no encontrada.';
    END IF;

    IF v_postulante_id <> auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No puede reactivar una postulación que no le pertenece.';
    END IF;

    IF v_estado_actual::text <> 'retirado_por_postulante' THEN
        RAISE EXCEPTION 'Solo se pueden reactivar postulaciones que fueron retiradas voluntariamente.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.ofertas o
        WHERE o.id = v_oferta_id
          AND o.estado::text = 'publicada'
          AND o.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Esta oferta laboral ya no se encuentra publicada o vigente.';
    END IF;

    IF p_cv_id IS NOT NULL THEN
        SELECT id, archivo_url INTO v_cv_id, v_cv_snapshot
        FROM public.curriculums
        WHERE id = p_cv_id
          AND postulante_id = v_postulante_id
          AND activo = true
          AND deleted_at IS NULL;

        IF v_cv_id IS NULL THEN
            RAISE EXCEPTION 'El currículum seleccionado no es válido o no se encuentra activo.';
        END IF;
    END IF;

    UPDATE public.postulaciones
    SET estado = 'postulado'::public.application_status,
        cv_id = v_cv_id,
        cv_url_snapshot = v_cv_snapshot,
        mensaje_postulante = COALESCE(NULLIF(trim(p_mensaje), ''), mensaje_postulante),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_postulacion_id;

    UPDATE public.historial_postulacion
    SET observaciones = 'Postulación reactivada por el postulante'
    WHERE postulacion_id = p_postulacion_id
      AND estado_anterior::text = 'retirado_por_postulante'
      AND estado_nuevo::text = 'postulado'
      AND created_at >= (now() - interval '5 seconds');
END;
$$;

-- 5.4 Respuesta de la empresa sobre candidato derivado ('contratado' o 'rechazado')
CREATE OR REPLACE FUNCTION public.responder_candidato_empresa(
    p_postulacion_id UUID,
    p_decision TEXT,
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

    IF v_estado_actual::text NOT IN ('presentado_a_empresa', 'seleccionado') THEN
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
END;
$$;

-- 5.5 Registro directo de contratación por empresa
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

-- 5.6 Vista Segura de Candidatos Presentados a Empresas (20 columnas)
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

-- 5.7 Función RPC sincronizada para obtener candidatos de la empresa (20 columnas)
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


-- 6. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (RLS)
-- ==============================================================================

ALTER TABLE public.rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas_rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_postulacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulante_cursos ENABLE ROW LEVEL SECURITY;

-- 6.1 Rubros
CREATE POLICY "rubros_public_select" ON public.rubros FOR SELECT USING (true);
CREATE POLICY "rubros_admin_all" ON public.rubros FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.2 Perfil (sin lectura directa por empresas; las empresas leen únicamente vista_candidatos_empresa)
CREATE POLICY "perfil_owner_select" ON public.perfil FOR SELECT
    TO authenticated USING (id = auth.uid());
CREATE POLICY "perfil_owner_update" ON public.perfil FOR UPDATE
    TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "perfil_admin_all" ON public.perfil FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.3 Curriculums (sin borrado físico; baja lógica mediante archivar_curriculum)
CREATE POLICY "curriculums_owner_select" ON public.curriculums FOR SELECT
    TO authenticated USING (postulante_id = auth.uid() OR public.is_admin());
CREATE POLICY "curriculums_owner_insert" ON public.curriculums FOR INSERT
    TO authenticated WITH CHECK (postulante_id = auth.uid() OR public.is_admin());
CREATE POLICY "curriculums_owner_update" ON public.curriculums FOR UPDATE
    TO authenticated USING (postulante_id = auth.uid() OR public.is_admin())
    WITH CHECK (postulante_id = auth.uid() OR public.is_admin());

-- 6.4 Empresas
CREATE POLICY "empresas_public_select" ON public.empresas FOR SELECT
    USING (estado = 'aprobada' OR verificada = true OR user_id = auth.uid() OR public.is_admin());
CREATE POLICY "empresas_owner_insert" ON public.empresas FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            user_id = auth.uid()
            AND estado = 'pendiente'
            AND verificada = false
            AND EXISTS (
                SELECT 1 FROM public.perfil p
                WHERE p.id = auth.uid()
                  AND p.rol = 'empresa'
                  AND p.activo = true
                  AND p.deleted_at IS NULL
            )
        )
        OR public.is_admin()
    );
CREATE POLICY "empresas_owner_update" ON public.empresas FOR UPDATE
    TO authenticated USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "empresas_admin_all" ON public.empresas FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.5 Ofertas
CREATE POLICY "ofertas_public_select_published" ON public.ofertas FOR SELECT
    USING (
        (estado = 'publicada' AND deleted_at IS NULL)
        OR empresa_id = public.get_user_empresa_id()
        OR public.is_admin()
    );
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
CREATE POLICY "ofertas_admin_all" ON public.ofertas FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.6 Ofertas_Rubros y Perfil_Rubros
CREATE POLICY "ofertas_rubros_select" ON public.ofertas_rubros FOR SELECT USING (true);
CREATE POLICY "ofertas_rubros_admin_all" ON public.ofertas_rubros FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "ofertas_rubros_empresa_manage" ON public.ofertas_rubros FOR ALL
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

CREATE POLICY "perfil_rubros_owner_select" ON public.perfil_rubros FOR SELECT
    TO authenticated USING (perfil_id = auth.uid() OR public.is_admin());
CREATE POLICY "perfil_rubros_owner_manage" ON public.perfil_rubros FOR ALL
    TO authenticated USING (perfil_id = auth.uid() OR public.is_admin())
    WITH CHECK (perfil_id = auth.uid() OR public.is_admin());

-- 6.7 Postulaciones
CREATE POLICY "postulaciones_postulante_select" ON public.postulaciones FOR SELECT
    TO authenticated USING (postulante_id = auth.uid());
CREATE POLICY "postulaciones_postulante_insert" ON public.postulaciones FOR INSERT
    TO authenticated
    WITH CHECK (
        postulante_id = auth.uid()
        AND estado = 'postulado'
        AND EXISTS (
            SELECT 1 FROM public.perfil p
            WHERE p.id = auth.uid()
              AND p.rol = 'postulante'
              AND p.activo = true
              AND p.deleted_at IS NULL
        )
        AND EXISTS (
            SELECT 1 FROM public.ofertas o
            WHERE o.id = oferta_id
              AND o.estado = 'publicada'
              AND o.deleted_at IS NULL
        )
        AND (
            cv_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.curriculums c
                WHERE c.id = cv_id
                  AND c.postulante_id = auth.uid()
                  AND c.activo = true
                  AND c.deleted_at IS NULL
            )
        )
    );
CREATE POLICY "postulaciones_postulante_update" ON public.postulaciones FOR UPDATE
    TO authenticated
    USING (postulante_id = auth.uid())
    WITH CHECK (
        postulante_id = auth.uid()
        AND estado::text = 'retirado_por_postulante'
    );
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
CREATE POLICY "postulaciones_admin_all" ON public.postulaciones FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.8 Historial de Postulación
CREATE POLICY "historial_postulante_select" ON public.historial_postulacion FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.postulaciones p
            WHERE p.id = historial_postulacion.postulacion_id
              AND p.postulante_id = auth.uid()
        )
    );
CREATE POLICY "historial_admin_all" ON public.historial_postulacion FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.9 Cursos y Asignaciones
CREATE POLICY "cursos_public_select" ON public.cursos FOR SELECT
    USING (activo = true OR public.is_admin());
CREATE POLICY "cursos_admin_all" ON public.cursos FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "postulante_cursos_owner_select" ON public.postulante_cursos FOR SELECT
    TO authenticated USING (postulante_id = auth.uid() OR public.is_admin());
CREATE POLICY "postulante_cursos_admin_all" ON public.postulante_cursos FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- 7. CONFIGURACIÓN DE STORAGE PARA CVs (postulantes-cvs)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'postulantes-cvs',
    'postulantes-cvs',
    false,
    10485760,
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

CREATE POLICY "cv_owner_upload" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'postulantes-cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cv_owner_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'postulantes-cvs' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'postulantes-cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cv_owner_read" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'postulantes-cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cv_municipalidad_read_all" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'postulantes-cvs' AND public.is_admin());

CREATE POLICY "cv_empresa_read_presented" ON storage.objects FOR SELECT TO authenticated
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


-- 8. PRIVILEGIOS SQL (GRANTS COMPATIBLES CON RLS Y PRIVACIDAD POR COLUMNA)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Rol anon: lectura pública de catálogo, cursos activos y exclusivamente columnas públicas de empresas aprobadas
GRANT SELECT ON public.rubros TO anon;
GRANT SELECT ON public.ofertas TO anon;
GRANT SELECT ON public.ofertas_rubros TO anon;
GRANT SELECT ON public.cursos TO anon;
REVOKE ALL ON public.empresas FROM anon;
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

-- Rol authenticated: operaciones sujetas a RLS
GRANT SELECT ON public.rubros TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.perfil TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ofertas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ofertas_rubros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_rubros TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.postulaciones TO authenticated;
GRANT SELECT, INSERT ON public.historial_postulacion TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.curriculums TO authenticated;
REVOKE DELETE ON public.curriculums FROM anon, authenticated;
GRANT SELECT ON public.cursos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.postulante_cursos TO authenticated;
GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;
REVOKE ALL ON public.vista_candidatos_empresa FROM PUBLIC, anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permisos de ejecución sobre funciones RPC
REVOKE ALL ON FUNCTION public.desactivar_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desactivar_admin(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.reactivar_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivar_admin(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.promover_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promover_admin(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.archivar_curriculum(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archivar_curriculum(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.retirar_postulacion(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retirar_postulacion(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.reactivar_postulacion(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivar_postulacion(UUID, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_contratacion_empresa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_contratacion_empresa(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.obtener_candidatos_empresa(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_candidatos_empresa(UUID) TO authenticated;
