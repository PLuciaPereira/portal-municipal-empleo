import { createClient } from '@/lib/supabase/client';
import { Notificacion } from '@/types/database';

export async function getNotificacionesUsuario(): Promise<Notificacion[]> {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error al consultar notificaciones:', error);
      return [];
    }

    return (data as Notificacion[]) || [];
  } catch (err) {
    console.error('Error getNotificacionesUsuario:', err);
    return [];
  }
}

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

export async function crearNotificacionInterna(params: {
  userId: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'entrevista' | 'invitacion' | 'sistema';
  link?: string;
}): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await supabase.from('notificaciones').insert({
      user_id: params.userId,
      titulo: params.titulo,
      mensaje: params.mensaje,
      tipo: params.tipo,
      link: params.link || null,
      leida: false,
    });

    return !error;
  } catch (err) {
    console.error('Error al crear notificación:', err);
    return false;
  }
}
