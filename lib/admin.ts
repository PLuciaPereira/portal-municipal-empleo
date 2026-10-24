import { createClient } from '@/lib/supabase/client';
import {
  Empresa,
  EstadoEmpresa,
  Oferta,
  JobStatus,
  Rubro,
  Perfil,
  Curriculum,
  ApplicationStatus,
  Curso,
  PostulanteCurso,
  EstadoPostulanteCurso,
} from '@/types/database';

export interface GetEmpresasAdminParams {
  estado?: EstadoEmpresa | 'todas';
  query?: string;
}

export type AdminOfertaFilter = JobStatus | 'todas' | 'bajas';

export interface GetOfertasAdminParams {
  filtro?: AdminOfertaFilter;
  query?: string;
}

export interface GetPostulantesAdminParams {
  localidad?: string;
  nivelEducativo?: string;
  situacionLaboral?: string;
  query?: string;
}

export type PostulanteAdminItem = Perfil & {
  curriculums?: Curriculum[];
};

export type PostulacionAdminItem = {
  id: string;
  oferta_id: string;
  postulante_id: string;
  cv_id: string | null;
  cv_url_snapshot: string | null;
  estado: ApplicationStatus;
  mensaje_postulante: string | null;
  notas_oficina_empleo: string | null;
  derivado_por: string | null;
  fecha_derivacion: string | null;
  observaciones_derivacion: string | null;
  motivo_rechazo_empresa: string | null;
  fecha_rechazo_empresa: string | null;
  fecha_respuesta_empresa: string | null;
  created_at: string;
  updated_at: string;
  postulante: Pick<
    Perfil,
    | 'id'
    | 'nombre'
    | 'apellido'
    | 'dni'
    | 'telefono'
    | 'direccion'
    | 'localidad'
    | 'nivel_educativo'
    | 'habilidades'
    | 'experiencia_resumen'
  > | null;
  cv: Curriculum | null;
};

export interface AdminCounts {
  empresasPendientes: number;
  ofertasPendientes: number;
  postulantesActivos: number;
  intermediacionesActivas: number;
}

export type OfertaAdminItem = Oferta & {
  empresa: Pick<Empresa, 'id' | 'nombre_fantasia' | 'razon_social' | 'localidad' | 'verificada' | 'telefono' | 'email_contacto'> | null;
  rubro: Rubro | null;
  postulaciones_count?: number;
};

/**
 * Obtener listado de empresas para la Oficina de Empleo
 */
