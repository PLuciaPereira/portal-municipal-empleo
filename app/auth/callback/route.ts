import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

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
 * 2. Intercambio de código (PKCE) o verificación de Token Hash (OTP/recovery) en recuperación de contraseñas.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextRaw = searchParams.get('next');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const isRecovery = nextRaw?.includes('recuperar-password');

  // Si Supabase reporta un error en los parámetros de la URL
  if (error) {
    console.error('Error reportado por Supabase Auth en callback:', error, errorDescription);
    const redirectUrl = new URL(isRecovery ? '/recuperar-password' : '/login', origin);
    redirectUrl.searchParams.set('error', 'link_expirado');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createClient();

    // Caso A: Verificación por Token Hash (OTP / Email template estándar de Supabase con token_hash)
    if (tokenHash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (!verifyError) {
        const safeNext = getSafeRedirectPath(nextRaw);
        if (safeNext) {
          return NextResponse.redirect(new URL(safeNext, origin));
        }

        if (type === 'recovery') {
          return NextResponse.redirect(new URL('/recuperar-password/cambiar', origin));
        }

        return NextResponse.redirect(new URL('/login?confirmed=true', origin));
      }

      console.error('Error al verificar OTP por token_hash:', verifyError.message);
    }

    // Caso B: Intercambio de código por sesión (Flujo PKCE estándar)
    if (code) {
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
    }
  } catch (err) {
    console.error('Excepción en auth/callback route handler:', err);
  }

  // Si no hay código ni token_hash visibles para el servidor, pero el usuario puede
  // tener el token en el fragmento hash del navegador (#access_token=...&type=recovery),
  // retornamos un script HTML cliente que inspecciona window.location.hash.
  const fallbackTarget = isRecovery ? '/recuperar-password/cambiar' : '/login';
  const errorTarget = isRecovery
    ? `${origin}/recuperar-password?error=link_expirado`
    : `${origin}/login?error=link_expirado`;

  const clientBridgeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verificando credenciales...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #eef5f0; color: #14231c; }
    .loader { border: 4px solid #dfe8e2; border-top: 4px solid #075a36; border-radius: 50%; width: 36px; height: 36px; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <div class="loader"></div>
    <p style="font-size: 14px; font-weight: 600;">Verificando enlace de seguridad...</p>
  </div>
  <script>
    (function() {
      try {
        var hash = window.location.hash || '';
        var search = window.location.search || '';
        if (hash.indexOf('error=') !== -1 || search.indexOf('error=') !== -1) {
          window.location.replace('${errorTarget}');
          return;
        }
        if (hash.indexOf('access_token=') !== -1) {
          // El token vino en el hash: redirigir a la página de destino conservando el hash
          var target = '${fallbackTarget}';
          window.location.replace(target + hash);
          return;
        }
      } catch (e) {
        console.error(e);
      }
      window.location.replace('${errorTarget}');
    })();
  </script>
</body>
</html>`;

  return new NextResponse(clientBridgeHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
