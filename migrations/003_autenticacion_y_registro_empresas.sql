-- ==============================================================================
-- MIGRACIÓN 003: AUTENTICACIÓN Y REGISTRO AUTOMÁTICO DE EMPRESAS
-- ==============================================================================
-- Portal de Empleo Funes
-- Esta migración complementa la Fase 3 del plan de implementación:
-- 1. Actualiza la función handle_new_user() con search_path seguro (SECURITY DEFINER).
-- 2. Soporta el alta atómica de registros en public.empresas cuando un usuario
--    se registra con rol 'empresa' y envía sus metadatos correspondientes (CUIT,
--    razón social, contacto, etc.).
-- 3. Garantiza que toda nueva empresa quede en estado 'pendiente' y no verificada,
--    en estricto cumplimiento de los requerimientos de intermediación de la Oficina
--    de Empleo Municipal.
-- 4. Valida preventivamente la unicidad de DNI y CUIT para emitir mensajes claros.
-- ==============================================================================

-- 1. ACTUALIZAR TRIGGER FUNCTION handle_new_user()
-- ------------------------------------------------------------------------------
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
BEGIN
    requested_role := NEW.raw_user_meta_data->>'rol';
    IF requested_role IS NULL THEN
        requested_role := NEW.raw_user_meta_data->>'role';
    END IF;

    -- Solo se permite 'postulante' o 'empresa' desde el registro público.
    -- El rol municipal/admin únicamente puede asignarse de forma interna/administrativa.
    IF requested_role = 'empresa' THEN
        final_role := 'empresa'::public.user_role;
    ELSE
        final_role := 'postulante'::public.user_role;
    END IF;

    -- Validación preventiva de DNI duplicado
    v_dni := trim(NEW.raw_user_meta_data->>'dni');
    IF v_dni IS NOT NULL AND length(v_dni) > 0 THEN
        IF EXISTS (SELECT 1 FROM public.perfil WHERE dni = v_dni AND id <> NEW.id) THEN
            RAISE EXCEPTION 'El DNI ingresado ya se encuentra registrado en el sistema.';
        END IF;
    END IF;

    -- A. Inserción del perfil del usuario (idempotente)
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
        COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''), 'Usuario'),
        NULLIF(trim(NEW.raw_user_meta_data->>'apellido'), ''),
        NULLIF(v_dni, ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'telefono'), ''),
        COALESCE((NEW.raw_user_meta_data->>'es_residente_funes')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;

    -- B. Si el rol es 'empresa', crear el registro en public.empresas si se proveyeron datos
    IF final_role = 'empresa' THEN
        v_cuit := trim(NEW.raw_user_meta_data->>'cuit');
        v_razon_social := trim(NEW.raw_user_meta_data->>'razon_social');
        v_nombre_fantasia := COALESCE(
            NULLIF(trim(NEW.raw_user_meta_data->>'nombre_fantasia'), ''),
            NULLIF(v_razon_social, ''),
            'Empresa'
        );

        -- Validación preventiva de CUIT duplicado
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
                COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'direccion'), ''), 'Funes'),
                COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'localidad'), ''), 'Funes'),
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

-- Asegurar reasociación del trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. REGISTRO EN CONTROL DE MIGRACIONES
-- ------------------------------------------------------------------------------
INSERT INTO public._schema_migrations (version, name)
VALUES ('003', '003_autenticacion_y_registro_empresas')
ON CONFLICT (version) DO NOTHING;
