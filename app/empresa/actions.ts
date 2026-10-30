'use server';

import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export interface DarDeBajaOfertaInput {
  ofertaId: string;
  motivo: string;
}

/**
 * Server Action para registrar la baja lógica de una oferta laboral de la empresa.
 * - Valida la sesión del usuario.
 * - Verifica que pertenezca a una empresa aprobada activa.
 * - Verifica que la oferta sea de su exclusiva propiedad.
 * - Ejecuta la baja lógica mediante credenciales con privilegios para sortear el bloqueo RLS de ofertas en revisión.
 * - Si estaba en 'pendiente_revision', notifica automáticamente a los administradores.
 */
export async function darDeBajaOfertaEmpresaAction(input: DarDeBajaOfertaInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { ofertaId, motivo } = input;

    if (!ofertaId?.trim()) {
      return { success: false, error: 'ID de oferta no proporcionado.' };
    }

    if (!motivo?.trim()) {
      return { success: false, error: 'El motivo de baja es obligatorio.' };
    }

    // 1. Obtener usuario autenticado invocador
    const supabaseCaller = await createServerSupabase();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabaseCaller.auth.getUser();

    if (authError || !callerUser) {
      return {
        success: false,
        error: 'No autorizado: Debés iniciar sesión con tu cuenta de empresa.',
      };
    }

    // 2. Inicializar cliente administrativo para comprobaciones seguras y bypass de RLS restrictivo
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        success: false,
        error: 'Error de configuración en el servidor (Service Key no disponible).',
      };
    }

    const adminSupabase = createAdminSupabase<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Validar empresa del usuario invocador
    const { data: empresa, error: empresaError } = await adminSupabase
      .from('empresas')
      .select('id, nombre_fantasia, razon_social, estado')
      .eq('user_id', callerUser.id)
      .maybeSingle();

    if (empresaError || !empresa) {
      return {
        success: false,
        error: 'No se encontró la empresa asociada a tu cuenta.',
      };
    }

    if (empresa.estado !== 'aprobada') {
      return {
        success: false,
        error: 'Tu empresa debe estar aprobada para realizar operaciones de gestión.',
      };
    }

    // 4. Validar oferta y propiedad de la empresa
    const { data: oferta, error: ofertaError } = await adminSupabase
      .from('ofertas')
      .select('id, titulo, estado, empresa_id, deleted_at')
      .eq('id', ofertaId)
      .maybeSingle();

    if (ofertaError || !oferta) {
      return { success: false, error: 'Oferta laboral no encontrada.' };
    }

    if (oferta.empresa_id !== empresa.id) {
      return {
        success: false,
        error: 'No tenés permisos para dar de baja esta oferta laboral.',
      };
    }

    if (oferta.deleted_at) {
      return { success: true }; // Ya estaba dada de baja
    }

    // 5. Si la oferta es un borrador privado, nunca fue enviada ni vista por el Municipio.
    // Se elimina lógicamente (o se descarta) y NUNCA se notifica a los administradores.
    if (oferta.estado === 'borrador') {
      const nowIso = new Date().toISOString();
      const { error: updateError } = await adminSupabase
        .from('ofertas')
        .update({
          deleted_at: nowIso,
          motivo_baja: motivo.trim(),
          updated_at: nowIso,
        })
        .eq('id', ofertaId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // No se notifica a los administradores para ofertas en borrador
      return { success: true };
    }

    // 6. Aplicar la baja lógica para ofertas en revisión o publicadas
    const nowIso = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from('ofertas')
      .update({
        deleted_at: nowIso,
        motivo_baja: motivo.trim(),
        updated_at: nowIso,
      })
      .eq('id', ofertaId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 7. Notificar a los administradores ÚNICAMENTE sobre la baja de ofertas que ya estaban en circuito municipal (en revisión o publicada)
    const empresaNombre = empresa.nombre_fantasia || empresa.razon_social || 'Una empresa';
    const ofertaTitulo = oferta.titulo || 'Oferta laboral';
    const estadoTexto = oferta.estado === 'pendiente_revision' ? 'en revisión' : 'publicada';

    try {
      // 1. Intentar vía RPC SECURITY DEFINER
      const { error: rpcError } = await (adminSupabase.rpc as any)('notificar_administradores', {
        p_titulo: 'Oferta dada de baja por la empresa',
        p_mensaje: `La empresa "${empresaNombre}" dio de baja la oferta "${ofertaTitulo}" (${estadoTexto}). Motivo: ${motivo.trim()}`,
        p_tipo: 'empresa',
        p_link: '/admin?tab=ofertas&filtro=bajas',
      });

      // 2. Fallback directo si la RPC no responde
      if (rpcError) {
        const { data: admins } = await adminSupabase
          .from('perfil')
          .select('id')
          .eq('rol', 'admin')
          .eq('activo', true)
          .is('deleted_at', null);

        if (admins && admins.length > 0) {
          const notifs = admins.map((adm) => ({
            user_id: adm.id,
            titulo: 'Oferta dada de baja por la empresa',
            mensaje: `La empresa "${empresaNombre}" dio de baja la oferta "${ofertaTitulo}" (${estadoTexto}). Motivo: ${motivo.trim()}`,
            tipo: 'empresa' as const,
            link: '/admin?tab=ofertas&filtro=bajas',
            metadata: { motivo: motivo.trim() },
            leida: false,
          }));

          await adminSupabase.from('notificaciones').insert(notifs);
        }
      }
    } catch (notifErr) {
      console.warn('Aviso: No se pudo registrar la notificación a administradores:', notifErr);
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Error inesperado en darDeBajaOfertaEmpresaAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al dar de baja la oferta.',
    };
  }
}