export async function getEmpresasAdmin(
  params?: GetEmpresasAdminParams
): Promise<{ data: Empresa[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.estado && params.estado !== 'todas') {
      query = query.eq('estado', params.estado);
    }

    if (params?.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      query = query.or(
        `razon_social.ilike.${q},nombre_fantasia.ilike.${q},cuit.ilike.${q},localidad.ilike.${q},rubro.ilike.${q}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener empresas para admin:', error);
      return { data: null, error: error.message };
    }

    return { data: (data as Empresa[]) || [], error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en getEmpresasAdmin:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error inesperado al cargar empresas.',
    };
  }
}

/**
 * Aprobar una empresa registrada
 */
export async function aprobarEmpresa(
  empresaId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión administrativa no válida.' };
    }

    const { error } = await supabase
      .from('empresas')
      .update({
        estado: 'aprobada',
        verificada: true,
        motivo_rechazo: null,
        revisado_por: user.id,
        fecha_revision: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', empresaId);

    if (error) {
      console.error('Error al aprobar empresa:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en aprobarEmpresa:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al procesar la aprobación.',
    };
  }
}

/**
 * Rechazar una empresa con motivo obligatorio
 */
export async function rechazarEmpresa(
  empresaId: string,
  motivo: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!motivo || !motivo.trim()) {
      return { success: false, error: 'El motivo de rechazo es obligatorio.' };
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión administrativa no válida.' };
    }

    const { error } = await supabase
      .from('empresas')
      .update({
        estado: 'rechazada',
        verificada: false,
        motivo_rechazo: motivo.trim(),
        revisado_por: user.id,
        fecha_revision: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', empresaId);

    if (error) {
      console.error('Error al rechazar empresa:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en rechazarEmpresa:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al procesar el rechazo.',
    };
  }
}

/**
 * Obtener listado de ofertas laborales para la Oficina de Empleo
 */
export async function getOfertasAdmin(
  params?: GetOfertasAdminParams
): Promise<{ data: OfertaAdminItem[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Columnas de empresas no ambiguas usando la FK explícita ofertas_empresa_id_fkey
    const empresaFields =
      'id, nombre_fantasia, razon_social, localidad, rubro, descripcion, sitio_web, verificada, estado';

    let query = supabase
      .from('ofertas')
      .select(`
        *,
        empresa:empresas!ofertas_empresa_id_fkey (${empresaFields}),
        rubro:rubros!jobs_rubro_id_fkey (*)
      `)
      .order('created_at', { ascending: false });

    const filtro = params?.filtro || 'todas';

    if (filtro === 'bajas') {
      query = query.not('deleted_at', 'is', null);
    } else {
      if (filtro !== 'todas') {
        query = query.eq('estado', filtro).is('deleted_at', null);
      }
    }

    if (params?.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      query = query.or(
        `titulo.ilike.${q},descripcion.ilike.${q},ubicacion.ilike.${q}`
      );
    }

    const { data: ofertasData, error: ofertasError } = await query;

    if (ofertasError) {
      console.error('Error al obtener ofertas para admin:', ofertasError);
      return { data: null, error: ofertasError.message };
    }

    // Intentar obtener conteo de postulaciones de forma segura sin romper la consulta de ofertas
    let postulacionesCounts: Record<string, number> = {};
    try {
      const { data: postData } = await supabase
        .from('postulaciones')
        .select('oferta_id');

      if (postData && Array.isArray(postData)) {
        postulacionesCounts = postData.reduce((acc, curr) => {
          if (curr.oferta_id) {
            acc[curr.oferta_id] = (acc[curr.oferta_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }
    } catch {
      // Si la sesión no tiene acceso aún, mantener conteo en 0
    }

    const formattedData: OfertaAdminItem[] = ((ofertasData || []) as unknown[]).map((rawItem) => {
      const item = rawItem as Record<string, unknown>;
      const ofertaId = item.id as string;
      return {
        ...(item as unknown as Oferta),
        empresa: (item.empresa as OfertaAdminItem['empresa']) || null,
        rubro: (item.rubro as Rubro) || null,
        postulaciones_count: postulacionesCounts[ofertaId] || 0,
      };
    });

    return { data: formattedData, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en getOfertasAdmin:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error inesperado al cargar ofertas.',
    };
  }
}

/**
 * Aprobar y Publicar una oferta laboral
 */
export async function aprobarOfertaAdmin(
  ofertaId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión administrativa no válida.' };
    }

    const { error } = await supabase
      .from('ofertas')
      .update({
        estado: 'publicada',
        motivo_rechazo: null,
        revisado_por: user.id,
        fecha_revision: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ofertaId);

    if (error) {
      console.error('Error al aprobar oferta:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en aprobarOfertaAdmin:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al procesar la aprobación de la oferta.',
    };
  }
}

/**
 * Rechazar una oferta laboral con motivo obligatorio
 */
export async function rechazarOfertaAdmin(
  ofertaId: string,
  motivo: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!motivo || !motivo.trim()) {
      return { success: false, error: 'El motivo de rechazo es obligatorio.' };
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión administrativa no válida.' };
    }

    const { error } = await supabase
      .from('ofertas')
      .update({
        estado: 'rechazada',
        motivo_rechazo: motivo.trim(),
        revisado_por: user.id,
        fecha_revision: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ofertaId);

    if (error) {
      console.error('Error al rechazar oferta:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en rechazarOfertaAdmin:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al procesar el rechazo de la oferta.',
    };
  }
}

/**
 * Dar de baja una oferta laboral con motivo obligatorio (baja lógica)
 */
export async function darDeBajaOfertaAdmin(
  ofertaId: string,
  motivo: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!motivo || !motivo.trim()) {
      return { success: false, error: 'El motivo de la baja es obligatorio.' };
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('ofertas')
      .update({
        deleted_at: new Date().toISOString(),
        motivo_baja: motivo.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ofertaId);

    if (error) {
      console.error('Error al dar de baja oferta:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en darDeBajaOfertaAdmin:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al procesar la baja de la oferta.',
    };
  }
}

/**
 * Alternar destaque de una oferta laboral (destacada = true/false)
 */
export async function toggleDestacadaOfertaAdmin(
  ofertaId: string,
  destacada: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('ofertas')
      .update({
        destacada: destacada,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ofertaId);

    if (error) {
      console.error('Error al alternar destaque de oferta:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en toggleDestacadaOfertaAdmin:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al alternar destaque de la oferta.',
    };
  }
}

/**
 * Obtener listado de postulantes para la Oficina de Empleo
 */
export async function getPostulantesAdmin(
  params?: GetPostulantesAdminParams
): Promise<{ data: PostulanteAdminItem[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('perfil')
      .select(`
        *,
        curriculums:curriculums!curriculums_postulante_id_fkey (*)
      `)
      .eq('rol', 'postulante')
      .eq('activo', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (params?.localidad && params.localidad !== 'todas') {
      query = query.ilike('localidad', `%${params.localidad.trim()}%`);
    }

    if (params?.nivelEducativo && params.nivelEducativo !== 'todos') {
      query = query.ilike('nivel_educativo', `%${params.nivelEducativo.trim()}%`);
    }

    if (params?.situacionLaboral && params.situacionLaboral !== 'todas') {
      query = query.ilike('situacion_laboral_actual', `%${params.situacionLaboral.trim()}%`);
    }

    if (params?.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      query = query.or(
        `nombre.ilike.${q},apellido.ilike.${q},dni.ilike.${q},experiencia_resumen.ilike.${q}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener postulantes para admin:', error);
      return { data: null, error: error.message };
    }

    const formatted = ((data || []) as unknown[]).map((raw) => {
      const item = raw as Record<string, unknown>;
      const rawCvs = item.curriculums;
      const cvs = Array.isArray(rawCvs)
        ? (rawCvs as Curriculum[]).filter((c) => c.activo && !c.deleted_at)
        : [];
      return {
        ...(item as unknown as Perfil),
        curriculums: cvs,
      };
    });

    return { data: formatted, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en getPostulantesAdmin:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error inesperado al cargar postulantes.',
    };
  }
}

