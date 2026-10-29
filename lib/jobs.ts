import { Job, Rubro, Oferta, EmpresaPublica, Empresa } from '@/types/database';
import { validatePhone } from '@/lib/validators';

/**
 * Columnas públicas no sensibles de public.empresas autorizadas para exposición en ofertas.
 * Excluye explícitamente CUIT, teléfono, email_contacto, persona_contacto, dirección,
 * user_id y campos administrativos de revisión.
 */
export const PUBLIC_EMPRESA_FIELDS =
  'id, nombre_fantasia, razon_social, localidad, rubro, descripcion, sitio_web, logo_url, verificada, estado';

/**
 * Selección base de ofertas con relaciones explícitas comprobadas en el esquema real:
 * - jobs_rubro_id_fkey (nombre histórico de la FK ofertas.rubro_id -> rubros.id)
 * - ofertas_rubros_oferta_id_fkey y ofertas_rubros_rubro_id_fkey (relación N:M)
 */
const OFERTA_SELECT_BASE =
  '*, rubro:rubros!jobs_rubro_id_fkey(*), ofertas_rubros!ofertas_rubros_oferta_id_fkey(rubro_id, rubro:rubros!ofertas_rubros_rubro_id_fkey(*))';

/**
 * Selección completa incluyendo las columnas públicas de la empresa asociada
 * mediante la clave foránea real ofertas_empresa_id_fkey.
 */
const OFERTA_SELECT_WITH_EMPRESA = `${OFERTA_SELECT_BASE}, empresa:empresas!ofertas_empresa_id_fkey(${PUBLIC_EMPRESA_FIELDS})`;

interface OfertaRubroJoinRow {
  rubro_id: number;
  rubro: Rubro | null;
}

type OfertaQueryRow = Oferta & {
  empresa?: EmpresaPublica | Empresa | null;
  company?: EmpresaPublica | Empresa | null;
  rubro?: Rubro | null;
  ofertas_rubros?: OfertaRubroJoinRow[] | null;
};

import { createClient } from '@/lib/supabase/client';

/**
 * Obtiene el cliente Supabase isomorfo (@supabase/ssr createBrowserClient):
 * - En Server Components y generateStaticParams (build): opera sin depender de next/headers.
 * - En Client Components (navegador): utiliza automáticamente la sesión autenticada en cookies.
 */
function getSupabase() {
  return createClient();
}

export interface JobFilterParams {
  query?: string;
  rubro?: string;
  jornada?: string;
  zona?: string;
  destacadasOnly?: boolean;
}

/**
 * Normaliza una fila de oferta de Supabase al tipo Job de la aplicación,
 * garantizando compatibilidad tipada con company, empresa, rubro y rubros sin usar any.
 */
function mapOfertaToJob(row: OfertaQueryRow): Job {
  const empresaData: EmpresaPublica | Empresa | null = row.empresa ?? row.company ?? null;
  const primaryRubro: Rubro | null = row.rubro ?? null;

  const rubrosMap = new Map<number, Rubro>();
  if (primaryRubro) {
    rubrosMap.set(primaryRubro.id, primaryRubro);
  }
  if (Array.isArray(row.ofertas_rubros)) {
    for (const item of row.ofertas_rubros) {
      if (item?.rubro && typeof item.rubro.id === 'number') {
        rubrosMap.set(item.rubro.id, item.rubro);
      }
    }
  }

  const rubrosList = Array.from(rubrosMap.values());
  const effectiveRubro = primaryRubro ?? (rubrosList.length > 0 ? rubrosList[0] : null);

  return {
    ...row,
    company_id: row.empresa_id,
    company: empresaData,
    empresa: empresaData,
    rubro: effectiveRubro,
    rubros: rubrosList,
  };
}

/**
 * Resuelve un filtro de rubro (que puede venir como ID numérico o como nombre de rubro)
 * devolviendo los IDs de rubros correspondientes y los IDs de ofertas vinculadas en ofertas_rubros.
 */
