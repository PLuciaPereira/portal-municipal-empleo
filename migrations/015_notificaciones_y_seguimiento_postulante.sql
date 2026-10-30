-- ==============================================================================
-- Migración 015: Sistema de Notificaciones Ampliado y Seguimiento de Postulantes
-- Portal de Empleo - Municipalidad de Funes
-- ==============================================================================
-- Instrucciones:
-- Esta migración debe ser ejecutada manualmente en el SQL Editor de Supabase.
-- Es completamente idempotente (puede ejecutarse múltiples veces de forma segura).
-- ==============================================================================

-- 1. Asegurar la tabla de notificaciones internas
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info', -- 'info', 'entrevista', 'invitacion', 'sistema', 'postulacion', 'empresa'
  link TEXT,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Asegurar índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida ON public.notificaciones(user_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at ON public.notificaciones(created_at DESC);

-- 2. Habilitar y ajustar RLS para notificaciones
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas previas (migración 011 y versiones intermedias)
DROP POLICY IF EXISTS "Usuarios ven sus propias notificaciones" ON public.notificaciones;
DROP POLICY IF EXISTS "Usuarios actualizan sus propias notificaciones" ON public.notificaciones;
DROP POLICY IF EXISTS "Admins insertan notificaciones" ON public.notificaciones;
DROP POLICY IF EXISTS "Usuarios y admins insertan notificaciones" ON public.notificaciones;

-- A. Lectura: Cada usuario ve exclusivamente sus notificaciones
CREATE POLICY "Usuarios ven sus propias notificaciones"
  ON public.notificaciones
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- B. Actualización: Cada usuario puede marcar como leídas sus propias notificaciones
CREATE POLICY "Usuarios actualizan sus propias notificaciones"
  ON public.notificaciones
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- C. Inserción: Usuarios autenticados (empresas, postulantes, admins) pueden generar avisos internos
CREATE POLICY "Usuarios y admins insertan notificaciones"
  ON public.notificaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permisos GRANT sobre la tabla notificaciones
GRANT SELECT, INSERT, UPDATE ON public.notificaciones TO authenticated;

-- 3. Función RPC: Marcar todas las notificaciones como leídas para el usuario actual
CREATE OR REPLACE FUNCTION public.marcar_todas_notificaciones_leidas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  UPDATE public.notificaciones
  SET leida = true
  WHERE user_id = auth.uid() AND leida = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_todas_notificaciones_leidas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_todas_notificaciones_leidas() TO authenticated;

-- 4. Función RPC: Obtener el historial completo de postulaciones de un postulante (exclusivo Admin)
CREATE OR REPLACE FUNCTION public.obtener_historial_postulante_admin(p_postulante_id UUID)
RETURNS TABLE (
  postulacion_id UUID,
  oferta_id UUID,
  oferta_titulo TEXT,
  empresa_id UUID,
  empresa_nombre TEXT,
  empresa_localidad TEXT,
  estado public.application_status,
  mensaje_postulante TEXT,
  notas_oficina_empleo TEXT,
  fecha_derivacion TIMESTAMPTZ,
  fecha_entrevista TIMESTAMPTZ,
  modalidad_entrevista TEXT,
  lugar_entrevista TEXT,
  motivo_rechazo_empresa TEXT,
  fecha_rechazo_empresa TIMESTAMPTZ,
  fecha_respuesta_empresa TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden consultar el historial completo.';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS postulacion_id,
    p.oferta_id,
    o.titulo AS oferta_titulo,
    e.id AS empresa_id,
    COALESCE(e.nombre_fantasia, e.razon_social, 'Empresa') AS empresa_nombre,
    e.localidad AS empresa_localidad,
    p.estado,
    p.mensaje_postulante,
    p.notas_oficina_empleo,
    p.fecha_derivacion,
    p.fecha_entrevista,
    p.modalidad_entrevista,
    p.lugar_entrevista,
    p.motivo_rechazo_empresa,
    p.fecha_rechazo_empresa,
    p.fecha_respuesta_empresa,
    p.created_at,
    p.updated_at
  FROM public.postulaciones p
  JOIN public.ofertas o ON p.oferta_id = o.id
  JOIN public.empresas e ON o.empresa_id = e.id
  WHERE p.postulante_id = p_postulante_id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_historial_postulante_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_historial_postulante_admin(UUID) TO authenticated;

-- 5. Registrar migración en _schema_migrations si existe la tabla
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_schema_migrations') THEN
    INSERT INTO public._schema_migrations (version, name, applied_at)
    VALUES ('015', '015_notificaciones_y_seguimiento_postulante', now())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
