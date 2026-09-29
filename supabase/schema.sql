-- ==============================================================================
-- PORTAL DE EMPLEO DE FUNES - ESQUEMA DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Este script define la estructura de tablas, enumeraciones, funciones,
-- triggers y políticas de seguridad por fila (RLS) para el Portal de Empleo Funes.
-- Garantiza la privacidad estricta de postulantes y la intermediación obligatoria
-- de la Oficina de Empleo.
-- ==============================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Definición de tipos y estados
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('postulante', 'empresa', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'borrador',
        'pendiente_revision',
        'publicada',
        'pausada',
        'finalizada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM (
        'postulado',
        'en_revision',
        'preseleccionado',
        'entrevista',
        'presentado_a_empresa',
        'seleccionado',
        'no_seleccionado',
        'contratado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabla: rubros (categorías de empleo)
CREATE TABLE IF NOT EXISTS public.rubros (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla: profiles (perfiles de usuarios vinculados a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'postulante',
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT,
    dni TEXT UNIQUE,
    telefono TEXT,
    fecha_nacimiento DATE,
    direccion TEXT,
    barrio TEXT,
    es_residente_funes BOOLEAN DEFAULT true NOT NULL,
    nivel_educativo TEXT,
    situacion_laboral_actual TEXT,
    habilidades TEXT[],
    experiencia_resumen TEXT,
    cv_url TEXT,
    disponibilidad_horaria TEXT,
    movilidad_propia BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla: companies (datos de empresas)
CREATE TABLE IF NOT EXISTS public.companies (
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
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla: jobs (ofertas laborales)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    rubro_id INTEGER REFERENCES public.rubros(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    requisitos TEXT NOT NULL,
    experiencia_requerida TEXT,
    tipo_jornada TEXT NOT NULL, -- ej: Completa, Media jornada, Turnos rotativos
    tipo_contrato TEXT,         -- ej: Indeterminado, Temporal, Pasantía
    ubicacion TEXT DEFAULT 'Funes, Santa Fe' NOT NULL,
    rango_salarial TEXT,
    vacantes INTEGER DEFAULT 1 NOT NULL,
    estado job_status DEFAULT 'pendiente_revision' NOT NULL,
    destacada BOOLEAN DEFAULT false NOT NULL,
    fecha_limite DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabla: applications (postulaciones de candidatos a ofertas)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    postulante_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    estado application_status DEFAULT 'postulado' NOT NULL,
    mensaje_postulante TEXT,
    notas_oficina_empleo TEXT, -- Notas confidenciales de los administradores
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_postulacion_usuario_oferta UNIQUE (job_id, postulante_id)
);

-- 8. Tabla: application_history (historial de cambios de estado en las postulaciones)
CREATE TABLE IF NOT EXISTS public.application_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    estado_anterior application_status,
    estado_nuevo application_status NOT NULL,
    cambiado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabla: follow_ups (seguimiento post-contratación y capacitaciones)
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulante_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    fecha_seguimiento DATE DEFAULT CURRENT_DATE NOT NULL,
    estado_laboral TEXT NOT NULL, -- ej: 'En actividad', 'Periodo de prueba', 'Desvinculado'
    observaciones TEXT NOT NULL,
    detecto_necesidad_capacitacion BOOLEAN DEFAULT false NOT NULL,
    capacitacion_sugerida TEXT,
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- FUNCIONES AUXILIARES Y TRIGGERS
-- ==============================================================================

-- Función para actualizar columna updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de actualización de updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_jobs_updated_at ON public.jobs;
CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.applications;
CREATE TRIGGER trigger_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Función y trigger para registrar cambios de estado en application_history
CREATE OR REPLACE FUNCTION public.track_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO public.application_history (
            application_id,
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_application_status ON public.applications;
CREATE TRIGGER trigger_track_application_status
    AFTER UPDATE OF estado ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.track_application_status_change();

-- Trigger inicial al insertar postulación
CREATE OR REPLACE FUNCTION public.record_initial_application_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.application_history (
        application_id,
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_initial_application ON public.applications;
CREATE TRIGGER trigger_record_initial_application
    AFTER INSERT ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.record_initial_application_status();

-- Funciones de validación de roles en RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT id FROM public.companies
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

-- Trigger para crear perfil automáticamente al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val user_role;
BEGIN
    user_role_val := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'postulante'::user_role
    );

    INSERT INTO public.profiles (
        id,
        email,
        role,
        nombre,
        apellido,
        dni,
        telefono
    ) VALUES (
        NEW.id,
        NEW.email,
        user_role_val,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
        NEW.raw_user_meta_data->>'apellido',
        NEW.raw_user_meta_data->>'dni',
        NEW.raw_user_meta_data->>'telefono'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD POR FILA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE public.rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Políticas: rubros (Público puede leer, solo admin puede modificar)
-- ------------------------------------------------------------------------------
CREATE POLICY "rubros_public_select"
    ON public.rubros FOR SELECT
    USING (true);

CREATE POLICY "rubros_admin_all"
    ON public.rubros FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- Políticas: profiles
-- 1. Postulante puede ver y editar su propio perfil.
-- 2. Administrador tiene acceso total a todos los perfiles.
-- 3. Empresa SOLO puede ver postulantes presentados a sus ofertas (PROTECCIÓN DE DATOS).
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_owner_select"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "profiles_owner_update"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "profiles_company_select_presented"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            JOIN public.jobs j ON a.job_id = j.id
            WHERE a.postulante_id = profiles.id
              AND j.company_id = public.get_user_company_id()
              AND a.estado IN ('presentado_a_empresa', 'seleccionado', 'contratado')
        )
    );

-- ------------------------------------------------------------------------------
-- Políticas: companies
-- 1. Empresa puede ver y editar su propio registro.
-- 2. Cualquiera puede ver datos básicos de empresas con ofertas publicadas.
-- 3. Admin tiene control total.
-- ------------------------------------------------------------------------------
CREATE POLICY "companies_public_select"
    ON public.companies FOR SELECT
    USING (
        verificada = true OR
        user_id = auth.uid() OR
        public.is_admin()
    );

CREATE POLICY "companies_owner_insert"
    ON public.companies FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_owner_update"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_admin_all"
    ON public.companies FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- Políticas: jobs (ofertas laborales)
-- 1. Toda persona (incluso no autenticada) puede ver ofertas publicadas.
-- 2. Las empresas pueden gestionar sus propias ofertas.
-- 3. Los administradores pueden gestionar todas las ofertas.
-- ------------------------------------------------------------------------------
CREATE POLICY "jobs_public_select_published"
    ON public.jobs FOR SELECT
    USING (
        estado = 'publicada' OR
        company_id = public.get_user_company_id() OR
        public.is_admin()
    );

CREATE POLICY "jobs_company_insert"
    ON public.jobs FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_user_company_id()
    );

CREATE POLICY "jobs_company_update"
    ON public.jobs FOR UPDATE
    TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "jobs_admin_all"
    ON public.jobs FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- Políticas: applications (postulaciones)
-- 1. Postulante puede crear postulación y ver solo las suyas.
-- 2. Empresa solo ve postulaciones en estados presentados/seleccionados/contratados de sus ofertas.
-- 3. Admin tiene control y visión total.
-- ------------------------------------------------------------------------------
CREATE POLICY "applications_postulante_select"
    ON public.applications FOR SELECT
    TO authenticated
    USING (postulante_id = auth.uid());

CREATE POLICY "applications_postulante_insert"
    ON public.applications FOR INSERT
    TO authenticated
    WITH CHECK (
        postulante_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE id = job_id AND estado = 'publicada'
        )
    );

CREATE POLICY "applications_company_select"
    ON public.applications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = applications.job_id
              AND j.company_id = public.get_user_company_id()
        ) AND
        estado IN ('presentado_a_empresa', 'seleccionado', 'contratado')
    );