async function resolveRubroFilter(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  rubroFilter: string
): Promise<{ rubroIds: number[]; ofertaIdsFromJoin: string[] } | null> {
  const trimmed = rubroFilter.trim();
  if (!trimmed || trimmed.toLowerCase() === 'todos') {
    return null;
  }

  let rubroIds: number[] = [];
  const parsedId = Number(trimmed);

  if (Number.isInteger(parsedId) && parsedId > 0 && String(parsedId) === trimmed) {
    rubroIds = [parsedId];
  } else {
    const { data: matchedRubros, error: rubroError } = await supabase
      .from('rubros')
      .select('id')
      .eq('activo', true)
      .ilike('nombre', `%${trimmed}%`);

    if (rubroError) {
      console.error('Error consultando rubros por nombre en getJobs:', rubroError.message);
      return { rubroIds: [], ofertaIdsFromJoin: [] };
    }

    rubroIds = (matchedRubros ?? []).map((r) => r.id);
  }

  if (rubroIds.length === 0) {
    return { rubroIds: [], ofertaIdsFromJoin: [] };
  }

  const { data: linkedRows, error: linkedError } = await supabase
    .from('ofertas_rubros')
    .select('oferta_id')
    .in('rubro_id', rubroIds);

  if (linkedError) {
    console.error('Error consultando relación ofertas_rubros en getJobs:', linkedError.message);
    return { rubroIds, ofertaIdsFromJoin: [] };
  }

  const ofertaIdsFromJoin = Array.from(
    new Set((linkedRows ?? []).map((r) => r.oferta_id).filter(Boolean))
  );

  return { rubroIds, ofertaIdsFromJoin };
}

/**
 * Obtiene el listado de ofertas laborales publicadas desde Supabase,
 * aplicando filtros de búsqueda, rubro (por ID o nombre e incluyendo ofertas_rubros),
 * jornada, zona y destacadas.
 */
export async function getJobs(filters?: JobFilterParams): Promise<{ jobs: Job[]; total: number }> {
  try {
    const supabase = await getSupabase();

    let resolvedRubro: { rubroIds: number[]; ofertaIdsFromJoin: string[] } | null = null;
    if (filters?.rubro && filters.rubro.trim() !== '' && filters.rubro.trim().toLowerCase() !== 'todos') {
      resolvedRubro = await resolveRubroFilter(supabase, filters.rubro);
      if (resolvedRubro && resolvedRubro.rubroIds.length === 0) {
        return { jobs: [], total: 0 };
      }
    }

    const buildQuery = (selectClause: string) => {
      const hoyIso = new Date().toISOString().split('T')[0];
      let qBuilder = supabase
        .from('ofertas')
        .select(selectClause, { count: 'exact' })
        .eq('estado', 'publicada')
        .is('deleted_at', null)
        .or('fecha_limite.is.null,fecha_limite.gte.' + hoyIso);

      if (filters) {
        const { query: searchText, jornada, zona, destacadasOnly } = filters;

        if (searchText && searchText.trim() !== '') {
          const q = searchText.trim();
          qBuilder = qBuilder.or(
            `titulo.ilike.%${q}%,descripcion.ilike.%${q}%,requisitos.ilike.%${q}%,ubicacion.ilike.%${q}%`
          );
        }

        if (resolvedRubro && resolvedRubro.rubroIds.length > 0) {
          const rubroIdsCsv = resolvedRubro.rubroIds.join(',');
          if (resolvedRubro.ofertaIdsFromJoin.length > 0) {
            const ofertaIdsCsv = resolvedRubro.ofertaIdsFromJoin.join(',');
            qBuilder = qBuilder.or(`rubro_id.in.(${rubroIdsCsv}),id.in.(${ofertaIdsCsv})`);
          } else {
            qBuilder = qBuilder.in('rubro_id', resolvedRubro.rubroIds);
          }
        }

        if (jornada && jornada !== 'todas') {
          qBuilder = qBuilder.ilike('tipo_jornada', `%${jornada}%`);
        }

        if (zona && zona !== 'todas') {
          qBuilder = qBuilder.ilike('ubicacion', `%${zona}%`);
        }

        if (destacadasOnly) {
          qBuilder = qBuilder.eq('destacada', true);
        }
      }

      return qBuilder
        .order('destacada', { ascending: false })
        .order('created_at', { ascending: false });
    };

    let { data, count, error } = await buildQuery(OFERTA_SELECT_WITH_EMPRESA);

    // Si la migración 006 aún no fue ejecutada en Supabase y el rol anon recibe 42501 sobre public.empresas,
    // registrar diagnóstico explícito y consultar con la proyección base verificada.
    if (error && error.code === '42501') {
      console.warn(
        '[Supabase 42501] Permiso SELECT sobre columnas públicas de public.empresas pendiente de aplicar (Migración 006):',
        error.message
      );
      const retry = await buildQuery(OFERTA_SELECT_BASE);
      data = retry.data;
      count = retry.count;
      error = retry.error;
    }

    if (error) {
      console.error('Error consultando ofertas en Supabase:', error.message);
      return { jobs: [], total: 0 };
    }

    const rows = (data ?? []) as unknown as OfertaQueryRow[];
    const jobs: Job[] = rows.map((row) => mapOfertaToJob(row));

    return {
      jobs,
      total: count ?? jobs.length,
    };
  } catch (err) {
    console.error('Error inesperado en getJobs:', err);
    return { jobs: [], total: 0 };
  }
}

