-- ==============================================================================
-- MIGRACIÓN 008: FASE 5 · REACTIVACIÓN CONTROLADA DE POSTULACIONES RETIRADAS
-- ==============================================================================
-- Proyecto: Portal Municipal de Empleo de Funes
-- Fecha: 2026-10-19
-- Propósito:
--   1. Permitir la reactivación segura de una postulación previamente retirada
--      de forma voluntaria (`estado = 'retirado_por_postulante' -> 'postulado'`)
--      cuando la oferta laboral continúa publicada y vigente.
--   2. Actualizar `public.validate_postulacion_integrity_and_status()` para que
--      solo autorice al postulante el cambio de `cv_id` y `cv_url_snapshot` y el
--      regreso al estado `'postulado'` cuando el estado previo sea estrictamente
--      `'retirado_por_postulante'`, manteniendo bloqueada cualquier alteración en
--      postulaciones activas o finalizadas.
--   3. Incorporar la función RPC `public.reactivar_postulacion(p_postulacion_id, p_cv_id, p_mensaje)`
--      bajo `SECURITY DEFINER`, validando propiedad, vigencia de la oferta,
--      vigencia del CV seleccionado y registrando la trazabilidad en `public.historial_postulacion`.
-- Seguridad: Migración 100% aditiva e idempotente. No elimina tablas ni datos.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ACTUALIZACIÓN DEL TRIGGER DE INTEGRIDAD DE POSTULACIONES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_postulacion_integrity_and_status()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_uid UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_empresa_id UUID;
    v_is_reactivation BOOLEAN := false;
