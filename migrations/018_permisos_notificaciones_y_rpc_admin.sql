-- ==============================================================================
-- Migración 018: Permisos de Notificaciones y Función RPC Notificar Administradores
-- Portal de Empleo - Municipalidad de Funes
-- ==============================================================================
-- Instrucciones:
-- Copiar y ejecutar este script en el SQL Editor de Supabase.
--
-- Contenido y Justificación Técnica:
-- 1. Otorga permisos explícitos de SELECT, INSERT y UPDATE sobre public.notificaciones
--    a los roles 'authenticated', 'service_role' y 'postgres'.
-- 2. Asegura la política RLS de inserción para que tanto los usuarios autenticados
--    como las operaciones de sistema (service_role) puedan generar notificaciones.
-- 3. Crea la función RPC public.notificar_administradores(p_titulo, p_mensaje, p_tipo, p_link)
--    con privilegios SECURITY DEFINER para que la inserción de avisos dirigidos a administradores
--    se ejecute de forma directa, atómica y segura sin verse truncada por restricciones de RLS.
-- ==============================================================================

BEGIN;

-- 1. Permisos GRANT sobre la tabla notificaciones y sus secuencias
GRANT ALL ON TABLE public.notificaciones TO service_role, postgres;
GRANT SELECT, INSERT, UPDATE ON public.notificaciones TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 2. Ajuste de RLS en inserción de notificaciones
DROP POLICY IF EXISTS "Admins insertan notificaciones" ON public.notificaciones;
DROP POLICY IF EXISTS "Usuarios y admins insertan notificaciones" ON public.notificaciones;
DROP POLICY IF EXISTS "Insercion autorizada de notificaciones" ON public.notificaciones;

CREATE POLICY "Insercion autorizada de notificaciones"
  ON public.notificaciones
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- 3. Función RPC SECURITY DEFINER para despachar avisos al equipo de administradores
CREATE OR REPLACE FUNCTION public.notificar_administradores(
    p_titulo TEXT,
    p_mensaje TEXT,
    p_tipo TEXT DEFAULT 'sistema',
    p_link TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, tipo, link, leida)
    SELECT id, p_titulo, p_mensaje, p_tipo, p_link, false
    FROM public.perfil
    WHERE rol = 'admin' AND activo = true AND deleted_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_administradores(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar_administradores(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 4. Registrar migración en _schema_migrations si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_schema_migrations') THEN
    INSERT INTO public._schema_migrations (version, name, applied_at)
    VALUES ('018', '018_permisos_notificaciones_y_rpc_admin', now())
    ON CONFLICT (version) DO UPDATE
    SET applied_at = timezone('utc'::text, now()),
        name = EXCLUDED.name;
  END IF;
END $$;

COMMIT;
