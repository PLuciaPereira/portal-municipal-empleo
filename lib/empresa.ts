import { agendarEntrevistaEmpresaAction, reprogramarEntrevistaEmpresaAction, cancelarEntrevistaEmpresaAction } from '@/app/empresa/actions';
import {
  Database,
  Empresa,
  JobStatus,
  Oferta,
  Rubro,
  VistaCandidatoEmpresa,
} from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { notificarAdmins, crearNotificacionDeduplicada } from '@/lib/notifications';
import { darDeBajaOfertaEmpresaAction } from '@/app/empresa/actions';

export interface CreateOfertaInput {
  titulo: string;
  descripcion: string;
  requisitos: string;
  experiencia_requerida?: string | null;
  tipo_jornada: string;
  tipo_contrato?: string | null;
  ubicacion?: string;
  rango_salarial?: string | null;
  vacantes: number;
  fecha_limite?: string | null;
  rubro_id?: number | null;
  rubroIds?: number[];
}

export interface UpdateOfertaInput extends Partial<CreateOfertaInput> {
  id: string;
}

export interface EmpresaDashboardData {
  empresa: Empresa | null;
  ofertas: (Oferta & {
    rubro: Rubro | null;
    ofertas_rubros: { rubro_id: number; rubro: Rubro | null }[];
    candidatos_count?: number;
  })[];
  candidatos: VistaCandidatoEmpresa[];
}

/**
 * Obtiene el perfil de empresa asociado al usuario autenticado.
 */
export async function getMiEmpresa(): Promise<{
  data: Empresa | null;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: 'Usuario no autenticado.' };
  }

  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Empresa | null };
}

/**
 * Lista todas las ofertas creadas por la empresa autenticada.
 */
export async function getMisOfertasEmpresa(): Promise<{
  data: (Oferta & {
    rubro: Rubro | null;
    ofertas_rubros: { rubro_id: number; rubro: Rubro | null }[];
  })[];
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: [], error: 'Usuario no autenticado.' };
  }

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!empresa) {
    return { data: [], error: 'Empresa no encontrada.' };
  }

  const { data, error } = await supabase
    .from('ofertas')
    .select(
      `
      *,
      rubro:rubros!jobs_rubro_id_fkey(*),
      ofertas_rubros!ofertas_rubros_oferta_id_fkey(
        rubro_id,
        rubro:rubros!ofertas_rubros_rubro_id_fkey(*)
      )
    `
    )
    .eq('empresa_id', empresa.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data || []) as unknown as (Oferta & {
      rubro: Rubro | null;
      ofertas_rubros: { rubro_id: number; rubro: Rubro | null }[];
    })[],
  };
}

/**
 * Crea una oferta laboral en estado inicial 'borrador' asociada a la empresa del usuario.
 */
export async function crearOfertaBorrador(input: CreateOfertaInput): Promise<{
  data: Oferta | null;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Usuario no autenticado.' };
  }

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, estado')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!empresa || (empresa as { id: string; estado: string }).estado !== 'aprobada') {
    return {
      data: null,
      error: 'La empresa debe estar aprobada por la Oficina de Empleo para crear ofertas.',
    };
  }

  if (!input.titulo?.trim()) return { data: null, error: 'El título es obligatorio.' };
  if (!input.descripcion?.trim()) return { data: null, error: 'La descripción es obligatoria.' };
  if (!input.requisitos?.trim()) return { data: null, error: 'Los requisitos son obligatorios.' };
  if (!input.tipo_jornada?.trim()) return { data: null, error: 'El tipo de jornada es obligatorio.' };
  if ((input.vacantes ?? 1) < 1) return { data: null, error: 'La cantidad de vacantes debe ser al menos 1.' };

  const primaryRubroId = input.rubro_id || (input.rubroIds && input.rubroIds.length > 0 ? input.rubroIds[0] : null);

  const { data: nuevaOferta, error: insertError } = await supabase
    .from('ofertas')
    .insert({
      empresa_id: empresa.id,
      titulo: input.titulo.trim(),
      descripcion: input.descripcion.trim(),
      requisitos: input.requisitos.trim(),
      experiencia_requerida: input.experiencia_requerida?.trim() || null,
      tipo_jornada: input.tipo_jornada.trim(),
      tipo_contrato: input.tipo_contrato?.trim() || null,
      ubicacion: input.ubicacion?.trim() || 'Funes, Santa Fe',
      rango_salarial: input.rango_salarial?.trim() || null,
      vacantes: input.vacantes,
      fecha_limite: input.fecha_limite ? input.fecha_limite : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
      })(),
      rubro_id: primaryRubroId,
      estado: 'borrador' as JobStatus,
    })
    .select()
    .single();

  if (insertError) {
    return { data: null, error: insertError.message };
  }

  // Vincular rubros secundarios si existen
  if (input.rubroIds && input.rubroIds.length > 0 && nuevaOferta) {
    const relaciones = input.rubroIds.map((rid) => ({
      oferta_id: nuevaOferta.id,
      rubro_id: rid,
    }));
    await supabase.from('ofertas_rubros').insert(relaciones);
  }

  return { data: nuevaOferta as Oferta };
}

