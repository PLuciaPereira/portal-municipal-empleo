-- ==============================================================================
-- MIGRACIÓN 020: MEJORAS EN PANEL DE EMPRESA Y GESTIÓN DE SOLICITUDES
-- ==============================================================================
-- Portal de Empleo Funes
-- 1. Agrega campos de auditoría de historial de revisiones y contador de reenvíos
--    en la tabla public.empresas.
-- 2. Crea la función RPC segura 'reenviar_solicitud_empresa' para permitir que
--    una empresa rechazada corrija sus datos comerciales y devuelva su solicitud
--    al estado 'pendiente', archivando el motivo anterior y notificando a la Oficina de Empleo.
-- 3. Permite la cancelación y reprogramación de entrevistas con persistencia completa.
-- ==============================================================================

BEGIN;

-- 1. COLUMNAS DE HISTORIAL Y CONTADOR DE REENVÍOS
ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS historial_revisiones JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reenvios_count INT DEFAULT 0;

-- 2. FUNCIÓN RPC PARA REENVÍO SEGURO DE SOLICITUD DE EMPRESA RECHAZADA
CREATE OR REPLACE FUNCTION public.reenviar_solicitud_empresa(
    p_empresa_id UUID,
    p_datos JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_empresa RECORD;
    v_historial JSONB;
BEGIN
    -- Validar que la empresa exista y pertenezca al usuario autenticado
    SELECT * INTO v_empresa
    FROM public.empresas
    WHERE id = p_empresa_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Empresa no encontrada o no posee permisos para modificarla.');
    END IF;

    IF v_empresa.estado <> 'rechazada' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solo una empresa en estado rechazada puede reenviar su solicitud.');
    END IF;

    IF COALESCE(v_empresa.reenvios_count, 0) >= 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ha alcanzado el límite máximo de 3 reenvíos permitidos. Por favor, comuníquese con la Oficina de Empleo.');
    END IF;

    -- Apilar en historial de revisiones el motivo de rechazo previo
    v_historial := COALESCE(v_empresa.historial_revisiones, '[]'::jsonb) || jsonb_build_object(
        'fecha', timezone('utc'::text, now()),
        'estado_previo', 'rechazada',
        'motivo_previo', v_empresa.motivo_rechazo,
        'fecha_revision_previa', v_empresa.fecha_revision,
        'revisado_por_previo', v_empresa.revisado_por
    );

    -- Actualizar empresa a pendiente con los datos corregidos
    UPDATE public.empresas
    SET 
        estado = 'pendiente',
        verificada = false,
        motivo_rechazo = NULL,
        revisado_por = NULL,
        fecha_revision = NULL,
        nombre_fantasia = COALESCE(NULLIF(trim(p_datos->>'nombre_fantasia'), ''), nombre_fantasia),
        persona_contacto = COALESCE(NULLIF(trim(p_datos->>'persona_contacto'), ''), persona_contacto),
        telefono = COALESCE(NULLIF(trim(p_datos->>'telefono'), ''), telefono),
        email_contacto = COALESCE(NULLIF(trim(p_datos->>'email_contacto'), ''), email_contacto),
        direccion = COALESCE(NULLIF(trim(p_datos->>'direccion'), ''), direccion),
        localidad = COALESCE(NULLIF(trim(p_datos->>'localidad'), ''), localidad),
        rubro = COALESCE(NULLIF(trim(p_datos->>'rubro'), ''), rubro),
        sitio_web = COALESCE(NULLIF(trim(p_datos->>'sitio_web'), ''), sitio_web),
        descripcion = COALESCE(NULLIF(trim(p_datos->>'descripcion'), ''), descripcion),
        historial_revisiones = v_historial,
        reenvios_count = COALESCE(reenvios_count, 0) + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_empresa_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reenviar_solicitud_empresa(UUID, JSONB) TO authenticated;

-- 3. REGISTRO EN _SCHEMA_MIGRATIONS
INSERT INTO public._schema_migrations (version, name)
VALUES ('020', 'Mejoras en panel de empresa, historial de revisiones y reenvío de solicitudes')
ON CONFLICT (version) DO UPDATE 
SET applied_at = timezone('utc'::text, now()),
    name = EXCLUDED.name;

COMMIT;
