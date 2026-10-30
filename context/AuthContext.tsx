'use client';

import { notificarAdmins } from '@/lib/notifications';

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
  direccion?: string;
  localidad?: string;
  acepta_terminos?: boolean;
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
  acepta_terminos?: boolean;
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
    password?: string
  ) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
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

const STORAGE_KEY_APPLICATIONS = 'portal_funes_user_applications';

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

  // Cargar datos de perfil y empresa verificando que la cuenta esté activa y sin baja lógica
  const loadUserData = useCallback(async (userId: string, email?: string): Promise<AuthUser | null> => {
    try {
      const supabase = createClient();
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfil')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .eq('activo', true)
        .maybeSingle();

      if (perfilError || !perfilData) {
        console.warn('Perfil no encontrado, inactivo o con baja lógica:', perfilError?.message);
        setUser(null);
        setEmpresa(null);
        setAppliedJobIds([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_APPLICATIONS);
          localStorage.removeItem('portal_funes_application_details');
        }
        return null;
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

      // Sincronizar postulaciones activas reales del usuario desde public.postulaciones
      // (excluyendo aquellas retiradas voluntariamente para permitir reactivación en ofertas vigentes)
      if (perfilData.rol === 'postulante') {
        try {
          const { data: userApps } = await supabase
            .from('postulaciones')
            .select('oferta_id')
            .eq('postulante_id', userId)
            .neq('estado', 'retirado_por_postulante');

          if (userApps) {
            const validJobIds = userApps
              .map((app) => app.oferta_id)
              .filter((id): id is string => typeof id === 'string' && id.length > 0);
            setAppliedJobIds(validJobIds);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(validJobIds));
            }
          }
        } catch {
          // No bloquear el inicio de sesión si falla la consulta de postulaciones
        }
      } else {
        setAppliedJobIds([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_APPLICATIONS);
          localStorage.removeItem('portal_funes_application_details');
        }
      }

      return authUser;
    } catch (err) {
      console.error('Error al sincronizar datos de usuario:', err);
      setUser(null);
      setEmpresa(null);
      setAppliedJobIds([]);
      return null;
    }
  }, []);

  // Inicialización y escucha de sesión en tiempo real
  useEffect(() => {
    let isMounted = true;

    // Limpieza de cualquier cookie demo residual en el cliente
    if (typeof document !== 'undefined') {
      document.cookie = 'portal_funes_demo_role=; path=/; max-age=0; SameSite=Lax';
      localStorage.removeItem('portal_funes_current_user');
    }

    const initAuth = async () => {
      if (isSupabaseConfigured) {
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user && isMounted) {
            await loadUserData(session.user.id, session.user.email);
          } else {
            setUser(null);
            setEmpresa(null);
            setAppliedJobIds([]);
            if (typeof window !== 'undefined') {
              localStorage.removeItem(STORAGE_KEY_APPLICATIONS);
              localStorage.removeItem('portal_funes_application_details');
            }
          }
        } catch (err) {
          console.warn('Error inicializando sesión con Supabase:', err);
          setUser(null);
          setEmpresa(null);
          setAppliedJobIds([]);
        }
      } else {
        setUser(null);
        setEmpresa(null);
        setAppliedJobIds([]);
      }

      if (isMounted) {
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
              setAppliedJobIds([]);
              if (typeof window !== 'undefined') {
                localStorage.removeItem(STORAGE_KEY_APPLICATIONS);
                localStorage.removeItem('portal_funes_application_details');
              }
            }
            setIsLoading(false);
          }
        );

        return () => {
          isMounted = false;
          authListener.subscription.unsubscribe();
        };
      } catch {
        // Ignorar errores al desuscribir
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isSupabaseConfigured, loadUserData]);

  // Iniciar sesión real contra Supabase Auth
  const login = useCallback(
    async (
      email: string,
      password?: string
    ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      setIsLoading(true);
      const cleanEmail = email.trim();

      if (!password) {
        setIsLoading(false);
        return { success: false, error: 'Por favor ingresá tu contraseña.' };
      }

      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return {
          success: false,
          error: 'El servicio de autenticación no está configurado correctamente.',
        };
      }

      try {
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
          const loadedUser = await loadUserData(data.user.id, data.user.email);
          if (!loadedUser) {
            await supabase.auth.signOut();
            setIsLoading(false);
            return {
              success: false,
              error: 'Tu cuenta no posee un perfil activo o habilitado en el Portal de Empleo.',
            };
          }
          setIsLoading(false);
          return { success: true, role: loadedUser.rol };
        }

        setIsLoading(false);
        return { success: false, error: 'No se pudo iniciar sesión.' };
      } catch (err: unknown) {
        setIsLoading(false);
        const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
        return { success: false, error: message };
      }
    },
    [isSupabaseConfigured, loadUserData]
  );

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
      if (typeof document !== 'undefined') {
        document.cookie = 'portal_funes_demo_role=; path=/; max-age=0; SameSite=Lax';
        localStorage.removeItem('portal_funes_current_user');
        localStorage.removeItem(STORAGE_KEY_APPLICATIONS);
        localStorage.removeItem('portal_funes_application_details');
      }
      setUser(null);
      setEmpresa(null);
      setAppliedJobIds([]);
      window.dispatchEvent(new Event('portal_funes_auth_changed'));
      setIsLoading(false);
      router.push('/login');
      router.refresh();
    }
  }, [isSupabaseConfigured, router]);

  // Registro de postulante contra Supabase Auth
  const register = useCallback(
    async (
      data: RegisterPostulanteData
    ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
      setIsLoading(true);
      try {
        const cleanDni = data.dni ? data.dni.replace(/\D/g, '') : null;
        const trimmedLocalidad = data.localidad?.trim() || null;

        if (!isSupabaseConfigured) {
          setIsLoading(false);
          return {
            success: false,
            error: 'El servicio de autenticación no está configurado correctamente.',
          };
        }

        if (!data.password) {
          setIsLoading(false);
          return { success: false, error: 'Debés ingresar una contraseña para tu cuenta.' };
        }

        const supabase = createClient();
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email.trim(),
          password: data.password,
          options: {
            data: {
              rol: 'postulante',
              nombre: data.nombre.trim(),
              apellido: data.apellido?.trim() || null,
              dni: cleanDni,
              telefono: data.telefono?.trim() || null,
              direccion: data.direccion?.trim() || null,
              localidad: trimmedLocalidad,
              acepta_terminos: data.acepta_terminos ?? true,
            },
          },
        });

        if (error) {
          setIsLoading(false);
          let errorMsg = error.message;
          const lower = error.message.toLowerCase();
          if (lower.includes('user already registered') || lower.includes('already registered')) {
            errorMsg = 'Ya existe una cuenta registrada con este correo electrónico.';
          } else if (lower.includes('password should be at least')) {
            errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
          } else if (
            lower.includes('dni ingresado ya se encuentra registrado') ||
            lower.includes('dni') ||
            error.message.includes('perfil_dni_key') ||
            error.message.includes('idx_perfil_dni_numerico_unico')
          ) {
            errorMsg = 'El DNI ingresado ya se encuentra registrado en el sistema.';
          }
          return { success: false, error: errorMsg };
        }

        if (signUpData.session && signUpData.user) {
          await loadUserData(signUpData.user.id, data.email);
          setIsLoading(false);
          // Notificar a los administradores sobre nuevo postulante registrado
        try {
          const hoy = new Date().toISOString().split('T')[0];
          await notificarAdmins({
            titulo: 'Nuevos postulantes en el portal',
            mensaje: 'Nuevos vecinos se han registrado en el Portal de Empleo Funes.',
            tipo: 'info',
            link: '/admin?tab=postulantes',
            agrupadorKey: 'resumen_postulantes_' + hoy,
          });
        } catch (e) {
          console.warn('Aviso: no se pudo notificar nuevo postulante:', e);
        }

        return { success: true, requiresEmailConfirmation: false };
        }

        setIsLoading(false);
        return { success: true, requiresEmailConfirmation: true };
      } catch (err: unknown) {
        setIsLoading(false);
        const message = err instanceof Error ? err.message : 'Error al registrar el perfil';
        return { success: false, error: message };
      }
    },
    [isSupabaseConfigured, loadUserData]
  );

  // Registro de empresa contra Supabase Auth
  const registerEmpresa = useCallback(
    async (
      data: RegisterEmpresaData
    ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
      setIsLoading(true);
      try {
        if (!isSupabaseConfigured) {
          setIsLoading(false);
          return {
            success: false,
            error: 'El servicio de autenticación no está configurado correctamente.',
          };
        }

        if (!data.password) {
          setIsLoading(false);
          return { success: false, error: 'Debés ingresar una contraseña para tu cuenta.' };
        }

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
              acepta_terminos: data.acepta_terminos ?? true,
            },
          },
        });

        if (error) {
          setIsLoading(false);
          let errorMsg = error.message;
          const lower = error.message.toLowerCase();
          if (lower.includes('user already registered') || lower.includes('already registered')) {
            errorMsg = 'Ya existe una cuenta registrada con este correo electrónico.';
          } else if (lower.includes('password should be at least')) {
            errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
          } else if (lower.includes('cuit ingresado ya se encuentra registrado') || lower.includes('cuit')) {
            errorMsg = 'El CUIT ingresado ya se encuentra registrado en el sistema.';
          }
          return { success: false, error: errorMsg };
        }

        if (signUpData.session && signUpData.user) {
          await loadUserData(signUpData.user.id, data.email);
          setIsLoading(false);
          // Notificar a los administradores sobre nueva empresa para revisión
        try {
          const nombreEmpresa = data.nombre_fantasia?.trim() || data.razon_social.trim();
          await notificarAdmins({
            titulo: 'Nueva empresa para revisión',
            mensaje: `La empresa "${nombreEmpresa}" se ha registrado en el portal y espera verificación.`,
            tipo: 'empresa',
            link: '/admin?tab=empresas&estado=pendiente',
            agrupadorKey: 'empresa_revision_' + (signUpData.user ? signUpData.user.id : data.cuit.trim()),
          });
        } catch (e) {
          console.warn('Aviso: no se pudo notificar nueva empresa:', e);
        }

        return { success: true, requiresEmailConfirmation: false };
        }

        setIsLoading(false);
        return { success: true, requiresEmailConfirmation: true };
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

  // Registro de postulación
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
