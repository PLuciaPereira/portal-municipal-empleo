import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Valida que una ruta de redirección interna sea segura y pertenezca al dominio de la aplicación.
 * Previene ataques de Open Redirect (ej. evitar //malicious.com o https://externo.com).
 */
function getSafeRedirectPath(candidate: string | null): string | null {
  if (!candidate) return null;

  const trimmed = candidate.trim();

  // Debe ser una ruta relativa que comience con '/' pero no con '//' ni contenga '\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return null;
  }

  // Prevenir inyección de protocolos antes o dentro de la ruta
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  // Comprobar que sea una de las rutas base autorizadas de la aplicación
  const ALLOWED_PREFIXES = [
    '/postulante',
    '/empresa',
    '/admin',
    '/recuperar-password',
    '/login',
    '/ofertas',
  ];

  const isAllowed = ALLOWED_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`) || trimmed.startsWith(`${prefix}?`)
  );

  return isAllowed ? trimmed : null;
}

/**
 * Route Handler para procesar el callback de Supabase Auth.
 * Utilizado para:
 * 1. Confirmación de correo electrónico (registro de postulantes y empresas).
 * 2. Intercambio de código (PKCE) en recuperación de contraseñas.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextRaw = searchParams.get('next');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Si Supabase reporta un error en los parámetros de la URL
  if (error) {
    console.error('Error reportado por Supabase Auth en callback:', error, errorDescription);
    const isRecovery = nextRaw?.includes('recuperar-password');
    const redirectUrl = new URL(isRecovery ? '/recuperar-password' : '/login', origin);
    redirectUrl.searchParams.set('error', 'link_expirado');
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        // 1. Si viene un next seguro y autorizado, usarlo
        const safeNext = getSafeRedirectPath(nextRaw);
        if (safeNext) {
          return NextResponse.redirect(new URL(safeNext, origin));
        }

        // 2. Si no vino un next válido o autorizado, deducir el destino a partir del rol del usuario
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const role =
              user.user_metadata?.rol ||
              user.app_metadata?.role ||
              user.user_metadata?.role;

            if (role === 'empresa') {
              return NextResponse.redirect(new URL('/empresa', origin));
            }
            if (role === 'postulante') {
              return NextResponse.redirect(new URL('/postulante', origin));
            }
            if (role === 'admin') {
              return NextResponse.redirect(new URL('/admin', origin));
            }
          }
        } catch (userErr) {
          console.warn('Aviso: no se pudo deducir rol de usuario en callback:', userErr);
        }

        // 3. Fallback general seguro para cuenta confirmada
        return NextResponse.redirect(new URL('/login?confirmed=true', origin));
      }

      console.error('Error al intercambiar código por sesión:', exchangeError.message);
    } catch (err) {
      console.error('Excepción en auth/callback route handler:', err);
    }
  }

  // Si no hay código o hubo un fallo en el intercambio
  const isRecovery = nextRaw?.includes('recuperar-password');
  const failRedirect = new URL(isRecovery ? '/recuperar-password' : '/login', origin);
  failRedirect.searchParams.set('error', 'link_expirado');
  return NextResponse.redirect(failRedirect);
}