/**
 * Obtiene una oferta laboral publicada por su UUID identificador.
 */
export async function getJobById(id: string): Promise<Job | null> {
  try {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('ofertas')
      .select(OFERTA_SELECT_WITH_EMPRESA)
      .eq('id', id)
      .eq('estado', 'publicada')
      .is('deleted_at', null)
      .maybeSingle();

    if (error && error.code === '42501') {
      console.warn(
        '[Supabase 42501] Permiso SELECT sobre columnas públicas de public.empresas pendiente de aplicar (Migración 006):',
        error.message
      );
      const retry = await supabase
        .from('ofertas')
        .select(OFERTA_SELECT_BASE)
        .eq('id', id)
        .eq('estado', 'publicada')
        .is('deleted_at', null)
        .maybeSingle();

      if (retry.error) {
        console.error('Error obteniendo oferta por id en Supabase:', retry.error.message);
        return null;
      }
      if (!retry.data) {
        return null;
      }
      return mapOfertaToJob(retry.data as unknown as OfertaQueryRow);
    }

    if (error) {
      console.error('Error obteniendo oferta por id en Supabase:', error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapOfertaToJob(data as unknown as OfertaQueryRow);
  } catch (err) {
    console.error('Error inesperado obteniendo oferta por id:', err);
    return null;
  }
}

/**
 * Obtiene todos los IDs de ofertas publicadas para rutas dinámicas.
 */
export async function getAllJobIds(): Promise<string[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('ofertas')
      .select('id')
      .eq('estado', 'publicada')
      .is('deleted_at', null);

    if (error) {
      console.error('Error al obtener IDs de ofertas:', error.message);
      return [];
    }
    if (!data) return [];
    return data.map((item) => item.id);
  } catch (err) {
    console.error('Error inesperado en getAllJobIds:', err);
    return [];
  }
}

/**
 * Obtiene los rubros o categorías laborales activas desde la base de datos.
 */
export async function getRubros(): Promise<Rubro[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('rubros')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) {
      console.error('Error al consultar rubros en Supabase:', error.message);
      return [];
    }

    return (data ?? []) as Rubro[];
  } catch (err) {
    console.error('Error inesperado al obtener rubros:', err);
    return [];
  }
}

/**
 * Obtiene ofertas laborales similares o del mismo rubro (considerando rubro_id y ofertas_rubros),
 * completando con otras ofertas publicadas vigentes de Funes cuando existen menos de `limit` en el mismo rubro.
 */
