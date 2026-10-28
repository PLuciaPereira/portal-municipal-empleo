-- ==============================================================================
-- Migración 012: Mejoras funcionales de Panel Postulante y Panel Empresa
-- Portal Municipal de Empleo de Funes
-- ==============================================================================

-- 1. Ampliar tabla empresas para admitir logo comercial y múltiples documentos de validación
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS documentos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.empresas.logo_url IS 'URL o path al logotipo institucional de la empresa en Supabase Storage (bucket avatars)';
COMMENT ON COLUMN public.empresas.documentos IS 'Colección JSONB de documentos adjuntos para validación (CUIT, habilitación, contrato, etc.)';

-- 2. Asegurar que las ofertas tengan fecha_limite configurada por defecto a 30 días si es nula
-- Función trigger para asignar 30 días automáticamente si no se especifica fecha_limite
CREATE OR REPLACE FUNCTION public.set_default_fecha_limite_oferta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_limite IS NULL THEN
    NEW.fecha_limite := (CURRENT_DATE + INTERVAL '30 days')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_default_fecha_limite_oferta ON public.ofertas;
CREATE TRIGGER trg_set_default_fecha_limite_oferta
  BEFORE INSERT ON public.ofertas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_fecha_limite_oferta();

-- 3. Función RPC segura para que la empresa pueda renovar una oferta por 30 días corridos
CREATE OR REPLACE FUNCTION public.renovar_oferta_empresa(p_oferta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_empresa_id UUID;
  v_oferta_record RECORD;
  v_nueva_fecha DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- Obtener la empresa del usuario
  SELECT id INTO v_empresa_id FROM public.empresas WHERE user_id = v_user_id LIMIT 1;
  IF v_empresa_id IS NULL THEN
    -- Verificar si es admin
    IF NOT EXISTS (SELECT 1 FROM public.perfil WHERE id = v_user_id AND rol = 'admin' AND activo = true) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Empresa no encontrada o no autorizada');
    END IF;
  END IF;

  -- Obtener y validar la oferta
  SELECT * INTO v_oferta_record FROM public.ofertas WHERE id = p_oferta_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oferta no encontrada');
  END IF;

  -- Si no es admin, validar que la oferta pertenezca a la empresa
  IF v_empresa_id IS NOT NULL AND v_oferta_record.empresa_id <> v_empresa_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para renovar esta oferta');
  END IF;

  -- Calcular nueva fecha: si la fecha límite actual es futura, sumamos 30 días a esa fecha; si ya venció o es hoy, sumamos 30 días desde hoy
  IF v_oferta_record.fecha_limite IS NOT NULL AND v_oferta_record.fecha_limite > CURRENT_DATE THEN
    v_nueva_fecha := (v_oferta_record.fecha_limite + INTERVAL '30 days')::date;
  ELSE
    v_nueva_fecha := (CURRENT_DATE + INTERVAL '30 days')::date;
  END IF;

  -- Actualizar oferta
  UPDATE public.ofertas
  SET 
    fecha_limite = v_nueva_fecha,
    estado = CASE WHEN estado IN ('finalizada', 'pausada') THEN 'publicada' ELSE estado END,
    deleted_at = NULL,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object(
    'success', true, 
    'nueva_fecha_limite', v_nueva_fecha,
    'mensaje', 'Oferta renovada exitosamente por 30 días'
  );
END;
$$;

-- 4. DESVINCULACIÓN PREVIA Y RECREACIÓN LIMPIA DE VISTA Y POLÍTICA DE STORAGE
-- ==============================================================================
-- Se elimina primero la política de storage que depende de la vista para evitar el error 2BP01
DROP POLICY IF EXISTS "cv_empresa_read_presented" ON storage.objects;
DROP VIEW IF EXISTS public.vista_candidatos_empresa CASCADE;

-- Recreación canónica de la vista incorporando avatar_url y columnas de contacto
CREATE VIEW public.vista_candidatos_empresa
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
    per.avatar_url AS postulante_avatar_url,
    -- Datos de contacto sensibles solo expuestos durante derivación o procesos activos
    CASE 
        WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista') THEN per.dni
        ELSE NULL
    END AS dni,
    CASE 
        WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista') THEN per.telefono
        ELSE NULL
    END AS telefono,
    CASE 
        WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista') THEN u.email
        ELSE NULL
    END AS email,
    CASE 
        WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista') THEN per.direccion
        ELSE NULL
    END AS direccion,
    COALESCE(
        per.localidad,
        CASE WHEN per.es_residente_funes THEN 'Funes' ELSE 'Otra localidad' END
    ) AS localidad,
    per.nivel_educativo,
    per.habilidades,
    per.experiencia_resumen AS resumen_laboral,
    p.cv_id,
    CASE 
        WHEN p.estado::text IN ('presentado_a_empresa', 'entrevista') THEN COALESCE(p.cv_url_snapshot, cv.archivo_url, per.cv_url)
        ELSE NULL
    END AS cv_url,
    COALESCE(cv.nombre_cv, 'Currículum Vitae') AS cv_nombre,
    p.estado AS estado_postulacion,
    p.created_at AS fecha_postulacion,
    p.fecha_derivacion,
    p.fecha_entrevista,
    p.modalidad_entrevista,
    p.lugar_entrevista,
    p.entrevistador,
    p.motivo_rechazo_empresa,
    p.fecha_rechazo_empresa,
    p.fecha_respuesta_empresa
FROM public.postulaciones p
JOIN public.ofertas o ON p.oferta_id = o.id
JOIN public.empresas emp ON o.empresa_id = emp.id
JOIN public.perfil per ON p.postulante_id = per.id
LEFT JOIN auth.users u ON per.id = u.id
LEFT JOIN public.curriculums cv ON p.cv_id = cv.id
WHERE
    p.estado::text IN (
        'presentado_a_empresa',
        'entrevista',
        'seleccionado',
        'rechazado_por_empresa',
        'contratado'
    )
    AND (
        (emp.user_id = auth.uid() AND emp.estado = 'aprobada')
        OR EXISTS (SELECT 1 FROM public.perfil WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
        OR current_user = 'postgres'
    );

REVOKE ALL ON public.vista_candidatos_empresa FROM PUBLIC, anon;
GRANT SELECT ON public.vista_candidatos_empresa TO authenticated;

-- Recreación inmediata de la política de Storage sobre la vista recreada
CREATE POLICY "cv_empresa_read_presented"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'postulantes-cvs' AND
        EXISTS (
            SELECT 1 FROM public.vista_candidatos_empresa v
            WHERE v.cv_url IS NOT NULL
              AND (storage.foldername(name))[1] = v.postulante_id::text
              AND (
                  v.cv_url = name
                  OR v.cv_url LIKE '%' || name
                  OR name LIKE '%' || v.cv_url
              )
        )
    );

-- 5. Crear buckets de almacenamiento requeridos si no existen
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('empresas-documentos', 'empresas-documentos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Políticas de Storage para avatars (público de lectura, usuarios autenticados suben sus fotos/logos)
DROP POLICY IF EXISTS "Avatars son publicamente accesibles" ON storage.objects;
CREATE POLICY "Avatars son publicamente accesibles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuarios autenticados pueden subir avatars" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar y borrar sus avatars" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden actualizar y borrar sus avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar sus avatars" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden eliminar sus avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

-- Políticas de Storage para empresas-documentos (privado: solo la empresa y los admins)
DROP POLICY IF EXISTS "Empresas y admins leen documentos de empresas" ON storage.objects;
CREATE POLICY "Empresas y admins leen documentos de empresas"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'empresas-documentos' AND (
      EXISTS (
        SELECT 1 FROM public.perfil WHERE id = auth.uid() AND rol = 'admin' AND activo = true
      ) OR
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Empresas pueden subir sus documentos" ON storage.objects;
CREATE POLICY "Empresas pueden subir sus documentos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'empresas-documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
