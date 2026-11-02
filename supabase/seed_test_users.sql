-- ==============================================================================
-- Portal Empleo Funes: Creación de Usuarios de Prueba (REFERENCIA SQL)
-- ==============================================================================
-- ADVERTENCIA TÉCNICA / WARNING:
-- NO EJECUTAR ESTE SCRIPT DIRECTAMENTE EN EL SQL EDITOR DE SUPABASE EN AMBIENTES ACTIVOS.
--
-- Motivo:
-- Las versiones modernas del microservicio GoTrue (Supabase Auth) administran
-- esquemas internos complejos en auth.users y auth.identities. La inserción manual
-- directa por SQL puede provocar el error de GoTrue: "Database error querying schema"
-- o "Database error loading user".
--
-- MÉTODO OFICIAL Y RECOMENDADO PARA PROVISIÓN DE USUARIOS DE PRUEBA:
-- Utilizar el script automatizado que interactúa con la API oficial de administración:
--   node scripts/seed-test-users.js
--
-- Este archivo se preserva exclusivamente como referencia documental de la estructura
-- de datos asignada a los perfiles de prueba:
--   - Admin:       administracion@funes.com (rol: admin, es_admin_general: true)
--   - Postulante:  postulante@funes.com     (rol: postulante, residente Funes)
--   - Empresa:     empresa@funes.com        (rol: empresa, estado: aprobada)
-- ==============================================================================

-- (El código SQL previo se mantiene abajo como referencia de estructura)
/*
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_raw_password TEXT := 'Funes2026!';
    v_encrypted_password TEXT := crypt(v_raw_password, gen_salt('bf', 10));
    v_admin_id UUID := '11111111-1111-4000-8000-000000000001'::uuid;
    v_postulante_id UUID := '22222222-2222-4000-8000-000000000002'::uuid;
    v_empresa_id UUID := '33333333-3333-4000-8000-000000000003'::uuid;
    v_empresa_table_id UUID := '44444444-4444-4000-8000-000000000004'::uuid;
BEGIN
    -- Ver scripts/seed-test-users.js para la implementación compatible con GoTrue.
END $$;
*/