export async function getSimilarJobs(
  currentJobId: string,
  rubroId?: number | null,
  limit: number = 3
): Promise<Job[]> {
  try {
    const supabase = await getSupabase();

    let linkedOfertaIds: string[] = [];
    if (rubroId) {
      const { data: linkedRows } = await supabase
        .from('ofertas_rubros')
        .select('oferta_id')
        .eq('rubro_id', rubroId);
      linkedOfertaIds = Array.from(
        new Set(
          (linkedRows ?? [])
            .map((r) => r.oferta_id)
            .filter((oid) => Boolean(oid) && oid !== currentJobId)
        )
      );
    }

    const buildSimilarQuery = (selectClause: string, filterByRubro: boolean) => {
      let qBuilder = supabase
        .from('ofertas')
        .select(selectClause)
        .neq('id', currentJobId)
        .eq('estado', 'publicada')
        .is('deleted_at', null);

      if (filterByRubro && rubroId) {
        if (linkedOfertaIds.length > 0) {
          qBuilder = qBuilder.or(
            `rubro_id.eq.${rubroId},id.in.(${linkedOfertaIds.join(',')})`
          );
        } else {
          qBuilder = qBuilder.eq('rubro_id', rubroId);
        }
      }

      return qBuilder
        .order('destacada', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
    };

    let { data, error } = await buildSimilarQuery(OFERTA_SELECT_WITH_EMPRESA, Boolean(rubroId));

    if (error && error.code === '42501') {
      const retry = await buildSimilarQuery(OFERTA_SELECT_BASE, Boolean(rubroId));
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Error al obtener ofertas similares:', error.message);
      return [];
    }

    const primaryRows = (data ?? []) as unknown as OfertaQueryRow[];
    const primaryJobs = primaryRows.map((row) => mapOfertaToJob(row));

    if (!rubroId || primaryJobs.length >= limit) {
      return primaryJobs.slice(0, limit);
    }

    // Completar hasta `limit` con otras ofertas publicadas vigentes en Funes
    let fallbackRes = await buildSimilarQuery(OFERTA_SELECT_WITH_EMPRESA, false);
    if (fallbackRes.error && fallbackRes.error.code === '42501') {
      fallbackRes = await buildSimilarQuery(OFERTA_SELECT_BASE, false);
    }

    if (fallbackRes.error || !fallbackRes.data) {
      return primaryJobs;
    }

    const seenIds = new Set(primaryJobs.map((j) => j.id));
    const fallbackRows = (fallbackRes.data ?? []) as unknown as OfertaQueryRow[];
    for (const row of fallbackRows) {
      if (primaryJobs.length >= limit) break;
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        primaryJobs.push(mapOfertaToJob(row));
      }
    }

    return primaryJobs;
  } catch (err) {
    console.error('Error inesperado en getSimilarJobs:', err);
    return [];
  }
}

export interface ApplicationInput {
  jobId: string;
  postulanteId?: string;
  cvId?: string | null;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni: string;
  esResidenteFunes: boolean;
  direccion?: string;
  localidad?: string;
  mensaje?: string;
  situacionLaboral?: string;
}

/**
 * Registra formalmente una postulación en public.postulaciones en Supabase.
 * - Verifica identidad, vigencia y rol 'postulante' en public.perfil.
 * - Verifica que la oferta exista, esté publicada y sin baja lógica.
 * - Valida y sincroniza datos de contacto/identidad en public.perfil si fueron completados o actualizados.
 * - Asocia cv_id únicamente si pertenece al postulante autenticado, está activo y sin baja lógica.
 * - Controla unicidad mediante la restricción unique_postulacion_usuario_oferta.
 */
