'use server';

import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { cleanDni, isDniFormat, maskEmail, isSyntheticAsistidoEmail } from '@/lib/auth-helpers';
import { validateEmail } from '@/lib/validators';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuración del servidor incompleta (falta Service Role Key).');
  }

  return createAdminSupabase(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Resuelve el identificador de login (Email o DNI) retornando el email que Supabase Auth necesita.
 * Si recibe un email, lo valida y normaliza.
 * Si recibe un DNI, busca en la tabla perfil el ID y consulta el email correspondiente.
 */
export async function resolverEmailParaLoginAction(
  identificador: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const raw = identificador ? identificador.trim() : '';
    if (!raw) {
      return { success: false, error: 'Por favor ingresá tu correo electrónico o número de DNI.' };
    }

    // Caso 1: Es un correo electrónico
    if (raw.includes('@')) {
      const emailNormalizado = raw.toLowerCase();
      if (!validateEmail(emailNormalizado)) {
        return { success: false, error: 'El formato del correo electrónico no es válido.' };
      }
      return { success: true, email: emailNormalizado };
    }

    // Caso 2: Es un DNI
    if (!isDniFormat(raw)) {
      return {
        success: false,
        error: 'Ingresá un correo electrónico válido o un número de DNI de 7 u 8 dígitos.',
      };
    }

    const dniNumerico = cleanDni(raw);
    const supabaseAdmin = getAdminClient();

    // 1. Buscar en public.perfil por DNI numérico
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('perfil')
      .select('id, activo, deleted_at')
      .or(`dni.eq.${dniNumerico},dni.eq.${raw}`)
      .maybeSingle();

    if (perfilError || !perfil) {
      return {
        success: false,
        error: 'No encontramos ninguna cuenta activa asociada a este DNI.',
      };
    }

    if (!perfil.activo || perfil.deleted_at !== null) {
      return {
        success: false,
        error: 'Esta cuenta se encuentra inactiva o dada de baja. Contactate con la Oficina de Empleo.',
      };
    }

    // 2. Obtener el usuario en auth.users para conocer su email de login
    const { data: authUserData, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(perfil.id);

    if (authUserError || !authUserData?.user?.email) {
      return {
        success: false,
        error: 'No se pudo recuperar la cuenta de acceso vinculada a este DNI. Acercate a la Oficina de Empleo.',
      };
    }

    return {
      success: true,
      email: authUserData.user.email,
    };
  } catch (err) {
    console.error('Error en resolverEmailParaLoginAction:', err);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al verificar tus datos.',
    };
  }
}

export type RecuperoResult = {
  success: boolean;
  status: 'email_sent' | 'email_unconfirmed' | 'asistido_requiere_oficina' | 'not_found' | 'error';
  maskedEmail?: string;
  message?: string;
};

/**
 * Solicita el recupero de contraseña mediante Correo o DNI.
 * Si es email personal o DNI con email personal, dispara resetPasswordForEmail y devuelve el email enmascarado.
 * Si es un usuario de Registro Asistido sin email personal, informa cómo contactar a la Oficina de Empleo.
 */