export interface AgendarEntrevistaInput {
  postulacionId: string;
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual' | 'telefonica';
  lugar: string;
  entrevistador?: string;
  notas?: string;
}

/**
 * Server action para que la empresa agende una entrevista con un candidato derivado.
 * Valida sesión, permisos sobre la postulación/empresa, actualiza el estado y notifica al postulante.
 */
export async function agendarEntrevistaEmpresaAction(
  input: AgendarEntrevistaInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { postulacionId, fecha, hora, modalidad, lugar, entrevistador, notas } = input;

    if (!postulacionId?.trim()) {
      return { success: false, error: 'ID de postulación no válido.' };
    }
    if (!fecha || !hora) {
      return { success: false, error: 'Por favor seleccioná fecha y hora para la entrevista.' };
    }
    if (!lugar?.trim()) {
      return { success: false, error: 'Por favor indicá el lugar o enlace de conexión.' };
    }

    // Validar que la fecha no sea en el pasado
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fecha < hoyStr) {
      return { success: false, error: 'La fecha de la entrevista no puede ser anterior al día de hoy.' };
    }

    // 1. Obtener usuario autenticado
    const supabaseCaller = await createServerSupabase();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabaseCaller.auth.getUser();

    if (authError || !callerUser) {
      return {
        success: false,
        error: 'Sesión expirada. Por favor iniciá sesión nuevamente.',
      };
    }

    // 2. Cliente administrativo para bypass seguro de RLS en postulaciones
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        success: false,
        error: 'Error de configuración del servidor (Service Key no disponible).',
      };
    }

    const adminSupabase = createAdminSupabase<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 3. Verificar empresa del usuario
    const { data: empresa, error: empresaError } = await adminSupabase
      .from('empresas')
      .select('id, nombre_fantasia, razon_social, estado')
      .eq('user_id', callerUser.id)
      .single();

    if (empresaError || !empresa) {
      return {
        success: false,
        error: 'No se encontró el perfil de empresa asociado a tu cuenta.',
      };
    }

    // 4. Obtener postulación y verificar que pertenezca a una oferta de esta empresa
    const { data: post, error: postErr } = await adminSupabase
      .from('postulaciones')
      .select('id, postulante_id, oferta_id, estado, oferta:ofertas(id, titulo, empresa_id)')
      .eq('id', postulacionId)
      .maybeSingle();

    if (postErr || !post) {
      return {
        success: false,
        error: 'No se encontró la postulación seleccionada o fue dada de baja.',
      };
    }

    const ofertaAsoc = post.oferta as any;
    if (ofertaAsoc?.empresa_id !== empresa.id) {
      return {
        success: false,
        error: 'No tenés permisos para coordinar entrevistas en búsquedas de otra empresa.',
      };
    }

    const fechaHora = `${fecha}T${hora}:00`;

    // 5. Actualizar postulación
    const { error: updateError } = await adminSupabase
      .from('postulaciones')
      .update({
        estado: 'entrevista',
        fecha_entrevista: fechaHora,
        modalidad_entrevista: modalidad,
        lugar_entrevista: lugar.trim(),
        entrevistador: entrevistador?.trim() || null,
        observaciones_derivacion: notas?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postulacionId);

    if (updateError) {
      console.error('Error al actualizar postulación en agendarEntrevista:', updateError);
      return {
        success: false,
        error: 'No se pudo actualizar la postulación. Por favor reintentá en unos momentos.',
      };
    }

    // 6. Registrar en historial_postulacion (tolerante si no existe tabla/columna)
    try {
      await adminSupabase.from('historial_postulacion').insert({
        postulacion_id: postulacionId,
        estado_anterior: (post.estado as any) || 'presentado_a_empresa',
        estado_nuevo: 'entrevista',
        cambiado_por: callerUser.id,
        observaciones: `Entrevista agendada por la empresa para el ${fecha} a las ${hora} hs (${modalidad})`,
      });
    } catch (histErr) {
      console.warn('Aviso: No se pudo registrar en historial_postulacion:', histErr);
    }

    // 7. Notificar al postulante
    if (post.postulante_id) {
      try {
        const empresaNombre = empresa.nombre_fantasia || empresa.razon_social || 'La empresa';
        const ofertaTitulo = ofertaAsoc?.titulo || 'la búsqueda laboral';

        await adminSupabase.from('notificaciones').insert({
          user_id: post.postulante_id,
          titulo: 'Entrevista de trabajo coordinada',
          mensaje: `${empresaNombre} coordinó una entrevista para ${ofertaTitulo} el día ${fecha} a las ${hora} hs (${modalidad}). Lugar/Contacto: ${lugar.trim()}`,
          tipo: 'entrevista',
          link: '/postulante',
          leida: false,
        });
      } catch (notifErr) {
        console.warn('Aviso: No se pudo crear notificación al postulante:', notifErr);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Error inesperado en agendarEntrevistaEmpresaAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al agendar la entrevista.',
    };
  }
}