export async function submitJobApplication(
  data: ApplicationInput
): Promise<{
  success: boolean;
  message: string;
  applicationId?: string;
  alreadyApplied?: boolean;
}> {
  try {
    const supabase = await getSupabase();

    // 1. Verificar sesión autenticada
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Debés iniciar sesión con tu cuenta de postulante para enviar tu postulación.',
      };
    }

    if (data.postulanteId && data.postulanteId !== user.id) {
      return {
        success: false,
        message: 'Operación denegada: el identificador de postulante no coincide con tu sesión activa.',
      };
    }

    // 2. Verificar existencia, vigencia y rol del perfil en public.perfil
    const { data: perfil, error: perfilError } = await supabase
      .from('perfil')
      .select(
        'id, rol, activo, deleted_at, nombre, apellido, dni, telefono, localidad, direccion, es_residente_funes'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (perfilError || !perfil) {
      return {
        success: false,
        message: 'No se encontró un perfil válido asociado a tu cuenta.',
      };
    }

    if (!perfil.activo || perfil.deleted_at !== null) {
      return {
        success: false,
        message: 'Tu cuenta de perfil se encuentra desactivada.',
      };
    }

    if (perfil.rol !== 'postulante') {
      return {
        success: false,
        message: 'Solo los usuarios registrados con perfil de postulante pueden postularse a ofertas laborales.',
      };
    }

    // 2b. Verificar que la oferta laboral exista, esté publicada y no tenga baja lógica
    const { data: ofertaVigencia, error: ofertaError } = await supabase
      .from('ofertas')
      .select('id, estado, deleted_at')
      .eq('id', data.jobId)
      .eq('estado', 'publicada')
      .is('deleted_at', null)
      .maybeSingle();

    if (ofertaError || !ofertaVigencia) {
      return {
        success: false,
        message: 'Esta oferta laboral ya no se encuentra disponible o su convocatoria fue cerrada.',
      };
    }

    // 3. Validar datos personales, teléfono y localidad antes de actualizar el perfil o registrar la postulación
    const cleanNombre = (data.nombre?.trim() || perfil.nombre?.trim() || '').trim();
    const cleanApellido = (data.apellido?.trim() || perfil.apellido?.trim() || '').trim();
    if (!cleanNombre || !cleanApellido) {
      return {
        success: false,
        message: 'Por favor completá tu nombre y apellido.',
      };
    }

    const rawDni = (data.dni?.trim() || perfil.dni?.trim() || '').trim();
    const cleanDni = rawDni.replace(/\D/g, '');
    if (!cleanDni || cleanDni.length < 7 || cleanDni.length > 8) {
      return {
        success: false,
        message: 'Por favor ingresá un número de DNI válido (7 u 8 dígitos sin puntos).',
      };
    }

    const cleanTelefono = (data.telefono?.trim() || perfil.telefono?.trim() || '').trim();
    if (!cleanTelefono || !validatePhone(cleanTelefono)) {
      return {
        success: false,
        message: 'Por favor ingresá un número de teléfono o WhatsApp válido (mínimo 8 dígitos numéricos).',
      };
    }

    const cleanLocalidad = (data.localidad?.trim() || perfil.localidad?.trim() || '').trim();
    if (!cleanLocalidad) {
      return {
        success: false,
        message: 'Por favor ingresá tu localidad de residencia.',
      };
    }

    const cleanDireccion = data.direccion?.trim();
    const calculatedResidenteFunes = cleanLocalidad.toLowerCase() === 'funes';

    // Actualizar datos en public.perfil solo si cambiaron respecto a los valores actuales
    const needsPerfilUpdate =
      cleanNombre !== (perfil.nombre ?? '') ||
      cleanApellido !== (perfil.apellido ?? '') ||
      cleanDni !== (perfil.dni ?? '') ||
      cleanTelefono !== (perfil.telefono ?? '') ||
      cleanLocalidad !== (perfil.localidad ?? '') ||
      calculatedResidenteFunes !== Boolean(perfil.es_residente_funes) ||
      (cleanDireccion !== undefined && cleanDireccion !== '' && cleanDireccion !== (perfil.direccion ?? ''));

    if (needsPerfilUpdate) {
      const updatePayload: {
        nombre: string;
        apellido: string;
        dni: string;
        telefono: string;
        localidad: string;
        es_residente_funes: boolean;
        direccion?: string;
      } = {
        nombre: cleanNombre,
        apellido: cleanApellido,
        dni: cleanDni,
        telefono: cleanTelefono,
        localidad: cleanLocalidad,
        es_residente_funes: calculatedResidenteFunes,
      };

      if (cleanDireccion !== undefined && cleanDireccion !== '') {
        updatePayload.direccion = cleanDireccion;
      }

      const { error: updatePerfilError } = await supabase
        .from('perfil')
        .update(updatePayload)
        .eq('id', user.id)
        .eq('rol', 'postulante');

      if (updatePerfilError) {
        console.error('Error al actualizar datos de contacto del postulante:', updatePerfilError);
        const lowerMsg = updatePerfilError.message.toLowerCase();
        if (
          lowerMsg.includes('dni') ||
          updatePerfilError.message.includes('idx_perfil_dni_numerico_unico') ||
          updatePerfilError.message.includes('perfil_dni_key')
        ) {
          return {
            success: false,
            message: 'El DNI ingresado ya se encuentra registrado en otra cuenta del sistema.',
          };
        }
        return {
          success: false,
          message: `No se pudieron actualizar tus datos de contacto en el perfil: ${updatePerfilError.message}`,
        };
      }
    }

    // 4. Verificar y exigir un CV activo perteneciente al postulante autenticado (Decisión 1 de Fase 5)
    let verifiedCvId: string | null = null;
    let verifiedCvSnapshotUrl: string | null = null;

    if (data.cvId) {
      const { data: selectedCv, error: cvError } = await supabase
        .from('curriculums')
        .select('id, postulante_id, archivo_url, activo, deleted_at')
        .eq('id', data.cvId)
        .eq('postulante_id', user.id)
        .eq('activo', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (cvError || !selectedCv) {
        return {
          success: false,
          message: 'El currículum seleccionado no es válido, fue archivado o no pertenece a tu cuenta.',
        };
      }
      verifiedCvId = selectedCv.id;
      verifiedCvSnapshotUrl = selectedCv.archivo_url;
    } else {
      // Si no se especificó un cvId explícito, buscar el CV principal (o más reciente) activo del postulante
      const { data: principalCv, error: principalCvError } = await supabase
        .from('curriculums')
        .select('id, archivo_url')
        .eq('postulante_id', user.id)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('es_principal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (principalCvError) {
        console.error('Error verificando currículum activo del postulante:', principalCvError.message);
      } else if (principalCv) {
        verifiedCvId = principalCv.id;
        verifiedCvSnapshotUrl = principalCv.archivo_url;
      }
    }

    if (!verifiedCvId) {
      return {
        success: false,
        message: 'Debés seleccionar o cargar al menos un Currículum Vitae activo para postularte.',
      };
    }

    // 4b. Verificar si ya existe una postulación previa para (oferta_id, postulante_id)
    const { data: existingApp } = await supabase
      .from('postulaciones')
      .select('id, estado')
      .eq('oferta_id', data.jobId)
      .eq('postulante_id', user.id)
      .maybeSingle();

    if (existingApp) {
      if (existingApp.estado === 'retirado_por_postulante') {
        // Reactivar la postulación retirada (Decisión 2 - Opción B)
        const cleanMensaje = data.mensaje?.trim() || null;

        const { error: rpcReactivateError } = await supabase.rpc('reactivar_postulacion', {
          p_postulacion_id: existingApp.id,
          p_cv_id: verifiedCvId,
          p_mensaje: cleanMensaje,
        });

        if (rpcReactivateError) {
          console.error('Error al reactivar postulación retirada:', rpcReactivateError);
          return {
            success: false,
            message:
              rpcReactivateError.code === 'PGRST202'
                ? 'La reactivación de postulaciones retiradas requiere aplicar la Migración 008 en Supabase.'
                : `No se pudo reactivar tu postulación: ${rpcReactivateError.message}`,
          };
        }

        return {
          success: true,
          applicationId: existingApp.id,
          message:
            'Tu postulación ha sido reactivada con éxito y enviada nuevamente a la Oficina de Empleo de Funes.',
        };
      }

      return {
        success: false,
        alreadyApplied: true,
        applicationId: existingApp.id,
        message:
          'Ya te has postulado a esta oferta laboral previamente. Tu perfil se encuentra en evaluación.',
      };
    }

    // 5. Insertar en public.postulaciones
    const { data: postulacion, error } = await supabase
      .from('postulaciones')
      .insert({
        oferta_id: data.jobId,
        postulante_id: user.id,
        cv_id: verifiedCvId,
        cv_url_snapshot: verifiedCvSnapshotUrl,
        estado: 'postulado',
        mensaje_postulante: data.mensaje?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      // Manejo de postulación previa duplicada (código PostgreSQL 23505)
      if (
        error.code === '23505' ||
        error.message.includes('unique_postulacion_usuario_oferta') ||
        error.message.includes('duplicate key')
      ) {
        const { data: existingApp } = await supabase
          .from('postulaciones')
          .select('id')
          .eq('oferta_id', data.jobId)
          .eq('postulante_id', user.id)
          .maybeSingle();

        return {
          success: false,
          alreadyApplied: true,
          applicationId: existingApp?.id,
          message:
            'Ya te has postulado a esta oferta laboral previamente. Tu perfil se encuentra en evaluación.',
        };
      }

      console.error('Error al insertar postulación:', error);
      return {
        success: false,
        message: `No se pudo registrar la postulación: ${error.message}`,
      };
    }

    return {
      success: true,
      message:
        'Tu postulación ha sido recibida con éxito por la Oficina de Empleo de Funes. Un orientador evaluará tu perfil y te contactará.',
      applicationId: postulacion.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado al postularse';
    return {
      success: false,
      message,
    };
  }
}
