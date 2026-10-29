-- ==============================================================================
-- Migración 017: Permitir Baja Lógica de Ofertas en Revisión por la Empresa
-- Portal de Empleo - Municipalidad de Funes
-- ==============================================================================
-- Instrucciones:
-- Esta migración puede ejecutarse manualmente en el SQL Editor de Supabase.
--
-- Contenido y Justificación Técnica:
-- 1. La política RLS previa "ofertas_empresa_update" (migración 010) bloqueaba
--    cualquier operación UPDATE sobre ofertas con estado 'pendiente_revision'
--    para evitar modificaciones de contenido durante la evaluación municipal.
-- 2. Sin embargo, esto también impedía que la empresa propietaria pudiera dar
--    de baja la búsqueda (asignando deleted_at y motivo_baja).
-- 3. Esta migración ajusta la política para que:
--    - Se autorice la baja lógica en estado 'pendiente_revision'.
--    - Se continúe prohibiendo estrictamente la edición de texto o condiciones
--      laborales mientras la oferta esté en revisión.
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "ofertas_empresa_update" ON public.ofertas;

CREATE POLICY "ofertas_empresa_update"
    ON public.ofertas FOR UPDATE
    TO authenticated
    USING (
        empresa_id = public.get_user_empresa_id()
        AND EXISTS (
            SELECT 1 FROM public.empresas
            WHERE id = public.get_user_empresa_id()
              AND estado = 'aprobada'
        )
        -- Puede actualizar si NO está en revisión,
        -- O si está en revisión pero aún no fue dada de baja (permite la baja lógica)
        AND (
            estado <> 'pendiente_revision'::public.job_status
            OR deleted_at IS NULL
        )
    )
    WITH CHECK (
        empresa_id = public.get_user_empresa_id()
        AND EXISTS (
            SELECT 1 FROM public.empresas
            WHERE id = public.get_user_empresa_id()
              AND estado = 'aprobada'
        )
        AND (
            -- Caso 1: En borrador o rechazada puede mantenerse o enviarse a revisión
            (estado IN ('borrador'::public.job_status, 'pendiente_revision'::public.job_status) AND deleted_at IS NULL)
            -- Caso 2: En revisión solo se autoriza conservar el estado asignando deleted_at (baja lógica)
            OR (estado = 'pendiente_revision'::public.job_status AND deleted_at IS NOT NULL)
            -- Caso 3: Publicada, pausada o finalizada (para cierre o baja)
            OR (estado IN ('publicada'::public.job_status, 'pausada'::public.job_status, 'finalizada'::public.job_status))
        )
    );

-- Trigger de validación: si la oferta está en revisión, no permite cambiar campos esenciales
CREATE OR REPLACE FUNCTION public.protect_oferta_revision_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.estado = 'pendiente_revision'::public.job_status AND NOT public.is_admin() AND current_user <> 'postgres' THEN
        -- Si está en revisión, únicamente se autoriza la baja lógica
        IF NEW.titulo IS DISTINCT FROM OLD.titulo OR
           NEW.descripcion IS DISTINCT FROM OLD.descripcion OR
           NEW.requisitos IS DISTINCT FROM OLD.requisitos OR
           NEW.tipo_jornada IS DISTINCT FROM OLD.tipo_jornada OR
           NEW.ubicacion IS DISTINCT FROM OLD.ubicacion OR
           NEW.vacantes IS DISTINCT FROM OLD.vacantes OR
           NEW.rubro_id IS DISTINCT FROM OLD.rubro_id OR
           NEW.estado IS DISTINCT FROM OLD.estado THEN
            RAISE EXCEPTION 'Operación denegada: Una oferta en revisión no puede ser modificada. Solo puede darse de baja.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_oferta_revision_fields ON public.ofertas;
CREATE TRIGGER trigger_protect_oferta_revision_fields
    BEFORE UPDATE ON public.ofertas
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_oferta_revision_fields();

-- Registrar migración si la tabla existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_schema_migrations') THEN
    INSERT INTO public._schema_migrations (version, name, applied_at)
    VALUES ('017', '017_permitir_baja_oferta_revision_rls', now())
    ON CONFLICT (version) DO UPDATE
    SET applied_at = timezone('utc'::text, now()),
        name = EXCLUDED.name;
  END IF;
END $$;

COMMIT;