export async function solicitarRecuperoPasswordAction(
  identificador: string,
  origin: string
): Promise<RecuperoResult> {
  try {
    const raw = identificador ? identificador.trim() : '';
    if (!raw) {
      return {
        success: false,
        status: 'error',
        message: 'Por favor ingresá tu correo electrónico o número de DNI.',
      };
    }

    const supabaseAdmin = getAdminClient();
    let emailDestino: string | null = null;
    let isDniQuery = false;

    if (raw.includes('@')) {
      const emailLower = raw.toLowerCase();
      if (!validateEmail(emailLower)) {
        return {
          success: false,
          status: 'error',
          message: 'Por favor ingresá un formato de correo electrónico válido.',
        };
      }
      emailDestino = emailLower;
    } else {
      if (!isDniFormat(raw)) {
        return {
          success: false,
          status: 'error',
          message: 'El DNI debe tener 7 u 8 dígitos numéricos válidos.',
        };
      }
      isDniQuery = true;
      const dniNumerico = cleanDni(raw);

      const { data: perfil } = await supabaseAdmin
        .from('perfil')
        .select('id, activo, deleted_at, registro_asistido')
        .or(`dni.eq.${dniNumerico},dni.eq.${raw}`)
        .maybeSingle();

      if (!perfil || !perfil.activo || perfil.deleted_at !== null) {
        // Respuesta genérica segura para evitar enumeración maliciosa
        return {
          success: true,
          status: 'email_sent',
          message:
            'Si los datos coinciden con un usuario registrado, hemos enviado las instrucciones de recuperación.',
        };
      }

      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(perfil.id);
      if (!authUserData?.user?.email) {
        return {
          success: false,
          status: 'asistido_requiere_oficina',
          message:
            'Este legajo no posee una casilla de correo registrada. Por favor comunicate con la Oficina de Empleo Municipal.',
        };
      }

      emailDestino = authUserData.user.email;
    }

    // Verificar si es un correo sintético de registro asistido
    if (isSyntheticAsistidoEmail(emailDestino)) {
      return {
        success: true,
        status: 'asistido_requiere_oficina',
        message:
          'Tu legajo fue generado mediante Registro Asistido presencial sin un correo personal asociado. Podés gestionar tu nueva contraseña acercándote a la Oficina de Empleo Municipal (Lunes a Viernes de 7:00 a 13:00 hs) o enviando una consulta a empleo@funes.gob.ar.',
      };
    }

    // Verificar si el usuario está registrado pero aún no confirmó su correo electrónico
    try {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const targetUser = listData?.users?.find(
        (u) => u.email && u.email.toLowerCase() === emailDestino!.toLowerCase()
      );

      if (targetUser && !targetUser.email_confirmed_at) {
        // El usuario está registrado pero pendiente de confirmación. Reenviar enlace de activación.
        try {
          await supabaseAdmin.auth.resend({
            type: 'signup',
            email: emailDestino,
          });
        } catch (resendErr) {
          console.warn('Aviso: no se pudo disparar resend signup:', resendErr);
        }

        return {
          success: true,
          status: 'email_unconfirmed',
          maskedEmail: isDniQuery ? maskEmail(emailDestino) : undefined,
          message: isDniQuery
            ? "Tu cuenta vinculada a este DNI está registrada pero aún no fue activada. Te reenviamos el correo de confirmación."
            : "Tu cuenta se encuentra registrada pero aún no fue verificada. Te reenviamos el correo de confirmación a tu casilla para que puedas activarla.",
        };
      }
    } catch (checkErr) {
      console.warn('Aviso: no se pudo verificar estado de confirmación previo:', checkErr);
    }

    // Enviar correo de restablecimiento vía Supabase Auth
    const redirectTo = `${origin}/auth/callback?next=/recuperar-password/cambiar`;
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(emailDestino, {
      redirectTo,
    });

    if (resetError) {
      if (
        resetError.message.includes('rate limit') ||
        resetError.message.includes('Too many requests')
      ) {
        return {
          success: false,
          status: 'error',
          message: 'Has realizado demasiados intentos. Por favor aguardá unos minutos antes de reintentar.',
        };
      }
      if (
        resetError.message.includes('is invalid') ||
        resetError.message.includes('email_address_invalid')
      ) {
        return {
          success: false,
          status: 'error',
          message: 'No pudimos procesar la solicitud para este correo. Por favor verificá que esté bien escrito o comunicate con la Oficina de Empleo.',
        };
      }
      return {
        success: false,
        status: 'error',
        message: 'No se pudo enviar el enlace de recuperación. Por favor intentá nuevamente.',
      };
    }

    return {
      success: true,
      status: 'email_sent',
      maskedEmail: isDniQuery ? maskEmail(emailDestino) : undefined,
      message: isDniQuery
        ? `Enviamos las instrucciones a la casilla asociada a tu DNI:`
        : `Enviamos un enlace de recuperación a tu casilla de correo electrónico.`,
    };
  } catch (err) {
    console.error('Error en solicitarRecuperoPasswordAction:', err);
    return {
      success: false,
      status: 'error',
      message: 'Ocurrió un error inesperado al procesar la solicitud.',
    };
  }
}
