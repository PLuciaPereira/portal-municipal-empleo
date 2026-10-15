-- ==============================================================================
-- MIGRACIÓN 004: PERMISOS, DOMICILIO, ROLES Y DERIVACIONES
-- ==============================================================================
-- Portal de Empleo Funes
-- Estado: PENDIENTE DE EJECUCIÓN MANUAL POR LA USUARIA
-- 
-- Contenido de la migración:
-- 1. Concesión de privilegios GRANT mínimos compatibles con RLS (Solución Error 42501).
-- 2. Domicilio: Consolidación de direccion y localidad en public.perfil (sin barrio).
-- 3. Normalización y verificación de DNI solo numérico en public.perfil.
-- 4. Roles: Unificación del rol administrativo canónico en 'admin' y retiro de superadmin.
-- 5. Trigger de seguridad: Impide que un administrador desactive su propia cuenta.
-- 6. Funciones de gestión de administradores entre pares (desactivar, reactivar, promover).
-- 7. Borrado lógico de CVs: Retiro de política física DELETE sobre public.curriculums.
-- 8. Derivaciones a Empresas: Función responder_candidato_empresa ('contratado' o 'rechazado').
-- 9. Vista segura de candidatos adaptada al flujo de derivaciones (sin barrio).
-- 10. Retiro seguro de la tabla seguimiento (verificado: 0 registros históricos).
-- 11. Actualización atómica de handle_new_user() (sin barrio, DNI numérico).
-- 12. Registro en control de migraciones (_schema_migrations).
-- ==============================================================================

-- ==============================================================================
-- 1. CONCESIÓN DE PRIVILEGIOS GRANT MÍNIMOS (COMPATIBLES CON RLS)
-- ==============================================================================

-- Esquema public accesible para los roles de PostgREST
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Rol anon (Visitantes no autenticados)
-- Solo lectura de rubros activos y ofertas de empleo publicadas (sujeto a RLS)
GRANT SELECT ON public.rubros TO anon;
GRANT SELECT ON public.ofertas TO anon;
GRANT SELECT ON public.ofertas_rubros TO anon;

-- Rol authenticated (Usuarios registrados: postulantes, empresas, administradores)
-- Todos los accesos a filas quedan estrictamente restringidos por las políticas RLS existentes
GRANT SELECT ON public.rubros TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.perfil TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ofertas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ofertas_rubros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_rubros TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.postulaciones TO authenticated;
GRANT SELECT, INSERT ON public.historial_postulacion TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.curriculums TO authenticated; -- SIN DELETE físico
GRANT SELECT ON public.cursos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.postulante_cursos TO authenticated;
GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;

-- Permisos sobre secuencias (para autoincrementales como rubros_id_seq)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==============================================================================
-- 2. DOMICILIO EN PERFILES: DIRECCIÓN Y LOCALIDAD (DESCARTE DE BARRIO)
-- ==============================================================================

-- Asegurar disponibilidad de columnas direccion y localidad en public.perfil
ALTER TABLE public.perfil ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.perfil ADD COLUMN IF NOT EXISTS localidad TEXT;

-- Remover default restrictivo 'Funes' para permitir que postulantes de otras localidades
-- registren su localidad real sin falsear procedencia
ALTER TABLE public.perfil ALTER COLUMN localidad DROP DEFAULT;

-- Si por alguna razón la columna barrio fue creada manualmente en alguna instancia,
-- eliminarla de forma segura
ALTER TABLE public.perfil DROP COLUMN IF EXISTS barrio;

-- Saneamiento: calcular es_residente_funes de manera consistente a partir de localidad para postulantes
UPDATE public.perfil
SET es_residente_funes = (LOWER(TRIM(localidad)) = 'funes')
WHERE rol = 'postulante' AND localidad IS NOT NULL;

-- ==============================================================================
-- 3. NORMALIZACIÓN Y VERIFICACIÓN DE DNI EN PERFILES
-- ==============================================================================

-- Normalizar DNIs preexistentes a solo dígitos numéricos (removiendo puntos, guiones y espacios)
UPDATE public.perfil
SET dni = regexp_replace(dni, '\D', '', 'g')
WHERE dni IS NOT NULL AND dni ~ '\D';

