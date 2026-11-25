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

    const hash = window.location.hash;
    if (!hash) return;

    // Si ya estamos en la página de cambio de contraseña, permitir que esa página lo procese
    if (pathname === '/recuperar-password/cambiar') return;

    // Detectar si el hash corresponde a recuperación de contraseña
    const hasRecoveryToken =
      hash.includes('type=recovery') ||
      (hash.includes('access_token=') && !hash.includes('type=signup') && !hash.includes('type=invite'));

    if (hasRecoveryToken) {
      console.info('AuthHashRedirector: detectada sesión de recuperación en ruta no específica. Redirigiendo a /recuperar-password/cambiar...');
      window.location.replace('/recuperar-password/cambiar' + hash);
    }
  }, [pathname, router]);

  return null;
}
