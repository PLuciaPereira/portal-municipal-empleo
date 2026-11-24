-- ====================================================================
-- Migración 023: Corrección y normalización de localidades
-- Fecha: 2026-11-24
-- Contexto:
--   1. "FUNES (2132)" se normaliza a "Funes" y se actualiza es_residente_funes a true.
--   2. "dsfdsfds" se corrige asignando la localidad real "Rosario" (es_residente_funes = false)
--      al postulante gian isoardi, conservando todas sus referencias existentes.
-- ====================================================================

BEGIN;

-- 1. Normalizar "FUNES (2132)" a "Funes" y activar condición de residencia en perfil
UPDATE public.perfil
SET 
    localidad = 'Funes',
    es_residente_funes = true,
    updated_at = timezone('utc'::text, now())
WHERE TRIM(UPPER(localidad)) IN ('FUNES (2132)', 'FUNES(2132)');

-- 2. Corregir localidad anómala "dsfdsfds" asignando "Rosario" en perfil
UPDATE public.perfil
SET 
    localidad = 'Rosario',
    es_residente_funes = false,
    updated_at = timezone('utc'::text, now())
WHERE TRIM(LOWER(localidad)) = 'dsfdsfds' 
   OR id = '3b1fa5c8-19ca-4d96-a5df-bd340de3c944';

-- 3. Por consistencia preventiva, actualizar en empresas si existieran registros
UPDATE public.empresas
SET 
    localidad = 'Funes',
    updated_at = timezone('utc'::text, now())
WHERE TRIM(UPPER(localidad)) IN ('FUNES (2132)', 'FUNES(2132)');

UPDATE public.empresas
SET 
    localidad = 'Rosario',
    updated_at = timezone('utc'::text, now())
WHERE TRIM(LOWER(localidad)) = 'dsfdsfds';

-- 4. Sincronizar metadatos en auth.users para evitar divergencias entre sesión y tabla de perfil
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{localidad}',
    '"Funes"'::jsonb
)
WHERE id = '76563ba0-3625-45d9-ad7f-5c74eba529b2';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{localidad}',
    '"Rosario"'::jsonb
)
WHERE id = '3b1fa5c8-19ca-4d96-a5df-bd340de3c944';

COMMIT;