-- Crear índice funcional único sobre los dígitos del DNI (solo para DNIs no nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfil_dni_numerico_unico
ON public.perfil ((regexp_replace(dni, '\D', '', 'g')))
WHERE dni IS NOT NULL AND length(dni) > 0;

-- ==============================================================================
-- 4. UNIFICACIÓN DEL ROL ADMINISTRATIVO CANÓNICO ('admin')
-- ==============================================================================

-- Migrar cualquier usuario con rol histórico 'municipalidad' al rol canónico 'admin'
UPDATE public.perfil
SET rol = 'admin'::public.user_role
WHERE rol::text = 'municipalidad';

-- Retirar restricciones y triggers obsoletos de superadmin creados en la migración 002
DROP TRIGGER IF EXISTS trigger_validate_perfil_admin_changes ON public.perfil;
DROP FUNCTION IF EXISTS public.validate_perfil_admin_changes();
DROP FUNCTION IF EXISTS public.transferir_superadmin(UUID);
DROP FUNCTION IF EXISTS public.quitar_rol_admin(UUID);

ALTER TABLE public.perfil DROP CONSTRAINT IF EXISTS check_superadmin_es_admin;
DROP INDEX IF EXISTS public.idx_perfil_unico_superadmin_activo;

-- Función is_admin() simplificada: verifica rol = 'admin' y cuenta activa
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
          AND rol::text = 'admin'
    );
$$;

-- Descartar función is_superadmin() si existe
DROP FUNCTION IF EXISTS public.is_superadmin();

-- ==============================================================================
-- 5. REGLAS DE SEGURIDAD: CONTROL DE ADMINISTRADORES Y AUTO-DESACTIVACIÓN
-- ==============================================================================

-- Trigger para impedir auto-desactivación de administradores y auto-asignación no autorizada
CREATE OR REPLACE FUNCTION public.check_admin_self_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- 1. Un usuario no puede auto-asignarse rol admin desde la API
    IF TG_OP = 'INSERT' THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND NEW.rol::text = 'admin' THEN
            RAISE EXCEPTION 'Operación denegada: Solo un administrador puede dar de alta a otro administrador.';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 2. Si un usuario no-admin intenta cambiarse el rol a admin
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND NEW.rol::text = 'admin' AND OLD.rol::text <> 'admin' THEN
            RAISE EXCEPTION 'Operación denegada: No tiene permisos para asignarse rol administrativo.';
        END IF;
        -- 3. Un administrador NO puede desactivarse o eliminarse lógicamente a sí mismo
        IF OLD.rol::text = 'admin' AND (NEW.activo = false OR NEW.deleted_at IS NOT NULL) AND OLD.id = auth.uid() THEN
            RAISE EXCEPTION 'Operación denegada: Un administrador no puede desactivar ni eliminar su propia cuenta.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_admin_self_deactivation ON public.perfil;
CREATE TRIGGER trigger_check_admin_self_deactivation
    BEFORE INSERT OR UPDATE ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.check_admin_self_deactivation();

-- ==============================================================================
-- 6. FUNCIONES DE GESTIÓN DE ADMINISTRADORES (ENTRE PARES)
-- ==============================================================================

-- Desactivar administrador (baja lógica por otro administrador)
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

-- Reactivar administrador previamente desactivado
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

-- Promover usuario existente a administrador
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

GRANT EXECUTE ON FUNCTION public.desactivar_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivar_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promover_admin(UUID) TO authenticated;

-- ==============================================================================
-- 7. BORRADO LÓGICO DE CVs: RETIRO DE POLÍTICA FÍSICA DELETE
-- ==============================================================================

-- Remover política que permitía eliminación física directa de CVs
DROP POLICY IF EXISTS "curriculums_owner_delete" ON public.curriculums;

-- Política de actualización para permitir archivado lógico por el propietario
DROP POLICY IF EXISTS "curriculums_owner_update" ON public.curriculums;
CREATE POLICY "curriculums_owner_update" ON public.curriculums FOR UPDATE
    TO authenticated
    USING (postulante_id = auth.uid() OR public.is_admin())
    WITH CHECK (postulante_id = auth.uid() OR public.is_admin());

-- Revocar DELETE explícitamente en la tabla curriculums para authenticated y anon
REVOKE DELETE ON public.curriculums FROM anon, authenticated;

-- ==============================================================================
-- 8. DERIVACIONES A EMPRESAS: DECISIÓN FINAL ('contratado' O 'rechazado')
-- ==============================================================================

-- Asegurar columnas de respuesta en postulaciones
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS motivo_rechazo_empresa TEXT;
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS fecha_rechazo_empresa TIMESTAMPTZ;
ALTER TABLE public.postulaciones ADD COLUMN IF NOT EXISTS fecha_respuesta_empresa TIMESTAMPTZ;

