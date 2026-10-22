-- ==============================================================================
-- AUDITORÍA DE SOLO LECTURA · FASE 4 (CATÁLOGO, POSTULACIONES, RLS Y TRIGGERS)
-- ==============================================================================
-- Proyecto: Portal Municipal de Empleo de Funes
-- Propósito: Verificar en Supabase SQL Editor el estado exacto de migraciones,
--            tablas, columnas, claves foráneas, restricciones, triggers,
--            políticas RLS, privilegios GRANT y datos operativos de Fase 4.
-- Seguridad: 100% SOLO LECTURA (únicamente sentencias SELECT).
-- ==============================================================================

-- 1. Historial de migraciones registradas en la base real
SELECT version, name, applied_at
FROM public._schema_migrations
ORDER BY version;

-- 2. Verificación de tablas y vistas en el esquema public
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

-- 3. Verificación de RLS habilitado (rowsecurity = true) en todas las tablas de negocio
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_habilitado,
    forcerowsecurity AS force_rls
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Políticas RLS vigentes en tablas clave de Fase 4
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expr,
    with_check AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ofertas', 'ofertas_rubros', 'empresas', 'rubros', 'postulaciones', 'historial_postulacion', 'curriculums', 'perfil')
ORDER BY tablename, policyname;

-- 5. Triggers activos en tablas clave de Fase 4
SELECT
    c.relname AS tabla,
    t.tgname AS trigger_name,
    p.proname AS funcion_ejecutada,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE t.tgenabled::text
    END AS estado
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 6. Claves foráneas y restricciones UNIQUE/CHECK en ofertas, postulaciones e historial
SELECT
    conrelid::regclass AS tabla,
    conname AS constraint_name,
    contype AS tipo,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN ('ofertas', 'ofertas_rubros', 'postulaciones', 'historial_postulacion', 'empresas', 'perfil')
ORDER BY conrelid::regclass::text, contype, conname;

-- 7. Privilegios GRANT por tabla para anon, authenticated y service_role
SELECT
    grantee,
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY grantee, table_name
ORDER BY grantee, table_name;

-- 8. Privilegios GRANT por columna sobre public.empresas para anon
SELECT
    grantee,
    table_name,
    column_name,
    privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'empresas'
  AND grantee = 'anon'
ORDER BY column_name;

-- 9. Estado actual de empresas, ofertas publicadas y postulaciones
SELECT
    (SELECT COUNT(*) FROM public.rubros WHERE activo = true) AS rubros_activos,
    (SELECT COUNT(*) FROM public.empresas) AS total_empresas,
    (SELECT COUNT(*) FROM public.empresas WHERE estado = 'aprobada') AS empresas_aprobadas,
    (SELECT COUNT(*) FROM public.ofertas WHERE deleted_at IS NULL) AS ofertas_vigentes,
    (SELECT COUNT(*) FROM public.ofertas WHERE estado = 'publicada' AND deleted_at IS NULL) AS ofertas_publicadas_vigentes,
    (SELECT COUNT(*) FROM public.postulaciones) AS total_postulaciones,
    (SELECT COUNT(*) FROM public.historial_postulacion) AS registros_historial;
