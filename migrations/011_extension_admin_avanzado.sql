-- ==============================================================================
-- Migración 011: Extensiones avanzadas del panel de administración municipal
-- Portal Municipal de Empleo de Funes
-- ==============================================================================

-- 1. Agregar campos de foto de perfil y marca de registro asistido en perfil
ALTER TABLE public.perfil 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS registro_asistido BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS creado_por_admin UUID REFERENCES public.perfil(id);

-- 2. Agregar campos para coordinación formal de entrevistas en postulaciones
ALTER TABLE public.postulaciones
  ADD COLUMN IF NOT EXISTS fecha_entrevista TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS modalidad_entrevista TEXT, -- 'presencial', 'virtual', 'telefonica'
  ADD COLUMN IF NOT EXISTS lugar_entrevista TEXT,
  ADD COLUMN IF NOT EXISTS entrevistador TEXT;

-- 3. Crear tabla de notificaciones internas para el portal
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info', -- 'info', 'entrevista', 'invitacion', 'sistema'
  link TEXT,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida ON public.notificaciones(user_id, leida);

-- RLS para Notificaciones
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus propias notificaciones" ON public.notificaciones;
CREATE POLICY "Usuarios ven sus propias notificaciones"
  ON public.notificaciones
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios actualizan sus propias notificaciones" ON public.notificaciones;
CREATE POLICY "Usuarios actualizan sus propias notificaciones"
  ON public.notificaciones
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins insertan notificaciones" ON public.notificaciones;
CREATE POLICY "Admins insertan notificaciones"
  ON public.notificaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfil
      WHERE id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- Comentarios explicativos
COMMENT ON COLUMN public.perfil.registro_asistido IS 'Indica si el legajo fue registrado presencialmente por la Oficina de Empleo para personas con barreras digitales';
COMMENT ON COLUMN public.postulaciones.fecha_entrevista IS 'Fecha y hora coordinada para la entrevista preliminar municipal';
COMMENT ON TABLE public.notificaciones IS 'Notificaciones internas y avisos para postulantes, empresas y administradores';