export interface ReprogramarEntrevistaInput {
  postulacionId: string;
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual' | 'telefonica';
  lugar: string;
  entrevistador?: string;
  notas?: string;
}

export async function reprogramarEntrevistaEmpresaAction(
  input: ReprogramarEntrevistaInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { postulacionId, fecha, hora, modalidad, lugar, entrevistador, notas } = input;

    if (!postulacionId?.trim()) {
      return { success: false, error: 'ID de postulación no válido.' };
    }
    if (!fecha || !hora) {
      return { success: false, error: 'Por favor seleccioná fecha y hora para la entrevista.' };
    }
    if (!lugar?.trim()) {
      return { success: false, error: 'Por favor indicá el lugar o enlace de conexión.' };
    }

    const hoyStr = new Date().toISOString().split('T')[0];
    if (fecha < hoyStr) {
      return { success: false, error: 'La fecha de la entrevista no puede ser anterior al día de hoy.' };
    }

    const supabaseCaller = await createServerSupabase();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabaseCaller.auth.getUser();

    if (authError || !callerUser) {
      return { success: false, error: 'Sesión expirada. Por favor iniciá sesión nuevamente.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Error de configuración del servidor (Service Key no disponible).' };
    }

    const adminSupabase = createAdminSupabase<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: empresa } = await adminSupabase
      .from('empresas')
      .select('id, nombre_fantasia, razon_social')
      .eq('user_id', callerUser.id)
      .single();

    if (!empresa) {
      return { success: false, error: 'No se encontró el perfil de empresa asociado.' };
    }

    const { data: post } = await adminSupabase
      .from('postulaciones')
      .select('id, postulante_id, oferta:ofertas(id, titulo, empresa_id)')
      .eq('id', postulacionId)
      .maybeSingle();

    if (!post) {
      return { success: false, error: 'No se encontró la postulación.' };
    }

    const ofertaAsoc = post.oferta as any;
    if (ofertaAsoc?.empresa_id !== empresa.id) {
      return { success: false, error: 'No tenés permisos para reprogramar entrevistas de esta postulación.' };
    }

    const fechaHora = `${fecha}T${hora}:00`;

    const { error: updateError } = await adminSupabase
      .from('postulaciones')
      .update({
        fecha_entrevista: fechaHora,
        modalidad_entrevista: modalidad,
        lugar_entrevista: lugar.trim(),
        entrevistador: entrevistador?.trim() || null,
        observaciones_derivacion: notas?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postulacionId);

    if (updateError) {
      return { success: false, error: 'No se pudo actualizar la fecha de la entrevista. Reintentá.' };
    }

    try {
      await adminSupabase.from('historial_postulacion').insert({
        postulacion_id: postulacionId,
        estado_anterior: 'entrevista',
        estado_nuevo: 'entrevista',
        cambiado_por: callerUser.id,
        observaciones: `Entrevista reprogramada por la empresa para el ${fecha} a las ${hora} hs (${modalidad})`,
      });
    } catch (e) {}

    if (post.postulante_id) {
      try {
        const empresaNombre = empresa.nombre_fantasia || empresa.razon_social || 'La empresa';
        const ofertaTitulo = ofertaAsoc?.titulo || 'la búsqueda laboral';

        await adminSupabase.from('notificaciones').insert({
          user_id: post.postulante_id,
          titulo: 'Entrevista reprogramada',
          mensaje: `${empresaNombre} actualizó la fecha/hora de la entrevista para ${ofertaTitulo}: nuevo horario el ${fecha} a las ${hora} hs (${modalidad}). Lugar/Contacto: ${lugar.trim()}`,
          tipo: 'entrevista',
          link: '/postulante',
          leida: false,
        });
      } catch (e) {}
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al reprogramar entrevista.',
    };
  }
}

