-- ==============================================================================
-- CARGA DE OFERTAS LABORALES DE PRUEBA (SEED IDEMPOTENTE) · OFICINA DE EMPLEO FUNES
-- ==============================================================================
-- Proyecto: Portal Municipal de Empleo de Funes
-- Propósito: Cargar o actualizar 3 ofertas iniciales con estado 'publicada'
-- vinculadas a una empresa aprobada y a los rubros correspondientes para
-- verificar el catálogo público, los filtros y el flujo de postulación real.
-- Idempotencia: Puede ejecutarse múltiples veces sin duplicar ofertas ni rubros.
-- Ejecutar en: Supabase SQL Editor
-- ==============================================================================

DO $$
DECLARE
    v_empresa_id UUID;
    v_empresa_estado TEXT;
    v_rubro_comercio INTEGER;
    v_rubro_gastronomia INTEGER;
    v_rubro_logistica INTEGER;
    v_admin_id UUID;
    v_oferta_id_1 UUID;
    v_oferta_id_2 UUID;
    v_oferta_id_3 UUID;
BEGIN
    -- 1. Obtener administrador activo para registrar revisor oficial y contexto de sesión
    SELECT id
    INTO v_admin_id
    FROM public.perfil
    WHERE rol = 'admin'
      AND activo = true
      AND deleted_at IS NULL
    ORDER BY es_admin_general DESC, created_at ASC
    LIMIT 1;

    -- Si existe un administrador activo, establecer su UID en el contexto de la transacción
    -- para que auth.uid() y public.is_admin() lo reconozcan en los triggers de auditoría/estado.
    IF v_admin_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    END IF;

    -- 2. Obtener empresa registrada priorizando estado 'aprobada'
    SELECT id, estado::text
    INTO v_empresa_id, v_empresa_estado
    FROM public.empresas
    ORDER BY (estado::text = 'aprobada') DESC, created_at ASC
    LIMIT 1;

    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ninguna empresa en public.empresas. Registrá una empresa primero.';
    END IF;

    -- Si la única empresa existente aún está pendiente, aprobarla para que la política RLS
    -- empresas_public_select permita visualizar su nombre comercial en el catálogo público.
    IF v_empresa_estado <> 'aprobada' THEN
        UPDATE public.empresas
        SET estado = 'aprobada',
            verificada = true,
            revisado_por = COALESCE(revisado_por, v_admin_id),
            fecha_revision = COALESCE(fecha_revision, timezone('utc'::text, now()))
        WHERE id = v_empresa_id;
        RAISE NOTICE 'Empresa % actualizada a estado aprobada para visibilidad pública del catálogo.', v_empresa_id;
    END IF;

    -- 3. Identificar o asegurar los rubros laborales canónicos en public.rubros
    SELECT id INTO v_rubro_comercio
    FROM public.rubros
    WHERE activo = true AND lower(nombre) LIKE '%comercio%'
    ORDER BY id ASC
    LIMIT 1;

    IF v_rubro_comercio IS NULL THEN
        INSERT INTO public.rubros (nombre, descripcion, activo)
        VALUES ('Comercio y Atención al Cliente', 'Ventas, atención al público, cajeros y reposición', true)
        ON CONFLICT (nombre) DO UPDATE SET activo = true
        RETURNING id INTO v_rubro_comercio;
    END IF;

    SELECT id INTO v_rubro_gastronomia
    FROM public.rubros
    WHERE activo = true AND lower(nombre) LIKE '%gastronom%'
    ORDER BY id ASC
    LIMIT 1;

    IF v_rubro_gastronomia IS NULL THEN
        INSERT INTO public.rubros (nombre, descripcion, activo)
        VALUES ('Gastronomía y Hotelería', 'Cocina, atención de salón, cafetería, eventos y turismo', true)
        ON CONFLICT (nombre) DO UPDATE SET activo = true
        RETURNING id INTO v_rubro_gastronomia;
    END IF;

    SELECT id INTO v_rubro_logistica
    FROM public.rubros
    WHERE activo = true AND (lower(nombre) LIKE '%log%' OR lower(nombre) LIKE '%distrib%')
    ORDER BY id ASC
    LIMIT 1;

    IF v_rubro_logistica IS NULL THEN
        INSERT INTO public.rubros (nombre, descripcion, activo)
        VALUES ('Logística y Distribución', 'Depósito, reparto, choferes y control de stock', true)
        ON CONFLICT (nombre) DO UPDATE SET activo = true
        RETURNING id INTO v_rubro_logistica;
    END IF;

    -- ==========================================================================
    -- 4. Oferta 1: Vendedor / Atención al Cliente en Salón (Idempotente)
    -- ==========================================================================
    SELECT id INTO v_oferta_id_1
    FROM public.ofertas
    WHERE empresa_id = v_empresa_id
      AND lower(btrim(titulo)) = lower('Vendedor / Atención al Cliente en Salón')
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_oferta_id_1 IS NULL THEN
        INSERT INTO public.ofertas (
            empresa_id,
            rubro_id,
            titulo,
            descripcion,
            requisitos,
            experiencia_requerida,
            tipo_jornada,
            tipo_contrato,
            ubicacion,
            rango_salarial,
            vacantes,
            estado,
            destacada,
            fecha_limite,
            fecha_revision,
            revisado_por
        ) VALUES (
            v_empresa_id,
            v_rubro_comercio,
            'Vendedor / Atención al Cliente en Salón',
            'Comercio minorista ubicado en el centro de Funes busca incorporar vendedor para atención al público, reposición de mercadería y cobro en caja. Se valorará vocación de servicio, proactividad y trato cordial con los clientes locales.',
            '- Secundario completo (excluyente)\n- Manejo de herramientas informáticas y cobro con tarjetas/QR\n- Residencia en Funes (prioridad municipal)\n- Disponibilidad horaria para turno mañana o tarde',
            '1 año en ventas o atención al cliente',
            'Jornada Completa',
            'Tiempo Indeterminado',
            'Centro, Funes, Santa Fe',
            'Convenio Empleados de Comercio',
            2,
            'publicada'::public.job_status,
            true,
            CURRENT_DATE + INTERVAL '30 days',
            timezone('utc'::text, now()),
            v_admin_id
        ) RETURNING id INTO v_oferta_id_1;
    ELSE
        UPDATE public.ofertas
        SET rubro_id = v_rubro_comercio,
            estado = 'publicada'::public.job_status,
            destacada = true,
            ubicacion = 'Centro, Funes, Santa Fe',
            fecha_limite = CURRENT_DATE + INTERVAL '30 days',
            revisado_por = COALESCE(revisado_por, v_admin_id),
            fecha_revision = COALESCE(fecha_revision, timezone('utc'::text, now()))
        WHERE id = v_oferta_id_1;
    END IF;

    INSERT INTO public.ofertas_rubros (oferta_id, rubro_id)
    VALUES (v_oferta_id_1, v_rubro_comercio)
    ON CONFLICT (oferta_id, rubro_id) DO NOTHING;

    -- ==========================================================================
    -- 5. Oferta 2: Ayudante de Cocina Profesional / Minutero (Idempotente)
    -- ==========================================================================
    SELECT id INTO v_oferta_id_2
    FROM public.ofertas
    WHERE empresa_id = v_empresa_id
      AND lower(btrim(titulo)) = lower('Ayudante de Cocina Profesional / Minutero')
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_oferta_id_2 IS NULL THEN
        INSERT INTO public.ofertas (
            empresa_id,
            rubro_id,
            titulo,
            descripcion,
            requisitos,
            experiencia_requerida,
            tipo_jornada,
            tipo_contrato,
            ubicacion,
            rango_salarial,
            vacantes,
            estado,
            destacada,
            fecha_limite,
            fecha_revision,
            revisado_por
        ) VALUES (
            v_empresa_id,
            v_rubro_gastronomia,
            'Ayudante de Cocina Profesional / Minutero',
            'Reconocido local gastronómico sobre Ruta 9 en Funes selecciona ayudante de cocina con experiencia en despacho rápido, manejo de plancha y freidoras. Excelente ambiente de trabajo.',
            '- Carnet de Manipulación de Alimentos al día (o en trámite)\n- Manejo de normas de higiene y seguridad en cocina\n- Residencia preferente en Funes o movilidad propia\n- Disponibilidad para turno tarde/noche y fines de semana',
            '6 meses en locales gastronómicos o rotiserías',
            'Media Jornada',
            'Temporada con posibilidad de efectivización',
            'Ruta 9, Funes, Santa Fe',
            'A convenir según experiencia',
            1,
            'publicada'::public.job_status,
            true,
            CURRENT_DATE + INTERVAL '20 days',
            timezone('utc'::text, now()),
            v_admin_id
        ) RETURNING id INTO v_oferta_id_2;
    ELSE
        UPDATE public.ofertas
        SET rubro_id = v_rubro_gastronomia,
            estado = 'publicada'::public.job_status,
            destacada = true,
            ubicacion = 'Ruta 9, Funes, Santa Fe',
            fecha_limite = CURRENT_DATE + INTERVAL '20 days',
            revisado_por = COALESCE(revisado_por, v_admin_id),
            fecha_revision = COALESCE(fecha_revision, timezone('utc'::text, now()))
        WHERE id = v_oferta_id_2;
    END IF;

    INSERT INTO public.ofertas_rubros (oferta_id, rubro_id)
    VALUES (v_oferta_id_2, v_rubro_gastronomia)
    ON CONFLICT (oferta_id, rubro_id) DO NOTHING;

    -- ==========================================================================
    -- 6. Oferta 3: Operario de Depósito y Preparación de Pedidos (Idempotente)
    -- ==========================================================================
    SELECT id INTO v_oferta_id_3
    FROM public.ofertas
    WHERE empresa_id = v_empresa_id
      AND lower(btrim(titulo)) = lower('Operario de Depósito y Preparación de Pedidos')
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_oferta_id_3 IS NULL THEN
        INSERT INTO public.ofertas (
            empresa_id,
            rubro_id,
            titulo,
            descripcion,
            requisitos,
            experiencia_requerida,
            tipo_jornada,
            tipo_contrato,
            ubicacion,
            rango_salarial,
            vacantes,
            estado,
            destacada,
            fecha_limite,
            fecha_revision,
            revisado_por
        ) VALUES (
            v_empresa_id,
            v_rubro_logistica,
            'Operario de Depósito y Preparación de Pedidos',
            'Depósito de distribución en Parque Industrial de Funes busca personal para recepción, control de stock y preparación de pedidos (picking).',
            '- Secundario completo\n- Capacidad para tareas de esfuerzo físico moderado\n- Responsabilidad, puntualidad y trabajo en equipo\n- Residencia en Funes',
            'Experiencia en tareas de depósito o logística básica',
            'Jornada Completa',
            'Tiempo Indeterminado',
            'Parque Industrial, Funes, Santa Fe',
            'Convenio Colectivo de Trabajo',
            1,
            'publicada'::public.job_status,
            false,
            CURRENT_DATE + INTERVAL '45 days',
            timezone('utc'::text, now()),
            v_admin_id
        ) RETURNING id INTO v_oferta_id_3;
    ELSE
        UPDATE public.ofertas
        SET rubro_id = v_rubro_logistica,
            estado = 'publicada'::public.job_status,
            destacada = false,
            ubicacion = 'Parque Industrial, Funes, Santa Fe',
            fecha_limite = CURRENT_DATE + INTERVAL '45 days',
            revisado_por = COALESCE(revisado_por, v_admin_id),
            fecha_revision = COALESCE(fecha_revision, timezone('utc'::text, now()))
        WHERE id = v_oferta_id_3;
    END IF;

    INSERT INTO public.ofertas_rubros (oferta_id, rubro_id)
    VALUES (v_oferta_id_3, v_rubro_logistica)
    ON CONFLICT (oferta_id, rubro_id) DO NOTHING;

    RAISE NOTICE 'Seed completado con éxito. Ofertas publicadas: %, %, %', v_oferta_id_1, v_oferta_id_2, v_oferta_id_3;
END $$;

