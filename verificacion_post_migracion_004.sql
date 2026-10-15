-- ==============================================================================
-- CONSULTA DE VERIFICACIÓN POST-MIGRACIÓN 004
-- ==============================================================================
-- Proyecto: Portal de Empleo Funes
-- Ejecutar en: Supabase SQL Editor (después de aplicar la migración 004)
-- Propósito: Comprobar exhaustivamente que todas las modificaciones se aplicaron
-- correctamente sin alterar datos preexistentes.
-- ==============================================================================

-- 1. Verificar registro en tabla de migraciones
SELECT 
    version,
    name,
    applied_at
FROM public._schema_migrations
ORDER BY applied_at DESC;

-- 2. Verificar columnas en public.perfil (confirmar direccion, localidad y ausencia total de barrio)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'perfil'
  AND column_name IN ('direccion', 'localidad', 'barrio', 'es_residente_funes', 'dni', 'rol')
ORDER BY ordinal_position;

-- 3. Confirmar que la columna 'barrio' NO existe en ninguna tabla del esquema public
SELECT 
    table_name, 
    column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'barrio';

-- 4. Verificar eliminación segura de la tabla seguimiento
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'seguimiento'
    ) AS tabla_seguimiento_existe;

-- 5. Verificar columnas agregadas a public.postulaciones para derivaciones a empresas
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'postulaciones'
  AND column_name IN ('fecha_derivacion', 'fecha_respuesta_empresa', 'motivo_rechazo_empresa', 'fecha_rechazo_empresa')
ORDER BY ordinal_position;

-- 6. Verificar privilegios GRANT efectivos sobre tablas públicas para anon y authenticated
SELECT 
    grantee,
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS permisos
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN ('perfil', 'empresas', 'ofertas', 'postulaciones', 'curriculums', 'vista_candidatos_empresa', 'rubros')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

-- 7. Verificar políticas RLS activas en public.curriculums (confirmar retiro de DELETE físico)
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'curriculums'
ORDER BY policyname;

-- 8. Verificar funciones RPC y administrativas creadas/actualizadas
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'is_admin', 
      'is_superadmin', 
      'check_admin_self_deactivation', 
      'desactivar_admin', 
      'reactivar_admin', 
      'promover_admin', 
      'responder_candidato_empresa',
      'handle_new_user'
  )
ORDER BY routine_name;

-- 9. Verificar estado actual de los perfiles (DNI numérico, residencia y rol canónico)
SELECT 
    id,
    rol,
    dni,
    localidad,
    es_residente_funes,
    activo,
    created_at
FROM public.perfil
ORDER BY created_at DESC;