export interface CancelarEntrevistaInput {
  postulacionId: string;
  motivo: string;
}

export async function cancelarEntrevistaEmpresaAction(
  input: CancelarEntrevistaInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { postulacionId, motivo } = input;

    if (!postulacionId?.trim()) {
      return { success: false, error: 'ID de postulación no válido.' };
    }
    if (!motivo?.trim()) {
      return { success: false, error: 'Por favor indicá el motivo de cancelación.' };
    }

    const supabaseCaller = await createServerSupabase();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabaseCaller.auth.getUser();

    if (authError || !callerUser) {
      return { success: false, error: 'Sesión expirada. Por favor iniciá sesión nuevamente.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Error de configuración del servidor (Service Key no disponible).' };
    }

    const adminSupabase = createAdminSupabase<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: empresa } = await adminSupabase
      .from('empresas')
      .select('id, nombre_fantasia, razon_social')
      .eq('user_id', callerUser.id)
      .single();

    if (!empresa) {
      return { success: false, error: 'No se encontró el perfil de empresa asociado.' };
    }

    const { data: post } = await adminSupabase
      .from('postulaciones')
      .select('id, postulante_id, oferta:ofertas(id, titulo, empresa_id)')
      .eq('id', postulacionId)
      .maybeSingle();

    if (!post) {
      return { success: false, error: 'No se encontró la postulación.' };
    }

    const ofertaAsoc = post.oferta as any;
    if (ofertaAsoc?.empresa_id !== empresa.id) {
      return { success: false, error: 'No tenés permisos para cancelar entrevistas de esta postulación.' };
    }

    const { error: updateError } = await adminSupabase
      .from('postulaciones')
      .update({
        estado: 'presentado_a_empresa',
        fecha_entrevista: null,
        modalidad_entrevista: null,
        lugar_entrevista: null,
        entrevistador: null,
        observaciones_derivacion: motivo.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postulacionId);

    if (updateError) {
      return { success: false, error: 'No se pudo cancelar la entrevista. Reintentá en unos instantes.' };
    }

    try {
      await adminSupabase.from('historial_postulacion').insert({
        postulacion_id: postulacionId,
        estado_anterior: 'entrevista',
        estado_nuevo: 'presentado_a_empresa',
        cambiado_por: callerUser.id,
        observaciones: `Entrevista cancelada por la empresa: ${motivo.trim()}`,
      });
    } catch (e) {}

    if (post.postulante_id) {
      try {
        const empresaNombre = empresa.nombre_fantasia || empresa.razon_social || 'La empresa';
        const ofertaTitulo = ofertaAsoc?.titulo || 'la búsqueda laboral';

        await adminSupabase.from('notificaciones').insert({
          user_id: post.postulante_id,
          titulo: 'Entrevista cancelada',
          mensaje: `${empresaNombre} canceló la entrevista agendada para ${ofertaTitulo}. Motivo informado: ${motivo.trim()}`,
          tipo: 'entrevista',
          link: '/postulante',
          leida: false,
        });
      } catch (e) {}
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al cancelar entrevista.',
    };
  }
}
