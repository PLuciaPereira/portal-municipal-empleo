-- ====================================================================
-- Migración 024: Creación de tabla maestra de localidades, RLS y blindaje
-- Fecha: 2026-11-24
-- Objetivo:
--   1. Crear la tabla pública `public.localidades`.
--   2. Poblar localidades oficiales iniciales con prioridad para Funes y Gran Rosario.
--   3. Habilitar RLS con solo lectura pública y escritura exclusiva para administradores.
--   4. Crear trigger de validación e integridad en `public.perfil` y `public.empresas`
--      para rechazar localidades no autorizadas e impedir registros atípicos.
-- ====================================================================

BEGIN;

-- 1. Tabla maestra de localidades
CREATE TABLE IF NOT EXISTS public.localidades (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    provincia TEXT NOT NULL DEFAULT 'Santa Fe',
    codigo_postal TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    orden INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Carga inicial de localidades oficiales canónicas
INSERT INTO public.localidades (nombre, provincia, codigo_postal, orden, activo)
VALUES
    ('Funes', 'Santa Fe', '2132', 1, true),
    ('Roldán', 'Santa Fe', '2134', 2, true),
    ('Rosario', 'Santa Fe', '2000', 3, true),
    ('San Jerónimo Sud', 'Santa Fe', '2136', 4, true),
    ('Ibarlucea', 'Santa Fe', '2142', 5, true),
    ('Pérez', 'Santa Fe', '2121', 6, true),
    ('Zavalla', 'Santa Fe', '2123', 7, true),
    ('Granadero Baigorria', 'Santa Fe', '2152', 8, true),
    ('Capitán Bermúdez', 'Santa Fe', '2154', 9, true),
    ('San Lorenzo', 'Santa Fe', '2200', 10, true),
    ('Fray Luis Beltrán', 'Santa Fe', '2156', 11, true),
    ('Villa Gobernador Gálvez', 'Santa Fe', '2124', 12, true),
    ('Casilda', 'Santa Fe', '2170', 13, true),
    ('Carcarañá', 'Santa Fe', '2138', 14, true),
    ('Pueblo Esther', 'Santa Fe', '2126', 15, true),
    ('Arroyo Seco', 'Santa Fe', '2128', 16, true),
    ('Ricardone', 'Santa Fe', '2201', 17, true),
    ('Correa', 'Santa Fe', '2506', 18, true),
    ('Cañada de Gómez', 'Santa Fe', '2500', 19, true),
    ('Victoria', 'Entre Ríos', '3153', 20, true),
    ('Otra localidad (Santa Fe)', 'Santa Fe', NULL, 90, true),
    ('Otra localidad (Otra provincia)', 'Otra', NULL, 91, true)
ON CONFLICT (nombre) DO UPDATE SET
    provincia = EXCLUDED.provincia,
    codigo_postal = EXCLUDED.codigo_postal,
    orden = EXCLUDED.orden,
    activo = EXCLUDED.activo;

-- 3. Blindaje RLS (Row Level Security)
ALTER TABLE public.localidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "localidades_select_public" ON public.localidades;
CREATE POLICY "localidades_select_public"
    ON public.localidades
    FOR SELECT
    USING (activo = true);

DROP POLICY IF EXISTS "localidades_admin_manage" ON public.localidades;
CREATE POLICY "localidades_admin_manage"
    ON public.localidades
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

REVOKE ALL ON public.localidades FROM PUBLIC, anon;
GRANT SELECT ON public.localidades TO anon, authenticated;
GRANT ALL ON public.localidades TO service_role;

-- 4. Función y Triggers para validar localidades en perfil y empresas
CREATE OR REPLACE FUNCTION public.validar_localidad_existente()
RETURNS TRIGGER AS $$
DECLARE
    v_nombre_canonico TEXT;
BEGIN
    -- Permitir NULL si no se envía o es vacío
    IF NEW.localidad IS NULL OR TRIM(NEW.localidad) = '' THEN
        NEW.localidad := NULL;
        IF TG_TABLE_NAME = 'perfil' THEN
            NEW.es_residente_funes := false;
        END IF;
        RETURN NEW;
    END IF;

    -- Buscar coincidencia insensible a mayúsculas/acentos comunes en localidades activas
    SELECT nombre INTO v_nombre_canonico
    FROM public.localidades
    WHERE activo = true
      AND (
          LOWER(TRIM(nombre)) = LOWER(TRIM(NEW.localidad))
          OR (LOWER(TRIM(NEW.localidad)) IN ('roldan', 'roldán') AND LOWER(TRIM(nombre)) IN ('roldan', 'roldán'))
          OR (LOWER(TRIM(NEW.localidad)) IN ('perez', 'pérez') AND LOWER(TRIM(nombre)) IN ('perez', 'pérez'))
          OR (LOWER(TRIM(NEW.localidad)) IN ('carcarana', 'carcarañá') AND LOWER(TRIM(nombre)) IN ('carcarana', 'carcarañá'))
      )
    LIMIT 1;

    IF v_nombre_canonico IS NULL THEN
        RAISE EXCEPTION 'La localidad "%" no es válida o no está habilitada en el Portal de Empleo.', NEW.localidad;
    END IF;

    -- Asignar el nombre con la capitalización canónica oficial
    NEW.localidad := v_nombre_canonico;

    -- Para perfiles de usuarios, sincronizar atómicamente la condición de residente
    IF TG_TABLE_NAME = 'perfil' THEN
        NEW.es_residente_funes := (LOWER(v_nombre_canonico) = 'funes');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validar_localidad_perfil ON public.perfil;
CREATE TRIGGER trg_validar_localidad_perfil
    BEFORE INSERT OR UPDATE OF localidad ON public.perfil
    FOR EACH ROW EXECUTE FUNCTION public.validar_localidad_existente();

DROP TRIGGER IF EXISTS trg_validar_localidad_empresas ON public.empresas;
CREATE TRIGGER trg_validar_localidad_empresas
    BEFORE INSERT OR UPDATE OF localidad ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.validar_localidad_existente();

COMMIT;