/**
 * Actualiza los datos de una oferta en borrador.
 */
export async function actualizarOfertaBorrador(input: UpdateOfertaInput): Promise<{
  data: Oferta | null;
  error?: string;
}> {
  const supabase = createClient();

  const { data: ofertaActual, error: fetchError } = await supabase
    .from('ofertas')
    .select('id, estado')
    .eq('id', input.id)
    .single();

  if (fetchError || !ofertaActual) {
    return { data: null, error: 'Oferta no encontrada.' };
  }

  if (ofertaActual.estado !== 'borrador') {
    return {
      data: null,
      error: 'Solo se pueden editar ofertas en estado Borrador.',
    };
  }

  const updatePayload: Database['public']['Tables']['ofertas']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (input.titulo !== undefined) updatePayload.titulo = input.titulo.trim();
  if (input.descripcion !== undefined) updatePayload.descripcion = input.descripcion.trim();
  if (input.requisitos !== undefined) updatePayload.requisitos = input.requisitos.trim();
  if (input.experiencia_requerida !== undefined)
    updatePayload.experiencia_requerida = input.experiencia_requerida?.trim() || null;
  if (input.tipo_jornada !== undefined) updatePayload.tipo_jornada = input.tipo_jornada.trim();
  if (input.tipo_contrato !== undefined) updatePayload.tipo_contrato = input.tipo_contrato?.trim() || null;
  if (input.ubicacion !== undefined) updatePayload.ubicacion = input.ubicacion.trim();
  if (input.rango_salarial !== undefined) updatePayload.rango_salarial = input.rango_salarial?.trim() || null;
  if (input.vacantes !== undefined) updatePayload.vacantes = input.vacantes;
  if (input.fecha_limite !== undefined) updatePayload.fecha_limite = input.fecha_limite || null;
  if (input.rubro_id !== undefined) updatePayload.rubro_id = input.rubro_id;

  const { data: updatedOferta, error: updateError } = await supabase
    .from('ofertas')
    .update(updatePayload)
    .eq('id', input.id)
    .select()
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  if (input.rubroIds) {
    await supabase.from('ofertas_rubros').delete().eq('oferta_id', input.id);
    if (input.rubroIds.length > 0) {
      const relaciones = input.rubroIds.map((rid) => ({
        oferta_id: input.id,
        rubro_id: rid,
      }));
      await supabase.from('ofertas_rubros').insert(relaciones);
    }
  }

  return { data: updatedOferta as Oferta };
}

/**
 * Envía una oferta en borrador para revisión de la Oficina de Empleo.
 */
