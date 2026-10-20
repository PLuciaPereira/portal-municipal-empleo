import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: { id: string } | null = null;
  let userRole: string | null = null;

  // 1. Sincronizar sesión y obtener usuario real de Supabase si está configurado
  if (
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('tu-proyecto')
  ) {
    try {
      const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        user = authUser;

        // Consultar rol verificado y vigencia en perfil de base de datos
        try {
          const { data: perfilData } = await supabase
            .from('perfil')
            .select('rol, activo, deleted_at')
            .eq('id', authUser.id)
            .is('deleted_at', null)
            .eq('activo', true)
            .maybeSingle();

          if (perfilData?.rol) {
            userRole = perfilData.rol;
          } else {
            // Perfil inexistente, inactivo o con baja lógica
            userRole = null;
          }
        } catch {
          userRole = null;
        }
      }
    } catch {
      // Ignorar errores de conexión y mantener userRole = null
    }
  }

  // 2. Limpieza de cookie de prueba histórica si aún persiste en el cliente
  if (request.cookies.has('portal_funes_demo_role')) {
    response.cookies.delete('portal_funes_demo_role');
  }

  const { pathname } = request.nextUrl;

  // 3. Normalización de rutas obsoletas o en plural
  if (pathname === '/empresas') {
    const target = userRole === 'empresa' ? '/empresa' : '/registro/empresa';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname === '/postulantes') {
    const target = userRole === 'postulante' ? '/postulante' : '/registro';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 4. Rutas públicas de autenticación (Login / Registro):
  // Si el usuario ya está autenticado, redirigir directamente a su panel correspondiente
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/registro' ||
    pathname === '/registro/empresa';

  if (isAuthRoute && user && userRole) {
    let dashboardUrl = '/postulante';
    if (userRole === 'empresa') dashboardUrl = '/empresa';
    if (userRole === 'admin') dashboardUrl = '/admin';

    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // 5. Rutas protegidas por Rol
  const isPostulanteRoute = pathname.startsWith('/postulante');
  const isEmpresaRoute = pathname.startsWith('/empresa');
  const isAdminRoute = pathname.startsWith('/admin');

  const isProtectedRoute = isPostulanteRoute || isEmpresaRoute || isAdminRoute;

  if (isProtectedRoute) {
    // Si no está autenticado o carece de un perfil activo autorizado, redirigir a /login
    if (!user || !userRole) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Si está autenticado pero con otro rol, redirigir a su propio panel autorizado
    if (isPostulanteRoute && userRole !== 'postulante') {
      const dest = userRole === 'empresa' ? '/empresa' : '/admin';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (isEmpresaRoute && userRole !== 'empresa') {
      const dest = userRole === 'postulante' ? '/postulante' : '/admin';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (isAdminRoute && userRole !== 'admin') {
      const dest = userRole === 'empresa' ? '/empresa' : '/postulante';
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Interceptar todas las rutas excepto recursos estáticos e imágenes
     */
    '/((?!_next/static|_next/image|favicon.ico|escudo-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
