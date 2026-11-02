-- Migración 021: Agregar columna modalidad_trabajo a ofertas laborales
-- Valores válidos: 'Presencial', 'Remoto', 'Híbrido' (default 'Presencial')

ALTER TABLE public.ofertas 
ADD COLUMN IF NOT EXISTS modalidad_trabajo TEXT DEFAULT 'Presencial' 
CHECK (modalidad_trabajo IN ('Presencial', 'Remoto', 'Híbrido'));

COMMENT ON COLUMN public.ofertas.modalidad_trabajo IS 'Modalidad de trabajo del puesto: Presencial, Remoto o Híbrido';