export async function enviarOfertaARevision(ofertaId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClient();

  const { data: oferta, error: fetchError } = await supabase
    .from('ofertas')
    .select('id, estado')
    .eq('id', ofertaId)
    .single();

  if (fetchError || !oferta) {
    return { success: false, error: 'Oferta no encontrada.' };
  }

  if (oferta.estado !== 'borrador' && oferta.estado !== 'rechazada') {
    return {
      success: false,
      error: 'Solo se pueden enviar a revisión ofertas en borrador o que requieran corrección.',
    };
  }

  const { error } = await supabase
    .from('ofertas')
    .update({
      estado: 'pendiente_revision' as JobStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ofertaId);

  if (error) {
    return { success: false, error: error.message };
  }

    // Notificar a administradores y confirmar a la empresa
  try {
    const { data: ofData } = await supabase
      .from('ofertas')
      .select('titulo, empresa:empresas(user_id, nombre_fantasia, razon_social)')
      .eq('id', ofertaId)
      .single();

    const tituloOferta = ofData?.titulo || 'Oferta';
    const nombreEmp = (ofData?.empresa as any)?.nombre_fantasia || (ofData?.empresa as any)?.razon_social || 'Una empresa';
    const empUserId = (ofData?.empresa as any)?.user_id;

    // Aviso a administradores
    await notificarAdmins({
      titulo: 'Nueva oferta para revisión',
      mensaje: `La empresa "${nombreEmp}" envió a revisión la oferta "${tituloOferta}".`,
      tipo: 'postulacion',
      link: '/admin?tab=ofertas&estado=pendiente_revision',
      agrupadorKey: 'oferta_revision_' + ofertaId,
    });

    // Confirmación a la empresa
    if (empUserId) {
      await crearNotificacionDeduplicada({
        userId: empUserId,
        titulo: 'Oferta enviada a revisión técnica',
        mensaje: `Tu oferta "${tituloOferta}" fue enviada a la Oficina de Empleo para su revisión y aprobación.`,
        tipo: 'info',
        link: '/empresa',
        agrupadorKey: 'empresa_confirma_revision_' + ofertaId,
      });
    }
  } catch (e) {
    console.warn('Aviso: no se pudo notificar envio a revision:', e);
  }

  return { success: true };
}

/**
 * Registra la baja lógica de una oferta indicando el motivo correspondiente.
 */
export async function darDeBajaOfertaEmpresa(
  ofertaId: string,
  motivo: string
): Promise<{ success: boolean; error?: string }> {
  if (!motivo?.trim()) {
    return { success: false, error: 'El motivo de baja es obligatorio.' };
  }

  // Se delega a la Server Action que cuenta con verificación estricta de propiedad y permisos para sortear RLS restrictivo en revisión
  return await darDeBajaOfertaEmpresaAction({ ofertaId, motivo });
}

/**
 * Consulta la lista de candidatos derivados por la Oficina de Empleo para las ofertas de la empresa.
 */
export async function getCandidatosPresentados(
  ofertaId?: string
): Promise<{ data: VistaCandidatoEmpresa[]; error?: string }> {
  const supabase = createClient();

  // 1. Obtener la empresa asociada al usuario autenticado
  const { data: miEmpresa, error: empError } = await getMiEmpresa();
  if (empError || !miEmpresa) {
    return { data: [], error: empError || 'Empresa no encontrada o no autorizada.' };
  }

  if (miEmpresa.estado !== 'aprobada') {
    return { data: [], error: 'La empresa debe estar aprobada para visualizar candidatos derivados.' };
  }

  // 1.1 Bloqueo en servidor: no se pueden consultar candidatos de ofertas en revisión o no aprobadas
  if (ofertaId) {
    const { data: ofertaCheck } = await supabase
      .from('ofertas')
      .select('id, estado, empresa_id')
      .eq('id', ofertaId)
      .maybeSingle();

    if (ofertaCheck && ofertaCheck.estado === 'pendiente_revision') {
      return {
        data: [],
        error: 'Los candidatos estarán disponibles cuando la oferta sea aprobada por la Oficina de Empleo.',
      };
    }
  }

  // 2. Se consulta a través de la función RPC segura obtener_candidatos_empresa o vista_candidatos_empresa
  const { data, error } = await supabase.rpc('obtener_candidatos_empresa', {
    p_oferta_id: ofertaId || null,
  });

  let rawList: VistaCandidatoEmpresa[] = [];

  // Si la RPC arroja error o devuelve vacío pero existe la vista con RLS (por disparidad de claims/sesión),
  // consultar la vista asegurando que la empresa acceda a sus candidatos derivados.
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    const viewQuery = supabase
      .from('vista_candidatos_empresa')
      .select('*')
      .order('fecha_derivacion', { ascending: false });

    if (ofertaId) {
      viewQuery.eq('oferta_id', ofertaId);
    }

    const { data: viewData, error: viewError } = await viewQuery;
    if (!viewError && viewData && viewData.length > 0) {
      rawList = viewData as VistaCandidatoEmpresa[];
    } else if (data && data.length > 0) {
      rawList = data as VistaCandidatoEmpresa[];
    } else if (viewError && error) {
      return { data: [], error: error.message || viewError.message };
    }
  } else {
    rawList = (data || []) as VistaCandidatoEmpresa[];
  }

  // 3. Defensa en profundidad: Aislamiento estricto por empresa_id en la capa de datos
  const sanitizedList = rawList.filter((candidato) => {
    if (candidato.empresa_id !== miEmpresa.id) {
      console.warn(
        `[SEGURIDAD] Candidato ${candidato.postulacion_id} con empresa_id ajeno (${candidato.empresa_id}) filtrado preventivamente.`
      );
      return false;
    }
    return true;
  });

  return { data: sanitizedList };
}