CREATE POLICY "applications_admin_all"
    ON public.applications FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- Políticas: application_history
-- ------------------------------------------------------------------------------
CREATE POLICY "history_postulante_select"
    ON public.application_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = application_history.application_id
              AND a.postulante_id = auth.uid()
        )
    );

CREATE POLICY "history_admin_all"
    ON public.application_history FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- Políticas: follow_ups (Seguimientos)
-- Solo la Oficina de Empleo (administradores) accede a este módulo confidencial.
-- ------------------------------------------------------------------------------
CREATE POLICY "follow_ups_admin_all"
    ON public.follow_ups FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- DATOS INICIALES (SEED DATA - RUBROS TÍPICOS DE FUNES)
-- ==============================================================================
INSERT INTO public.rubros (nombre, descripcion) VALUES
    ('Comercio y Atención al Cliente', 'Ventas, atención al público, cajeros, repositores y afines'),
    ('Gastronomía y Hotelería', 'Cocineros, ayudantes de cocina, mozos, bacheros, recepción'),
    ('Construcción y Mantenimiento', 'Albañilería, electricidad, plomería, pintura, mantenimiento en general'),
    ('Administración y Contabilidad', 'Secretaría, facturación, recursos humanos, administración general'),
    ('Logística y Distribución', 'Choferes, repartidores, operarios de depósito, expedición'),
    ('Salud y Cuidados', 'Enfermería, cuidadores de adultos mayores, niñeras, asistentes terapéuticos'),
    ('Tecnología e Informática', 'Soporte técnico, desarrollo web, redes, marketing digital'),
    ('Educación y Capacitación', 'Docencia, apoyo escolar, profesores de idiomas, talleres'),
    ('Jardinería y Parquizaciones', 'Mantenimiento de espacios verdes, pileteros, paisajismo'),
    ('Oficios y Servicios Varios', 'Costura, mecánica, herrería, carpintería y otros oficios')
ON CONFLICT (nombre) DO NOTHING;
