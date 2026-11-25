'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Componente global que intercepta cualquier aterrizaje en la aplicación
 * (ej. en la página principal '/' o '/login') que contenga tokens de recuperación
 * en el fragmento hash (#access_token=...&type=recovery).
 *
 * Supabase Auth a menudo redirige a la URL por defecto del sitio (Site URL = '/')
 * si un enlace antiguo o por defecto es consumido. Este interceptor redirige
 * automáticamente al usuario hacia '/recuperar-password/cambiar' conservando el hash.
 */
export function AuthHashRedirector() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (!hash && !search) return;

    // Si ya estamos en la página de cambio de contraseña o en el callback, permitir que lo procesen
    if (pathname === '/recuperar-password/cambiar' || pathname === '/auth/callback') return;

    // Detectar si el hash o los parámetros de búsqueda corresponden a recuperación de contraseña
    const hasRecoveryHash =
      hash.includes('type=recovery') ||
      (hash.includes('access_token=') && !hash.includes('type=signup') && !hash.includes('type=invite'));

    const hasRecoveryQuery =
      search.includes('type=recovery') ||
      (search.includes('next=%2Frecuperar-password') || search.includes('next=/recuperar-password'));

    if (hasRecoveryHash || hasRecoveryQuery) {
      console.info('AuthHashRedirector: detectada sesión de recuperación en ruta no específica. Redirigiendo a /recuperar-password/cambiar...');
      window.location.replace('/recuperar-password/cambiar' + search + hash);
    }
  }, [pathname, router]);

  return null;
}