export async function rechazarCandidatoEmpresa(
  postulacionId: string,
  motivoRechazo: string
): Promise<{ success: boolean; error?: string }> {
  if (!motivoRechazo?.trim()) {
    return {
      success: false,
      error: 'El motivo de rechazo es obligatorio para registrar la decisión ante la Oficina de Empleo.',
    };
  }

  const supabase = createClient();

  const { error } = await supabase.rpc('responder_candidato_empresa', {
    p_postulacion_id: postulacionId,
    p_decision: 'rechazado',
    p_motivo_rechazo: motivoRechazo.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

    // Notificar al postulante (con motivo) y a la Oficina de Empleo
  try {
    const { data: postInfo } = await supabase
      .from('postulaciones')
      .select('postulante_id, oferta:ofertas(titulo, empresa:empresas(nombre_fantasia, razon_social))')
      .eq('id', postulacionId)
      .single();

    if (postInfo?.postulante_id) {
      const ofTitulo = (postInfo.oferta as any)?.titulo || 'la búsqueda laboral';
      const empNombre = (postInfo.oferta as any)?.empresa?.nombre_fantasia || (postInfo.oferta as any)?.empresa?.razon_social || 'La empresa';

      // Al postulante
      await crearNotificacionDeduplicada({
        userId: postInfo.postulante_id,
        titulo: 'Postulación no seleccionada por la empresa',
        mensaje: `${empNombre} ha concluido el proceso para "${ofTitulo}" y no avanzará con tu postulación en esta ocasión.`,
        tipo: 'alerta',
        link: '/postulante?tab=postulaciones',
        metadata: { motivo: motivoRechazo.trim() },
        agrupadorKey: 'rechazo_empresa_' + postulacionId,
      });

      // A la Oficina de Empleo (admin)
      await notificarAdmins({
        titulo: 'Candidato rechazado por empresa',
        mensaje: `${empNombre} rechazó un candidato derivado para "${ofTitulo}". Motivo: ${motivoRechazo.trim()}`,
        tipo: 'alerta',
        link: '/admin?tab=ofertas',
        metadata: { motivo: motivoRechazo.trim() },
        agrupadorKey: 'admin_rechazo_candidato_' + postulacionId,
      });
    }
  } catch (e) {
    console.warn('Aviso: no se pudo notificar rechazo de candidato:', e);
  }

  return { success: true };
}

/**
 * Registra formalmente la contratación de un candidato derivado.
 */
export async function contratarCandidatoEmpresa(
  postulacionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase.rpc('responder_candidato_empresa', {
    p_postulacion_id: postulacionId,
    p_decision: 'contratado',
  });

  if (error) {
    return { success: false, error: error.message };
  }

    // Notificar al postulante y a la Oficina de Empleo
  try {
    const { data: postInfo } = await supabase
      .from('postulaciones')
      .select('postulante_id, oferta:ofertas(titulo, empresa:empresas(nombre_fantasia, razon_social))')
      .eq('id', postulacionId)
      .single();

    if (postInfo?.postulante_id) {
      const ofTitulo = (postInfo.oferta as any)?.titulo || 'el puesto laboral';
      const empNombre = (postInfo.oferta as any)?.empresa?.nombre_fantasia || (postInfo.oferta as any)?.empresa?.razon_social || 'La empresa';

      // Al postulante
      await crearNotificacionDeduplicada({
        userId: postInfo.postulante_id,
        titulo: '¡Felicitaciones! Has sido seleccionado/a',
        mensaje: `${empNombre} confirmó tu contratación para la búsqueda "${ofTitulo}". ¡Muchos éxitos en tu nuevo empleo!`,
        tipo: 'postulacion',
        link: '/postulante?tab=postulaciones',
        agrupadorKey: 'contratacion_postulante_' + postulacionId,
      });

      // A la Oficina de Empleo (admin)
      await notificarAdmins({
        titulo: '¡Postulante contratado por empresa!',
        mensaje: `${empNombre} registró formalmente la contratación de un candidato derivado para "${ofTitulo}".`,
        tipo: 'postulacion',
        link: '/admin?tab=ofertas',
        agrupadorKey: 'admin_contratacion_' + postulacionId,
      });
    }
  } catch (e) {
    console.warn('Aviso: no se pudo notificar contratación de candidato:', e);
  }

  return { success: true };
}


export interface UpdateEmpresaInput {
  nombre_fantasia?: string;
  direccion?: string;
  localidad?: string;
  telefono?: string;
  email_contacto?: string;
  persona_contacto?: string;
  rubro?: string | null;
  descripcion?: string | null;
  sitio_web?: string | null;
}

/**
 * Actualiza los datos comerciales y de contacto de la empresa autenticada.
 * Protege explícitamente los campos de validación fiscal y municipal:
 * CUIT, razón social, estado, verificada y metadatos de auditoría.
 */
export async function updateEmpresaProfile(
  input: UpdateEmpresaInput
): Promise<{ success: boolean; error?: string; data?: Empresa }> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Usuario no autenticado.' };
  }

  // Verificar que la empresa pertenezca al usuario
  const { data: currentEmpresa, error: fetchError } = await supabase
    .from('empresas')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !currentEmpresa) {
    return { success: false, error: 'No se encontró la empresa asociada a tu cuenta.' };
  }

  const updatePayload: Partial<Database['public']['Tables']['empresas']['Update']> = {
    updated_at: new Date().toISOString(),
  };

  if (input.nombre_fantasia !== undefined) {
    updatePayload.nombre_fantasia = input.nombre_fantasia.trim();
  }
  if (input.direccion !== undefined) {
    updatePayload.direccion = input.direccion.trim();
  }
  if (input.localidad !== undefined) {
    updatePayload.localidad = input.localidad.trim();
  }
  if (input.telefono !== undefined) {
    updatePayload.telefono = input.telefono.trim();
  }
  if (input.email_contacto !== undefined) {
    updatePayload.email_contacto = input.email_contacto.trim();
  }
  if (input.persona_contacto !== undefined) {
    updatePayload.persona_contacto = input.persona_contacto.trim();
  }
  if (input.rubro !== undefined) {
    updatePayload.rubro = input.rubro?.trim() || null;
  }
  if (input.descripcion !== undefined) {
    updatePayload.descripcion = input.descripcion?.trim() || null;
  }
  if (input.sitio_web !== undefined) {
    updatePayload.sitio_web = input.sitio_web?.trim() || null;
  }

  const { data, error } = await supabase
    .from('empresas')
    .update(updatePayload)
    .eq('id', currentEmpresa.id)
    .select('*')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Empresa };
}


