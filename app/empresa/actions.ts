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

    // 5. Aplicar la baja lógica
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

    // 6. Notificar a los administradores sobre la baja de la oferta (en revisión o publicada)
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