/**
 * Obtener URL firmada para visualización de CV desde la sesión de administrador
 */
export async function getCurriculumSignedUrlAdmin(
  archivoUrl: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createClient();
    const cleanPath = archivoUrl.replace(/^postulantes-cvs\//, '');

    const { data, error } = await supabase.storage
      .from('postulantes-cvs')
      .createSignedUrl(cleanPath, 3600); // 1 hora de vigencia

    if (error) {
      console.error('Error al generar URL firmada de CV para admin:', error);
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en getCurriculumSignedUrlAdmin:', err);
    return {
      url: null,
      error: err instanceof Error ? err.message : 'Error al generar enlace seguro de CV.',
    };
  }
}

/**
 * Obtener postulaciones registradas en una oferta laboral
 */
export async function getPostulacionesPorOfertaAdmin(
  ofertaId: string
): Promise<{ data: PostulacionAdminItem[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('postulaciones')
      .select(`
        *,
        postulante:perfil!applications_postulante_id_fkey (
          id,
          nombre,
          apellido,
          dni,
          telefono,
          direccion,
          localidad,
          nivel_educativo,
          habilidades,
          experiencia_resumen
        ),
        cv:curriculums!postulaciones_cv_id_fkey (
          id,
          postulante_id,
          nombre_cv,
          archivo_url,
          es_principal,
          activo,
          created_at,
          updated_at,
          deleted_at
        )
      `)
      .eq('oferta_id', ofertaId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al obtener postulaciones por oferta para admin:', error);
      return { data: null, error: error.message };
    }

    const formatted: PostulacionAdminItem[] = ((data || []) as unknown[]).map((raw) => {
      const item = raw as Record<string, unknown>;
      return {
        ...(item as unknown as PostulacionAdminItem),
        postulante: (item.postulante as PostulacionAdminItem['postulante']) || null,
        cv: (item.cv as Curriculum) || null,
      };
    });

    return { data: formatted, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en getPostulacionesPorOfertaAdmin:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al cargar las postulaciones.',
    };
  }
}

/**
 * Cambiar estado de una postulación en el embudo de intermediación municipal
 */
export async function cambiarEstadoPostulacionAdmin(
  postulacionId: string,
  nuevoEstado: ApplicationStatus,
  payload?: {
    notasOficina?: string;
    observacionesDerivacion?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión administrativa no válida.' };
    }

    const updateFields: {
      estado: ApplicationStatus;
      updated_at: string;
      notas_oficina_empleo?: string | null;
      fecha_derivacion?: string | null;
      derivado_por?: string | null;
      observaciones_derivacion?: string | null;
    } = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    };

    if (payload?.notasOficina !== undefined) {
      updateFields.notas_oficina_empleo = payload.notasOficina?.trim() || null;
    }

    if (nuevoEstado === 'presentado_a_empresa') {
      updateFields.fecha_derivacion = new Date().toISOString();
      updateFields.derivado_por = user.id;
      if (payload?.observacionesDerivacion !== undefined) {
        updateFields.observaciones_derivacion = payload.observacionesDerivacion?.trim() || null;
      }
    }

    const { error } = await supabase
      .from('postulaciones')
      .update(updateFields)
      .eq('id', postulacionId);

    if (error) {
      console.error('Error al actualizar estado de postulación:', error);
      return { success: false, error: error.message };
    }

    // Registrar en historial_postulacion
    try {
      await supabase.from('historial_postulacion').insert({
        postulacion_id: postulacionId,
        estado_anterior: null,
        estado_nuevo: nuevoEstado,
        cambiado_por: user.id,
        observaciones:
          nuevoEstado === 'presentado_a_empresa'
            ? 'Candidato formalmente derivado a la empresa por la Oficina de Empleo.'
            : nuevoEstado === 'no_seleccionado'
            ? payload?.notasOficina || 'Proceso finalizado por la Oficina de Empleo.'
            : `Estado actualizado a ${nuevoEstado} por la Oficina de Empleo.`,
      });
    } catch (histErr) {
      console.warn('Aviso: no se pudo registrar fila en historial_postulacion:', histErr);
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Error inesperado en cambiarEstadoPostulacionAdmin:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al procesar el cambio de estado.',
    };
  }
}

