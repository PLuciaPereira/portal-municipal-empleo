import { createClient } from '@/lib/supabase/client';
import { Notificacion, TipoNotificacion } from '@/types/database';

export type { TipoNotificacion };

let hasWarnedNotificationsPermission = false;

/**
 * Obtiene las notificaciones del usuario autenticado actualmente
 */
export async function getNotificacionesUsuario(): Promise<Notificacion[]> {
  const supabase = createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      if (!hasWarnedNotificationsPermission) {
        hasWarnedNotificationsPermission = true;
        if (!error.message.includes('permission denied')) {
          console.warn('Aviso al consultar notificaciones:', error.message);
        }
      }
      return [];
    }

    hasWarnedNotificationsPermission = false;
    return (data as Notificacion[]) || [];
  } catch {
    return [];
  }
}

/**
 * Marca una notificación individual como leída
 */
export async function marcarNotificacionLeida(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Marca todas las notificaciones pendientes del usuario actual como leídas
 */
export async function marcarTodasNotificacionesLeidas(): Promise<boolean> {
  const supabase = createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // 1. Intentar vía RPC dedicada si la migración 015 fue aplicada
    const { error: rpcError } = await (supabase.rpc as any)('marcar_todas_notificaciones_leidas');
    if (!rpcError) return true;

    // 2. Fallback vía UPDATE directo
    const { error: updateError } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('user_id', user.id)
      .eq('leida', false);

    return !updateError;
  } catch (err) {
    console.error('Error marcarTodasNotificacionesLeidas:', err);
    return false;
  }
}

/**
 * Crea una notificación individual básica (compatible con versiones previas)
 */
export async function crearNotificacionInterna(params: {
  userId: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  link?: string;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  return await crearNotificacionDeduplicada({
    userId: params.userId,
    titulo: params.titulo,
    mensaje: params.mensaje,
    tipo: params.tipo,
    link: params.link,
    metadata: params.metadata,
  });
}

/**
 * Crea una notificación garantizando que no se duplique en una ventana temporal si posee agrupadorKey
 */
export async function crearNotificacionDeduplicada(params: {
  userId: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  link?: string;
  agrupadorKey?: string;
  metadata?: Record<string, any>;
  diasVentana?: number;
}): Promise<boolean> {
  const supabase = createClient();
  try {
    // 1. Intentar vía función RPC crear_notificacion_deduplicada (migración 019)
    if (params.agrupadorKey) {
      const { error: rpcErr } = await (supabase.rpc as any)('crear_notificacion_deduplicada', {
        p_user_id: params.userId,
        p_titulo: params.titulo,
        p_mensaje: params.mensaje,
        p_tipo: params.tipo,
        p_link: params.link || null,
        p_agrupador_key: params.agrupadorKey,
        p_metadata: params.metadata || {},
        p_dias_ventana: params.diasVentana || 7,
      });

      if (!rpcErr) return true;
    }

    // 2. Fallback estándar si la RPC no está instalada aún
    const { error } = await supabase.from('notificaciones').insert({
      user_id: params.userId,
      titulo: params.titulo,
      mensaje: params.mensaje,
      tipo: params.tipo,
      link: params.link || null,
      agrupador_key: params.agrupadorKey || null,
      metadata: params.metadata || {},
      leida: false,
    });

    return !error;
  } catch (err) {
    console.warn('No se pudo registrar la notificación deduplicada:', err);
    return false;
  }
}

/**
 * Notifica a todos los administradores activos del portal (SECURITY DEFINER para eludir restricciones RLS)
 */
export async function notificarAdmins(params: {
  titulo: string;
  mensaje: string;
  tipo?: TipoNotificacion;
  link?: string;
  agrupadorKey?: string;
  metadata?: Record<string, any>;
  diasVentana?: number;
}): Promise<void> {
  const supabase = createClient();
  try {
    // 1. Intentar vía función RPC SECURITY DEFINER extendida (migración 019)
    const { error: rpcErrExt } = await (supabase.rpc as any)('notificar_administradores', {
      p_titulo: params.titulo,
      p_mensaje: params.mensaje,
      p_tipo: params.tipo || 'sistema',
      p_link: params.link || null,
      p_agrupador_key: params.agrupadorKey || null,
      p_metadata: params.metadata || {},
      p_dias_ventana: params.diasVentana || 1,
    });

    if (!rpcErrExt) return;

    // 2. Intentar vía RPC estándar migración 018 (4 argumentos)
    const { error: rpcErrBase } = await (supabase.rpc as any)('notificar_administradores', {
      p_titulo: params.titulo,
      p_mensaje: params.mensaje,
      p_tipo: params.tipo || 'sistema',
      p_link: params.link || null,
    });

    if (!rpcErrBase) return;

    // 3. Fallback directo si el usuario autenticado tiene permisos de administrador
    const { data: admins } = await supabase
      .from('perfil')
      .select('id')
      .eq('rol', 'admin')
      .eq('activo', true)
      .is('deleted_at', null);

    if (!admins || admins.length === 0) return;

    for (const adm of admins) {
      await crearNotificacionDeduplicada({
        userId: adm.id,
        titulo: params.titulo,
        mensaje: params.mensaje,
        tipo: params.tipo || 'sistema',
        link: params.link,
        agrupadorKey: params.agrupadorKey ? `${adm.id}_${params.agrupadorKey}` : undefined,
        metadata: params.metadata,
      });
    }
  } catch (err) {
    console.warn('Error al notificar al equipo de administradores:', err);
  }
}

/**
 * Dispara la verificación de ofertas próximas a vencer (5 días) y vencidas para el usuario autenticado
 */
export async function verificarVencimientosUsuario(): Promise<void> {
  const supabase = createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Ejecutar RPC verificar_vencimientos_notificaciones
    await (supabase.rpc as any)('verificar_vencimientos_notificaciones', {
      p_user_id: user.id,
    });
  } catch {
    // Silencioso para no interferir en la carga de vistas
  }
}

/**
 * Notifica a los postulantes cuyos rubros coincidan con la oferta recién aprobada
 */
export async function notificarPostulantesPorNuevaOferta(ofertaId: string): Promise<void> {
  const supabase = createClient();
  try {
    await (supabase.rpc as any)('notificar_postulantes_ofertas_rubro', {
      p_oferta_id: ofertaId,
    });
  } catch (err) {
    console.warn('Aviso: no se pudo notificar a postulantes por rubro:', err);
  }
}
