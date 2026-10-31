import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route Handler para procesar el callback de Supabase Auth
 * Utilizado para el intercambio de código (PKCE) en recuperación de contraseñas
 * y confirmaciones de correo electrónico.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Ruta de redirección posterior (por defecto a la pantalla de cambio de contraseña)
  const next = searchParams.get('next') || '/recuperar-password/cambiar';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('Error reportado por Supabase Auth en callback:', error, errorDescription);
    const redirectUrl = new URL('/recuperar-password', origin);
    redirectUrl.searchParams.set('error', 'link_expirado');
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        // Redirige al destino especificado con la sesión autenticada en cookies
        return NextResponse.redirect(new URL(next, origin));
      }

      console.error('Error al intercambiar código por sesión:', exchangeError.message);
    } catch (err) {
      console.error('Excepción en auth/callback route handler:', err);
    }
  }

  // Si no hay código o hubo un fallo en el intercambio, dirigir a recuperar-password con alerta
  const failRedirect = new URL('/recuperar-password', origin);
  failRedirect.searchParams.set('error', 'link_expirado');
  return NextResponse.redirect(failRedirect);
}