/**
 * Contadores globales para el panel administrativo
 */
export async function getAdminCounts(): Promise<AdminCounts> {
  const counts: AdminCounts = {
    empresasPendientes: 0,
    ofertasPendientes: 0,
    postulantesActivos: 0,
    intermediacionesActivas: 0,
  };

  try {
    const supabase = createClient();

    const [resEmpresas, resOfertas, resPostulantes, resIntermediaciones] = await Promise.all([
      supabase
        .from('empresas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente'),
      supabase
        .from('ofertas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente_revision')
        .is('deleted_at', null),
      supabase
        .from('perfil')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'postulante')
        .eq('activo', true)
        .is('deleted_at', null),
      supabase
        .from('postulaciones')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['en_revision', 'preseleccionado', 'entrevista', 'presentado_a_empresa']),
    ]);

    counts.empresasPendientes = resEmpresas.count || 0;
    counts.ofertasPendientes = resOfertas.count || 0;
    counts.postulantesActivos = resPostulantes.count || 0;
    counts.intermediacionesActivas = resIntermediaciones.count || 0;
  } catch (err) {
    console.error('Error al obtener contadores administrativos:', err);
  }

  return counts;
}

// ==============================================================================
// 5. CURSOS Y CAPACITACIONES (TAREA 7.5)
// ==============================================================================

export interface GetCursosAdminParams {
  filtro?: 'activos' | 'inactivos' | 'todos';
  query?: string;
}

export type PostulanteCursoAdminItem = PostulanteCurso & {
  curso?: Curso;
  postulante?: Pick<
    Perfil,
    'id' | 'nombre' | 'apellido' | 'dni' | 'telefono' | 'localidad'
  >;
};

/**
 * Obtiene el catálogo de cursos para la administración
 */
