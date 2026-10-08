'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Perfil, Empresa, UserRole } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export interface AuthUser extends Perfil {
  email?: string;
  empresa?: Empresa | null;
}

export interface RegisterPostulanteData {
  email: string;
  password?: string;
  nombre: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  es_residente_funes?: boolean;
  barrio?: string;
}

export interface RegisterEmpresaData {
  email: string;
  password?: string;
  razon_social: string;
  nombre_fantasia?: string;
  cuit: string;
  direccion: string;
  localidad?: string;
  telefono: string;
  persona_contacto: string;
  rubro?: string;
  descripcion?: string;
  sitio_web?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  empresa: Empresa | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  appliedJobIds: string[];
  login: (
    email: string,
    password?: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  loginAsDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  register: (
    data: RegisterPostulanteData
  ) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  registerEmpresa: (
    data: RegisterEmpresaData
  ) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  refreshUser: () => Promise<void>;
  hasAppliedTo: (jobId: string) => boolean;
  recordApplication: (jobId: string, applicationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Perfiles de prueba precargados para testing y desarrollo
export const DEMO_USERS: Record<UserRole, AuthUser> = {
  postulante: {
    id: 'postulante-demo-1',
    rol: 'postulante',
    role: 'postulante',
    email: 'lucia.vecina@funes.gob.ar',
    nombre: 'Lucía',
    apellido: 'Fernández',
    dni: '38123456',
    telefono: '341-555-1234',
    fecha_nacimiento: '1995-04-12',
    direccion: 'Av. Santa Fe 1820',
    barrio: 'Centro',
    es_residente_funes: true,
    nivel_educativo: 'Secundario Completo',
    situacion_laboral_actual: 'Búsqueda activa',
    habilidades: ['Atención al cliente', 'Manejo de caja', 'Ventas', 'Office'],
    experiencia_resumen: '3 años de experiencia en comercios locales y atención de salón.',
    cv_url: null,
    disponibilidad_horaria: 'Full-time / Turno mañana o tarde',
    movilidad_propia: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  empresa: {
    id: 'empresa-demo-1',
    rol: 'empresa',
    role: 'empresa',
    email: 'rrhh@funesmall.com.ar',
    nombre: 'Martín',
    apellido: 'Rodríguez',
    dni: '30998877',
    telefono: '341-493-1000',
    fecha_nacimiento: '1985-08-20',
    direccion: 'Santa Fe 1600',
    barrio: 'Centro',
    es_residente_funes: true,
    nivel_educativo: 'Universitario',
    situacion_laboral_actual: 'Responsable de RRHH',
    habilidades: null,
    experiencia_resumen: null,
    cv_url: null,
    disponibilidad_horaria: null,
    movilidad_propia: true,
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    empresa: {
      id: 'emp-demo-uuid-1',
      user_id: 'empresa-demo-1',
      razon_social: 'Funes Mall Retail S.A.',
      nombre_fantasia: 'Funes Mall',
      cuit: '30-71234567-8',
      direccion: 'Santa Fe 1600',
      localidad: 'Funes',
      telefono: '341-493-1000',
      email_contacto: 'rrhh@funesmall.com.ar',
      persona_contacto: 'Martín Rodríguez',
      rubro: 'Comercio',
      descripcion: 'Centro comercial y tiendas minoristas en Funes.',
      sitio_web: 'https://funesmall.com.ar',
      verificada: true,
      estado: 'aprobada',
      motivo_rechazo: null,
      revisado_por: null,
      fecha_revision: '2026-08-16T10:00:00Z',
      created_at: '2026-08-15T09:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
    },
  },
  municipalidad: {
    id: 'muni-demo-1',
    rol: 'municipalidad',
    role: 'municipalidad',
    email: 'empleo@funes.gob.ar',
    nombre: 'Oficina de Empleo',
    apellido: 'Municipalidad de Funes',
    dni: '25443322',
    telefono: '341-493-6000',
    fecha_nacimiento: '1980-01-15',
    direccion: 'Pedro A. Ríos 1500',
    barrio: 'Municipalidad',
    es_residente_funes: true,
    nivel_educativo: 'Universitario',
    situacion_laboral_actual: 'Personal Municipal',
    habilidades: null,
    experiencia_resumen: null,
    cv_url: null,
    disponibilidad_horaria: null,
    movilidad_propia: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  admin: {
    id: 'admin-demo-1',
    rol: 'admin',
    role: 'admin',
    email: 'coordinacion.empleo@funes.gob.ar',
    nombre: 'Coordinación',
    apellido: 'Oficina de Empleo',
    dni: '25443322',
    telefono: '341-493-6000',
    fecha_nacimiento: '1980-01-15',
    direccion: 'Pedro A. Ríos 1500',
    barrio: 'Municipalidad',
    es_residente_funes: true,
    nivel_educativo: 'Universitario',
    situacion_laboral_actual: 'Superadministrador',
    habilidades: null,
    experiencia_resumen: null,
    cv_url: null,
    disponibilidad_horaria: null,
    movilidad_propia: true,
    es_admin_general: true,
    es_superadmin: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
};

const STORAGE_KEY_USER = 'portal_funes_current_user';
const STORAGE_KEY_APPLICATIONS = 'portal_funes_user_applications';

function setDemoCookie(role: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `portal_funes_demo_role=${role}; path=/; max-age=86400; SameSite=Lax`;
  }
}

function clearDemoCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `portal_funes_demo_role=; path=/; max-age=0; SameSite=Lax`;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const storedApps = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
      return storedApps ? (JSON.parse(storedApps) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isSupabaseConfigured = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return Boolean(url && key && !url.includes('tu-proyecto'));
  }, []);

  // Función para cargar los datos del perfil y la empresa desde Supabase
  const loadUserData = useCallback(async (userId: string, email?: string) => {
    try {
      const supabase = createClient();
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfil')
        .select('*')
        .eq('id', userId)
        .single();

      if (perfilError) {
        console.warn('Perfil no encontrado aún o en proceso de creación:', perfilError.message);
        return;
      }

      let empresaData: Empresa | null = null;
      if (perfilData.rol === 'empresa') {
        const { data: emp } = await supabase
          .from('empresas')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        empresaData = emp;
      }

      const authUser: AuthUser = {
        ...perfilData,
        role: perfilData.rol,
        email: email || undefined,
        empresa: empresaData,
      };

      setUser(authUser);
      setEmpresa(empresaData);
      setDemoCookie(perfilData.rol);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
    } catch (err) {
      console.error('Error al sincronizar datos de usuario:', err);
    }
  }, []);

  // Inicialización y escucha de estado de autenticación
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (isSupabaseConfigured) {
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user && isMounted) {
            await loadUserData(session.user.id, session.user.email);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Error inicializando sesión con Supabase:', err);
        }
      }

      // Si no hay sesión activa en Supabase, verificar si hay usuario de prueba guardado
      if (isMounted) {
        try {
          const localUser = localStorage.getItem(STORAGE_KEY_USER);
          if (localUser) {
            const parsed = JSON.parse(localUser) as AuthUser;
            setUser(parsed);
            if (parsed.empresa) setEmpresa(parsed.empresa);
            setDemoCookie(parsed.rol || parsed.role || 'postulante');
          }
        } catch {
          // Ignorar
        }
        setIsLoading(false);
      }
    };

    initAuth();

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;

            if (session?.user) {
              await loadUserData(session.user.id, session.user.email);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setEmpresa(null);
              clearDemoCookie();
              localStorage.removeItem(STORAGE_KEY_USER);
            }
            setIsLoading(false);
          }
        );

        return () => {
          isMounted = false;
          authListener.subscription.unsubscribe();
        };
      } catch {
        // Ignorar
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isSupabaseConfigured, loadUserData]);

  // Iniciar sesión
  const login = useCallback(
    async (
      email: string,
      password?: string,
      role?: UserRole
    ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      setIsLoading(true);
      const cleanEmail = email.trim();

      try {
        if (isSupabaseConfigured && password) {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (error) {
            setIsLoading(false);
            let errorMsg = 'Error al iniciar sesión.';
            if (error.message.includes('Invalid login credentials')) {
              errorMsg = 'Correo electrónico o contraseña incorrectos.';
            } else if (error.message.includes('Email not confirmed')) {
              errorMsg = 'Debés confirmar tu correo electrónico antes de ingresar.';
            } else if (error.message.includes('Too many requests')) {
              errorMsg = 'Demasiados intentos fallidos. Por favor aguardá unos minutos.';
            } else {
              errorMsg = error.message;
            }
            return { success: false, error: errorMsg };
          }

          if (data.user) {
            await loadUserData(data.user.id, data.user.email);
            setIsLoading(false);
            const userRole = (data.user.user_metadata?.rol as UserRole) || 'postulante';
            return { success: true, role: userRole };
          }
        }

        // Modo desarrollo / Usuarios Demo
        const demoCandidate = Object.values(DEMO_USERS).find(
          (u) => u.email?.toLowerCase() === cleanEmail.toLowerCase()
        );

        const targetUser: AuthUser = demoCandidate || {
          ...DEMO_USERS[role || 'postulante'],
          id: `user-${Date.now()}`,
          email: cleanEmail,
          nombre: cleanEmail.split('@')[0],
          rol: role || 'postulante',
          role: role || 'postulante',
        };

        setUser(targetUser);
        if (targetUser.empresa) setEmpresa(targetUser.empresa);
        setDemoCookie(targetUser.rol);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(targetUser));
        window.dispatchEvent(new Event('portal_funes_auth_changed'));
        setIsLoading(false);
        return { success: true, role: targetUser.rol };
      } catch (err: unknown) {
        setIsLoading(false);
        const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
        return { success: false, error: message };
      }
    },
    [isSupabaseConfigured, loadUserData]
  );

  // Iniciar sesión rápida en modo demo
  const loginAsDemo = useCallback((role: UserRole) => {
    const demo = DEMO_USERS[role];
    setUser(demo);
    if (demo.empresa) setEmpresa(demo.empresa);
    setDemoCookie(role);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demo));
    window.dispatchEvent(new Event('portal_funes_auth_changed'));
  }, []);

  // Cerrar sesión
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } catch {
      // Ignorar error al cerrar sesión
    } finally {
      clearDemoCookie();
      localStorage.removeItem(STORAGE_KEY_USER);
      setUser(null);
      setEmpresa(null);
      window.dispatchEvent(new Event('portal_funes_auth_changed'));
      setIsLoading(false);
      router.push('/login');
      router.refresh();
    }
  }, [isSupabaseConfigured, router]);

  // Registro de postulante
  const register = useCallback(
    async (
      data: RegisterPostulanteData
    ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
      setIsLoading(true);
      try {
        if (isSupabaseConfigured && data.password) {
          const supabase = createClient();
          const { data: signUpData, error } = await supabase.auth.signUp({
            email: data.email.trim(),
            password: data.password,
            options: {
              data: {
                rol: 'postulante',
                nombre: data.nombre.trim(),
                apellido: data.apellido?.trim() || null,
                dni: data.dni?.trim() || null,
                telefono: data.telefono?.trim() || null,
                es_residente_funes: data.es_residente_funes ?? false,
                barrio: data.barrio?.trim() || null,
              },
            },
          });

          if (error) {
            setIsLoading(false);
            let errorMsg = error.message;
            if (error.message.includes('User already registered')) {
              errorMsg = 'Ya existe una cuenta registrada con este correo electrónico.';
            } else if (error.message.includes('Password should be at least')) {
              errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
            }
            return { success: false, error: errorMsg };
          }

          // Si el registro inició sesión automáticamente
          if (signUpData.session && signUpData.user) {
            await loadUserData(signUpData.user.id, data.email);
            setIsLoading(false);
            return { success: true, requiresEmailConfirmation: false };
          }

          // Si requiere validación de correo
          setIsLoading(false);
          return { success: true, requiresEmailConfirmation: true };
        }

        // Modo demo / sin conexión a Supabase
        const newProfile: AuthUser = {
          id: `user-postulante-${Date.now()}`,
          rol: 'postulante',
          role: 'postulante',
          email: data.email,
          nombre: data.nombre,
          apellido: data.apellido || null,
          dni: data.dni || null,
          telefono: data.telefono || null,
          fecha_nacimiento: null,
          direccion: null,
          barrio: data.barrio || null,
          es_residente_funes: data.es_residente_funes ?? true,
          nivel_educativo: 'Secundario Completo',
          situacion_laboral_actual: 'Búsqueda activa',
          habilidades: [],
          experiencia_resumen: null,
          cv_url: null,
          disponibilidad_horaria: 'Full-time',
          movilidad_propia: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(newProfile);
        setDemoCookie('postulante');
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newProfile));
        window.dispatchEvent(new Event('portal_funes_auth_changed'));
        setIsLoading(false);
        return { success: true, requiresEmailConfirmation: false };
      } catch (err: unknown) {
        setIsLoading(false);
        const message = err instanceof Error ? err.message : 'Error al registrar el perfil';
        return { success: false, error: message };
      }
    },
    [isSupabaseConfigured, loadUserData]
  );

  // Registro de empresa
  const registerEmpresa = useCallback(
    async (
      data: RegisterEmpresaData
    ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
      setIsLoading(true);
      try {
        if (isSupabaseConfigured && data.password) {
          const supabase = createClient();
          const { data: signUpData, error } = await supabase.auth.signUp({
            email: data.email.trim(),
            password: data.password,
            options: {
              data: {
                rol: 'empresa',
                nombre: data.persona_contacto.trim(),
                razon_social: data.razon_social.trim(),
                nombre_fantasia: data.nombre_fantasia?.trim() || data.razon_social.trim(),
                cuit: data.cuit.trim(),
                direccion: data.direccion.trim(),
                localidad: data.localidad?.trim() || 'Funes',
                telefono: data.telefono.trim(),
                telefono_contacto: data.telefono.trim(),
                email_contacto: data.email.trim(),
                persona_contacto: data.persona_contacto.trim(),
                rubro: data.rubro || null,
                descripcion: data.descripcion?.trim() || null,
                sitio_web: data.sitio_web?.trim() || null,
              },
            },
          });

          if (error) {
            setIsLoading(false);
            let errorMsg = error.message;
            if (error.message.includes('User already registered')) {
              errorMsg = 'Ya existe una cuenta registrada con este correo electrónico.';
            } else if (error.message.includes('Password should be at least')) {
              errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
            }
            return { success: false, error: errorMsg };
          }

          // Si hay sesión activa inmediata, insertar en public.empresas si el trigger no corrió
          if (signUpData.session && signUpData.user) {
            try {
              await supabase.from('empresas').insert({
                user_id: signUpData.user.id,
                razon_social: data.razon_social.trim(),
                nombre_fantasia: data.nombre_fantasia?.trim() || data.razon_social.trim(),
                cuit: data.cuit.trim(),
                direccion: data.direccion.trim(),
                localidad: data.localidad?.trim() || 'Funes',
                telefono: data.telefono.trim(),
                email_contacto: data.email.trim(),
                persona_contacto: data.persona_contacto.trim(),
                rubro: data.rubro || null,
                descripcion: data.descripcion?.trim() || null,
                sitio_web: data.sitio_web?.trim() || null,
                verificada: false,
                estado: 'pendiente',
              });
            } catch {
              // Si el trigger ya lo insertó, ignorar
            }

            await loadUserData(signUpData.user.id, data.email);
            setIsLoading(false);
            return { success: true, requiresEmailConfirmation: false };
          }

          setIsLoading(false);
          return { success: true, requiresEmailConfirmation: true };
        }

        // Modo demo / sin conexión a Supabase
        const demoEmpresaData: Empresa = {
          id: `empresa-${Date.now()}`,
          user_id: `user-empresa-${Date.now()}`,
          razon_social: data.razon_social,
          nombre_fantasia: data.nombre_fantasia || data.razon_social,
          cuit: data.cuit,
          direccion: data.direccion,
          localidad: data.localidad || 'Funes',
          telefono: data.telefono,
          email_contacto: data.email,
          persona_contacto: data.persona_contacto,
          rubro: data.rubro || null,
          descripcion: data.descripcion || null,
          sitio_web: data.sitio_web || null,
          verificada: false,
          estado: 'pendiente',
          motivo_rechazo: null,
          revisado_por: null,
          fecha_revision: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newProfile: AuthUser = {
          id: demoEmpresaData.user_id,
          rol: 'empresa',
          role: 'empresa',
          email: data.email,
          nombre: data.persona_contacto,
          apellido: null,
          dni: null,
          telefono: data.telefono,
          fecha_nacimiento: null,
          direccion: data.direccion,
          localidad: data.localidad || 'Funes',
          es_residente_funes: true,
          nivel_educativo: null,
          situacion_laboral_actual: null,
          habilidades: null,
          experiencia_resumen: null,
          cv_url: null,
          disponibilidad_horaria: null,
          movilidad_propia: false,
          empresa: demoEmpresaData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(newProfile);
        setEmpresa(demoEmpresaData);
        setDemoCookie('empresa');
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newProfile));
        window.dispatchEvent(new Event('portal_funes_auth_changed'));
        setIsLoading(false);
        return { success: true, requiresEmailConfirmation: false };
      } catch (err: unknown) {
        setIsLoading(false);
        const message = err instanceof Error ? err.message : 'Error al registrar la empresa';
        return { success: false, error: message };
      }
    },
    [isSupabaseConfigured, loadUserData]
  );

  // Refrescar datos del usuario actual
  const refreshUser = useCallback(async () => {
    if (user?.id) {
      await loadUserData(user.id, user.email);
    }
  }, [user, loadUserData]);

  // Consulta de postulación previa
  const hasAppliedTo = useCallback(
    (jobId: string): boolean => {
      return appliedJobIds.includes(jobId);
    },
    [appliedJobIds]
  );

  // Registro local de postulación realizada
  const recordApplication = useCallback(
    (jobId: string, applicationId: string) => {
      const updated = Array.from(new Set([...appliedJobIds, jobId]));
      setAppliedJobIds(updated);
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(updated));

      try {
        const detailsKey = 'portal_funes_application_details';
        const stored = localStorage.getItem(detailsKey) || '{}';
        const parsed = JSON.parse(stored);
        parsed[jobId] = {
          applicationId,
          date: new Date().toISOString(),
          userId: user?.id,
        };
        localStorage.setItem(detailsKey, JSON.stringify(parsed));
      } catch {
        // Ignorar
      }

      window.dispatchEvent(new Event('portal_funes_auth_changed'));
    },
    [appliedJobIds, user]
  );

  const value = useMemo(
    () => ({
      user,
      empresa,
      isAuthenticated: !!user,
      isLoading,
      role: (user?.rol || user?.role) ?? null,
      appliedJobIds,
      login,
      loginAsDemo,
      logout,
      register,
      registerEmpresa,
      refreshUser,
      hasAppliedTo,
      recordApplication,
    }),
    [
      user,
      empresa,
      isLoading,
      appliedJobIds,
      login,
      loginAsDemo,
      logout,
      register,
      registerEmpresa,
      refreshUser,
      hasAppliedTo,
      recordApplication,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