/**
 * Renueva una oferta por 30 días corridos. Si ya venció o está próxima a vencer,
 * calcula 30 días adicionales y reactiva la publicación.
 */
export async function renovarOferta30Dias(ofertaId: string): Promise<{
  success: boolean;
  nuevaFechaLimite?: string;
  error?: string;
}> {
  const supabase = createClient();
  try {
    // Intentar vía RPC
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('renovar_oferta_empresa', {
      p_oferta_id: ofertaId,
    });

    if (!rpcError && rpcData) {
      const res = rpcData as unknown as { success: boolean; nueva_fecha_limite?: string; error?: string };
      if (res.success) {
        return { success: true, nuevaFechaLimite: res.nueva_fecha_limite };
      }
    }

    // Fallback directo por client
    const { data: oferta, error: fetchErr } = await supabase
      .from('ofertas')
      .select('id, fecha_limite, estado')
      .eq('id', ofertaId)
      .single();

    if (fetchErr || !oferta) {
      return { success: false, error: fetchErr?.message || 'Oferta no encontrada' };
    }

    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    let baseDate = new Date();
    if (oferta.fecha_limite && oferta.fecha_limite > hoyStr) {
      baseDate = new Date(oferta.fecha_limite);
    }
    baseDate.setDate(baseDate.getDate() + 30);
    const nuevaFechaLimite = baseDate.toISOString().split('T')[0];

    const { error: updateErr } = await supabase
      .from('ofertas')
      .update({
        fecha_limite: nuevaFechaLimite,
        estado: oferta.estado === 'finalizada' || oferta.estado === 'pausada' ? 'publicada' : oferta.estado,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ofertaId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, nuevaFechaLimite };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al renovar la oferta';
    return { success: false, error: msg };
  }
}

/**
 * Sube o actualiza el logotipo de la empresa en Supabase Storage
 */
export async function subirLogoEmpresa(empresaId: string, file: File): Promise<{
  url?: string;
  error?: string;
}> {
  const supabase = createClient();
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `empresas/${empresaId}/logo_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Guardar en la tabla empresas
    const { error: updateError } = await supabase
      .from('empresas')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', empresaId);

    if (updateError) {
      return { error: updateError.message };
    }

    return { url: publicUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al subir el logo';
    return { error: msg };
  }
}

/**
 * Agendar entrevista desde la empresa a un candidato derivado
 */
export async function agendarEntrevistaEmpresa(params: {
  postulacionId: string;
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual' | 'telefonica';
  lugar: string;
  entrevistador?: string;
  notas?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await agendarEntrevistaEmpresaAction(params);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al agendar entrevista';
    return { success: false, error: msg };
  }
}

/**
 * Reenviar solicitud de habilitación para empresa en estado rechazada
 */
export async function reenviarSolicitudEmpresa(
  empresaId: string,
  datos: {
    nombre_fantasia?: string;
    persona_contacto?: string;
    telefono?: string;
    email_contacto?: string;
    direccion?: string;
    localidad?: string;
    rubro?: string | null;
    sitio_web?: string | null;
    descripcion?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    // Intentar invocar la RPC si la migración ya fue aplicada
    const { data, error } = await (supabase.rpc as any)('reenviar_solicitud_empresa', {
      p_empresa_id: empresaId,
      p_datos: datos,
    });

    if (error) {
      // Fallback directo si la función RPC aún no fue migrada en el backend remoto
      const { error: updErr } = await supabase
        .from('empresas')
        .update({
          ...datos,
          estado: 'pendiente',
          verificada: false,
          motivo_rechazo: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', empresaId);

      if (updErr) return { success: false, error: updErr.message };
    } else if (data && !data.success) {
      return { success: false, error: data.error };
    }

    // Notificar a la administración de Funes
    try {
      await notificarAdmins({
        titulo: 'Solicitud de empresa reenviada',
        mensaje: `La empresa ${datos.nombre_fantasia || 'registrada'} actualizó sus datos y reenvió la solicitud de habilitación para revisión.`,
        tipo: 'empresa',
        link: '/admin?tab=empresas',
        metadata: { empresaId },
        agrupadorKey: 'empresa_reenvio_' + empresaId,
      });
    } catch (e) {
      console.warn('No se pudo notificar a los administradores:', e);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al reenviar solicitud';
    return { success: false, error: msg };
  }
}

/**
 * Reprogramar una entrevista existente con el postulante
 */
export async function reprogramarEntrevistaEmpresa(params: {
  postulacionId: string;
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual' | 'telefonica';
  lugar: string;
  entrevistador?: string;
  notas?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await reprogramarEntrevistaEmpresaAction(params);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al reprogramar entrevista';
    return { success: false, error: msg };
  }
}

/**
 * Cancelar una entrevista previamente coordinada
 */
export async function cancelarEntrevistaEmpresa(params: {
  postulacionId: string;
  motivo: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await cancelarEntrevistaEmpresaAction(params);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cancelar entrevista';
    return { success: false, error: msg };
  }
}
