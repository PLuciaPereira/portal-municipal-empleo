-- ==============================================================================
-- CONSULTA DE DIAGNÓSTICO: ESTADO DE DNIs, RESIDENCIA Y MIGRACIONES
-- ==============================================================================
-- Portal de Empleo Funes
-- Esta consulta es de SOLO LECTURA (SELECT únicamente, sin modificar datos).
-- Ejecutar en el SQL Editor de Supabase antes de aplicar la migración 004.
-- ==============================================================================

-- 1. Verificar versiones de migraciones ya aplicadas
SELECT 
    version, 
    name, 
    applied_at 
FROM public._schema_migrations 
ORDER BY version ASC;

-- 2. Conteo general de perfiles y DNIs
SELECT 
    count(*) AS total_perfiles,
    count(dni) AS total_dnis_cargados,
    count(DISTINCT dni) AS total_dnis_distintos,
    count(*) FILTER (WHERE dni ~ '\D') AS dnis_con_caracteres_no_numericos,
    count(*) FILTER (WHERE es_residente_funes IS TRUE) AS residentes_funes,
    count(*) FILTER (WHERE es_residente_funes IS FALSE) AS no_residentes,
    count(*) FILTER (WHERE es_residente_funes IS NULL) AS residencia_null
FROM public.perfil;

-- 3. Muestra de DNIs existentes y su limpieza por dígitos (últimos 25 registros)
SELECT 
    id,
    rol,
    dni AS dni_original,
    regexp_replace(COALESCE(dni, ''), '\D', '', 'g') AS dni_solo_digitos,
    length(regexp_replace(COALESCE(dni, ''), '\D', '', 'g')) AS longitud_digitos,
    direccion,
    localidad,
    es_residente_funes,
    created_at
FROM public.perfil
ORDER BY created_at DESC
LIMIT 25;

-- 4. DNIs que contienen caracteres no numéricos (puntos, espacios, guiones) si los hubiera
SELECT 
    id,
    rol,
    dni,
    regexp_replace(dni, '\D', '', 'g') AS dni_limpio,
    created_at
FROM public.perfil
WHERE dni ~ '\D';

-- 5. Distribución actual de localidades y residencia en perfil
SELECT 
    COALESCE(localidad, '(NULL)') AS localidad,
    es_residente_funes,
    count(*) AS cantidad
FROM public.perfil
GROUP BY localidad, es_residente_funes
ORDER BY cantidad DESC;

-- 6. Verificación de tabla seguimiento (para comprobar si hay datos históricos)
SELECT 
    (SELECT count(*) FROM public.seguimiento) AS total_registros_seguimiento;