-- Función RPC para registrar la decisión final de la empresa sobre un candidato derivado
CREATE OR REPLACE FUNCTION public.responder_candidato_empresa(
    p_postulacion_id UUID,
    p_decision TEXT, -- 'contratado' o 'rechazado'
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

    -- Validar decisión estricta: solo 'contratado' o 'rechazado'
    IF p_decision NOT IN ('contratado', 'rechazado') THEN
        RAISE EXCEPTION 'Decisión inválida. Los únicos resultados permitidos son "contratado" o "rechazado".';
    END IF;

    -- Si rechaza, el motivo es obligatorio
    IF p_decision = 'rechazado' AND (p_motivo_rechazo IS NULL OR length(trim(p_motivo_rechazo)) = 0) THEN
        RAISE EXCEPTION 'El motivo de rechazo es obligatorio para registrar la decisión.';
    END IF;

    -- Identificar la empresa del usuario autenticado
    SELECT id INTO v_empresa_id
    FROM public.empresas
    WHERE user_id = auth.uid() AND (estado = 'aprobada' OR verificada = true);

    IF v_empresa_id IS NULL AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No posee permisos de empresa activa para gestionar postulaciones.';
    END IF;

    -- Obtener la postulación y verificar pertenencia a una oferta de la empresa
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

    -- Solo se puede responder sobre postulaciones presentadas a la empresa o en revisión derivada
    IF v_estado_actual::text NOT IN ('presentado_a_empresa', 'seleccionado') THEN
        RAISE EXCEPTION 'Solo se puede registrar resultado sobre candidatos derivados en estado presentado_a_empresa.';
    END IF;

    -- Aplicar resultado
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

REVOKE ALL ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_candidato_empresa(UUID, TEXT, TEXT) TO authenticated;

-- ==============================================================================
-- 9. VISTA SEGURA DE CANDIDATOS PARA EMPRESAS (SIN BARRIO, SOLO DERIVADOS)
-- ==============================================================================

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
    p.fecha_rechazo_empresa,
    p.fecha_respuesta_empresa
FROM public.postulaciones p
JOIN public.ofertas o ON p.oferta_id = o.id
JOIN public.perfil per ON p.postulante_id = per.id
LEFT JOIN public.curriculums cv ON p.cv_id = cv.id
JOIN public.empresas emp ON o.empresa_id = emp.id
WHERE p.estado IN ('presentado_a_empresa', 'seleccionado', 'contratado', 'rechazado_por_empresa')
  AND (
      emp.user_id = auth.uid()
      OR public.is_admin()
  );

GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;
REVOKE ALL ON public.vista_candidatos_empresa FROM anon;

-- ==============================================================================
-- 10. RETIRO SEGURO DE TABLA seguimiento (VERIFICADO: 0 REGISTROS HISTÓRICOS)
-- ==============================================================================

DROP POLICY IF EXISTS "follow_ups_admin_all" ON public.seguimiento;
DROP POLICY IF EXISTS "seguimiento_admin_all" ON public.seguimiento;
DROP TABLE IF EXISTS public.seguimiento CASCADE;

-- ==============================================================================
-- 11. TRIGGER ATÓMICO DE NUEVOS USUARIOS (handle_new_user)
-- ==============================================================================

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

    -- Solo se permite 'postulante' o 'empresa' desde el registro público
    IF requested_role = 'empresa' THEN
        final_role := 'empresa'::public.user_role;
    ELSE
        final_role := 'postulante'::public.user_role;
    END IF;

    -- A. Normalización y validación preventiva de DNI numérico
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

    -- B. Normalización de Dirección y Localidad
    v_direccion := NULLIF(trim(NEW.raw_user_meta_data->>'direccion'), '');
    v_localidad := NULLIF(trim(NEW.raw_user_meta_data->>'localidad'), '');

    -- C. Cálculo derivado de residencia en Funes
    IF v_localidad IS NOT NULL AND lower(trim(v_localidad)) = 'funes' THEN
        v_es_residente := true;
    ELSE
        v_es_residente := false;
    END IF;

    -- D. Inserción atómica en public.perfil (SIN COLUMNA BARRIO)
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

    -- E. Si el rol es 'empresa', crear atómicamente el registro en public.empresas
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

-- ==============================================================================
-- 12. REGISTRO EN CONTROL DE MIGRACIONES
-- ==============================================================================

INSERT INTO public._schema_migrations (version, name)
VALUES ('004', '004_permisos_domicilio_roles_y_derivaciones')
ON CONFLICT (version) DO UPDATE SET 
    name = EXCLUDED.name,
    applied_at = timezone('utc'::text, now());