export async function getCursosAdmin(
  params: GetCursosAdminParams = {}
): Promise<Curso[]> {
  try {
    const supabase = createClient();
    let query = supabase.from('cursos').select('*').order('created_at', { ascending: false });

    if (params.filtro === 'activos') {
      query = query.eq('activo', true);
    } else if (params.filtro === 'inactivos') {
      query = query.eq('activo', false);
    }

    if (params.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      query = query.or(`titulo.ilike.${q},descripcion.ilike.${q},institucion.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener cursos admin:', error);
      return [];
    }

    return (data || []) as Curso[];
  } catch (err) {
    console.error('Error inesperado al obtener cursos:', err);
    return [];
  }
}

/**
 * Crea un nuevo curso en el catálogo municipal
 */
export async function crearCursoAdmin(datos: {
  titulo: string;
  descripcion?: string | null;
  institucion?: string | null;
  duracion?: string | null;
  activo?: boolean;
}): Promise<{ success: boolean; curso?: Curso; error?: string }> {
  try {
    const supabase = createClient();

    const insertPayload = {
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion?.trim() || null,
      institucion: datos.institucion?.trim() || null,
      duracion: datos.duracion?.trim() || null,
      activo: datos.activo !== undefined ? datos.activo : true,
    };

    const { data, error } = await supabase
      .from('cursos')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al insertar curso:', error);
      return { success: false, error: error.message };
    }

    return { success: true, curso: data as Curso };
  } catch (err) {
    console.error('Error inesperado al crear curso:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al crear el curso.',
    };
  }
}

/**
 * Actualiza la información de un curso existente
 */
export async function actualizarCursoAdmin(
  id: string,
  datos: {
    titulo?: string;
    descripcion?: string | null;
    institucion?: string | null;
    duracion?: string | null;
    activo?: boolean;
  }
): Promise<{ success: boolean; curso?: Curso; error?: string }> {
  try {
    const supabase = createClient();

    const updatePayload: Partial<Curso> = {};
    if (datos.titulo !== undefined) updatePayload.titulo = datos.titulo.trim();
    if (datos.descripcion !== undefined) updatePayload.descripcion = datos.descripcion?.trim() || null;
    if (datos.institucion !== undefined) updatePayload.institucion = datos.institucion?.trim() || null;
    if (datos.duracion !== undefined) updatePayload.duracion = datos.duracion?.trim() || null;
    if (datos.activo !== undefined) updatePayload.activo = datos.activo;

    const { data, error } = await supabase
      .from('cursos')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar curso:', error);
      return { success: false, error: error.message };
    }

    return { success: true, curso: data as Curso };
  } catch (err) {
    console.error('Error inesperado al actualizar curso:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al actualizar el curso.',
    };
  }
}

/**
 * Activa o desactiva la disponibilidad de un curso
 */
export async function toggleEstadoCursoAdmin(
  id: string,
  activo: boolean
): Promise<{ success: boolean; error?: string }> {
  return actualizarCursoAdmin(id, { activo });
}

/**
 * Obtiene todas las asignaciones de cursos a postulantes, con datos del postulante y curso
 */
export async function getAsignacionesCursosAdmin(params: {
  cursoId?: string;
  postulanteId?: string;
  estado?: EstadoPostulanteCurso | 'todos';
  query?: string;
} = {}): Promise<PostulanteCursoAdminItem[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('postulante_cursos')
      .select(`
        *,
        curso:cursos (
          id,
          titulo,
          descripcion,
          institucion,
          duracion,
          activo
        ),
        postulante:perfil (
          id,
          nombre,
          apellido,
          dni,
          telefono,
          localidad
        )
      `)
      .order('fecha_asignacion', { ascending: false });

    if (params.cursoId && params.cursoId !== 'todos') {
      query = query.eq('curso_id', params.cursoId);
    }

    if (params.postulanteId) {
      query = query.eq('postulante_id', params.postulanteId);
    }

    if (params.estado && params.estado !== 'todos') {
      query = query.eq('estado', params.estado);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al consultar asignaciones de cursos:', error);
      return [];
    }

    let items = (data || []) as unknown as PostulanteCursoAdminItem[];

    if (params.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      items = items.filter((item) => {
        const nombre = `${item.postulante?.nombre || ''} ${item.postulante?.apellido || ''}`.toLowerCase();
        const dni = item.postulante?.dni?.toLowerCase() || '';
        const cursoTitulo = item.curso?.titulo?.toLowerCase() || '';
        const institucion = item.curso?.institucion?.toLowerCase() || '';
        return nombre.includes(q) || dni.includes(q) || cursoTitulo.includes(q) || institucion.includes(q);
      });
    }

    return items;
  } catch (err) {
    console.error('Error inesperado al consultar asignaciones de cursos:', err);
    return [];
  }
}

/**
 * Deriva / Asigna un postulante a un curso específico
 */
export async function asignarPostulanteACursoAdmin(params: {
  postulante_id: string;
  curso_id: string;
  observaciones?: string;
}): Promise<{ success: boolean; asignacion?: PostulanteCurso; error?: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Validar si ya está asignado a ese curso y no fue cancelado ni abandonado
    const { data: existente } = await supabase
      .from('postulante_cursos')
      .select('id, estado')
      .eq('postulante_id', params.postulante_id)
      .eq('curso_id', params.curso_id)
      .in('estado', ['asignado', 'en_curso', 'completado'])
      .maybeSingle();

    if (existente) {
      return {
        success: false,
        error: `El postulante ya se encuentra registrado en este curso (estado: ${existente.estado}).`,
      };
    }

    const insertPayload = {
      postulante_id: params.postulante_id,
      curso_id: params.curso_id,
      asignado_por: user?.id || null,
      estado: 'asignado' as EstadoPostulanteCurso,
      observaciones: params.observaciones?.trim() || null,
    };

    const { data, error } = await supabase
      .from('postulante_cursos')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al derivar postulante a curso:', error);
      return { success: false, error: error.message };
    }

    return { success: true, asignacion: data as PostulanteCurso };
  } catch (err) {
    console.error('Error inesperado al derivar a curso:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al derivar al postulante.',
    };
  }
}

/**
 * Actualiza el estado de una asignación de curso (ej. en_curso, completado, etc.)
 */
export async function actualizarEstadoAsignacionCursoAdmin(
  asignacionId: string,
  nuevoEstado: EstadoPostulanteCurso,
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const updatePayload: { estado: EstadoPostulanteCurso; observaciones?: string | null } = {
      estado: nuevoEstado,
    };

    if (observaciones !== undefined) {
      updatePayload.observaciones = observaciones?.trim() || null;
    }

    const { error } = await supabase
      .from('postulante_cursos')
      .update(updatePayload)
      .eq('id', asignacionId);

    if (error) {
      console.error('Error al actualizar estado de asignación de curso:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error inesperado al actualizar asignación:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado.',
    };
  }
}

// ==============================================================================
// 6. GESTIÓN DEL EQUIPO DE ADMINISTRADORES (TAREA 7.6)
// ==============================================================================

export interface AdminUserItem {
  id: string;
  nombre: string;
  apellido: string | null;
  dni: string | null;
  telefono: string | null;
  activo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetAdministradoresAdminParams {
  filtro?: 'todos' | 'activos' | 'inactivos';
  query?: string;
}

/**
 * Obtiene el listado de administradores municipales registrados
 */
export async function getAdministradoresAdmin(
  params: GetAdministradoresAdminParams = {}
): Promise<AdminUserItem[]> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('perfil')
      .select('id, nombre, apellido, dni, telefono, activo, deleted_at, created_at, updated_at')
      .eq('rol', 'admin')
      .order('created_at', { ascending: true });

    if (params.filtro === 'activos') {
      query = query.eq('activo', true).is('deleted_at', null);
    } else if (params.filtro === 'inactivos') {
      query = query.or('activo.eq.false,deleted_at.not.is.null');
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener administradores:', error);
      return [];
    }

    let items = (data || []) as AdminUserItem[];

    if (params.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      items = items.filter((admin) => {
        const full = `${admin.nombre || ''} ${admin.apellido || ''}`.toLowerCase();
        const dni = admin.dni?.toLowerCase() || '';
        return full.includes(q) || dni.includes(q);
      });
    }

    return items;
  } catch (err) {
    console.error('Error inesperado al consultar administradores:', err);
    return [];
  }
}

/**
 * Desactiva a un administrador (baja lógica ejecutada entre pares).
 * Llama a la función PostgreSQL `desactivar_admin(p_admin_id)` protegida por RLS.
 */
export async function desactivarAdmin(adminId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('desactivar_admin', {
      p_admin_id: adminId,
    });

    if (error) {
      console.error('Error en RPC desactivar_admin:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error inesperado al desactivar administrador:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al desactivar administrador.',
    };
  }
}

/**
 * Reactiva a un administrador previamente dado de baja lógica.
 * Llama a la función PostgreSQL `reactivar_admin(p_admin_id)`.
 */
export async function reactivarAdmin(adminId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('reactivar_admin', {
      p_admin_id: adminId,
    });

    if (error) {
      console.error('Error en RPC reactivar_admin:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error inesperado al reactivar administrador:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al reactivar administrador.',
    };
  }
}