BEGIN
    v_is_admin := public.is_admin();

    -- Identificar si se trata de una reactivación legítima de una postulación retirada
    IF OLD.estado::text = 'retirado_por_postulante' AND NEW.estado::text = 'postulado' THEN
        v_is_reactivation := true;
    END IF;

    IF NOT v_is_admin THEN
        -- Campos históricos y de derivación siempre inmutables para no administradores
        IF NEW.postulante_id IS DISTINCT FROM OLD.postulante_id OR
           NEW.oferta_id IS DISTINCT FROM OLD.oferta_id OR
           NEW.created_at IS DISTINCT FROM OLD.created_at OR
           NEW.fecha_derivacion IS DISTINCT FROM OLD.fecha_derivacion OR
           NEW.derivado_por IS DISTINCT FROM OLD.derivado_por THEN
            RAISE EXCEPTION 'No se permite modificar los datos históricos ni de derivación de una postulación.';
        END IF;

        -- El CV adjunto y su snapshot son inmutables salvo al reactivar una postulación retirada
        IF NOT v_is_reactivation AND (
           NEW.cv_id IS DISTINCT FROM OLD.cv_id OR
           NEW.cv_url_snapshot IS DISTINCT FROM OLD.cv_url_snapshot
        ) THEN
            RAISE EXCEPTION 'No se permite modificar el currículum asociado a una postulación activa.';
        END IF;
    END IF;

    IF NEW.estado::text IS DISTINCT FROM OLD.estado::text THEN
        IF v_caller_uid IS NOT NULL AND v_caller_uid = OLD.postulante_id AND NOT v_is_admin THEN
            IF v_is_reactivation THEN
                -- Validar que la oferta siga publicada y sin baja lógica al reactivar
                IF NOT EXISTS (
                    SELECT 1 FROM public.ofertas o
                    WHERE o.id = OLD.oferta_id
                      AND o.estado::text = 'publicada'
                      AND o.deleted_at IS NULL
                ) THEN
                    RAISE EXCEPTION 'No se puede reactivar la postulación porque la oferta laboral ya no está publicada.';
                END IF;
            ELSIF NEW.estado::text = 'retirado_por_postulante' THEN
                IF OLD.estado::text IN ('contratado', 'retirado_por_postulante') THEN
                    RAISE EXCEPTION 'No se puede retirar una postulación finalizada o ya retirada.';
                END IF;
            ELSE
                RAISE EXCEPTION 'El postulante solo puede retirar voluntariamente su postulación o reactivar una postulación retirada.';
            END IF;
        END IF;

        IF v_caller_uid IS NOT NULL AND v_caller_uid != OLD.postulante_id AND NOT v_is_admin THEN
            SELECT id INTO v_empresa_id
            FROM public.empresas
            WHERE user_id = v_caller_uid AND estado = 'aprobada';

            IF v_empresa_id IS NULL THEN
                RAISE EXCEPTION 'No posee permisos de empresa aprobada activa para gestionar postulaciones.';
            END IF;

            IF OLD.estado::text NOT IN ('presentado_a_empresa', 'seleccionado') THEN
                RAISE EXCEPTION 'La empresa solo puede gestionar candidatos formalmente presentados o seleccionados.';
            END IF;

            IF NEW.estado::text NOT IN ('seleccionado', 'rechazado_por_empresa', 'contratado') THEN
                RAISE EXCEPTION 'Transición de estado no autorizada para la empresa.';
            END IF;

            IF NEW.estado::text = 'rechazado_por_empresa' AND (NEW.motivo_rechazo_empresa IS NULL OR length(trim(NEW.motivo_rechazo_empresa)) = 0) THEN
                RAISE EXCEPTION 'El motivo de rechazo es obligatorio para la empresa.';
            END IF;
        END IF;

        IF v_is_admin AND NEW.estado::text = 'presentado_a_empresa' AND OLD.estado::text != 'presentado_a_empresa' THEN
            IF NEW.fecha_derivacion IS NULL THEN
                NEW.fecha_derivacion := timezone('utc'::text, now());
            END IF;
            IF NEW.derivado_por IS NULL THEN
                NEW.derivado_por := v_caller_uid;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 2. FUNCIÓN RPC PARA REACTIVAR POSTULACIÓN RETIRADA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reactivar_postulacion(
    p_postulacion_id UUID,
    p_cv_id UUID DEFAULT NULL,
    p_mensaje TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_postulante_id UUID;
    v_oferta_id UUID;
    v_estado_actual public.application_status;
    v_cv_id UUID;
    v_cv_snapshot TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT postulante_id, oferta_id, estado, cv_id, cv_url_snapshot
    INTO v_postulante_id, v_oferta_id, v_estado_actual, v_cv_id, v_cv_snapshot
    FROM public.postulaciones
    WHERE id = p_postulacion_id;

    IF v_postulante_id IS NULL THEN
        RAISE EXCEPTION 'Postulación no encontrada.';
    END IF;

    IF v_postulante_id <> auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'No puede reactivar una postulación que no le pertenece.';
    END IF;

    IF v_estado_actual::text <> 'retirado_por_postulante' THEN
        RAISE EXCEPTION 'Solo se pueden reactivar postulaciones que fueron retiradas voluntariamente.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.ofertas o
        WHERE o.id = v_oferta_id
          AND o.estado::text = 'publicada'
          AND o.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Esta oferta laboral ya no se encuentra publicada o vigente.';
    END IF;

    IF p_cv_id IS NOT NULL THEN
        SELECT id, archivo_url INTO v_cv_id, v_cv_snapshot
        FROM public.curriculums
        WHERE id = p_cv_id
          AND postulante_id = v_postulante_id
          AND activo = true
          AND deleted_at IS NULL;

        IF v_cv_id IS NULL THEN
            RAISE EXCEPTION 'El currículum seleccionado no es válido o no se encuentra activo.';
        END IF;
    END IF;

    UPDATE public.postulaciones
    SET estado = 'postulado'::public.application_status,
        cv_id = v_cv_id,
        cv_url_snapshot = v_cv_snapshot,
        mensaje_postulante = COALESCE(NULLIF(trim(p_mensaje), ''), mensaje_postulante),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_postulacion_id;

    UPDATE public.historial_postulacion
    SET observaciones = 'Postulación reactivada por el postulante'
    WHERE postulacion_id = p_postulacion_id
      AND estado_anterior::text = 'retirado_por_postulante'
      AND estado_nuevo::text = 'postulado'
      AND created_at >= (now() - interval '5 seconds');
END;
$$;

REVOKE ALL ON FUNCTION public.reactivar_postulacion(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivar_postulacion(UUID, UUID, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. REGISTRO EN CONTROL DE MIGRACIONES (version, name, applied_at)
-- ------------------------------------------------------------------------------
INSERT INTO public._schema_migrations (version, name)
VALUES ('008', '008_fase5_reactivacion_postulacion_retirada')
ON CONFLICT (version) DO UPDATE SET
    name = EXCLUDED.name,
    applied_at = timezone('utc'::text, now());

COMMIT;
