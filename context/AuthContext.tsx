'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  appliedJobIds: string[];
  login: (email: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (role: UserRole) => void;
  logout: () => void;
  register: (profileData: Partial<Profile> & { email: string; nombre: string }) => Promise<{ success: boolean; error?: string }>;
  hasAppliedTo: (jobId: string) => boolean;
  recordApplication: (jobId: string, applicationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Perfiles de prueba precargados para desarrollo y testing
export const DEMO_USERS: Record<UserRole, Profile> = {
  postulante: {
    id: 'postulante-demo-1',
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
  },
  admin: {
    id: 'admin-demo-1',
    role: 'admin',
    email: 'empleo@funes.gob.ar',
    nombre: 'Coordinación',
    apellido: 'Oficina de Empleo',
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
};

const STORAGE_KEY_USER = 'portal_funes_current_user';
const STORAGE_KEY_APPLICATIONS = 'portal_funes_user_applications';

const subscribeToAuth = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('portal_funes_auth_changed', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('portal_funes_auth_changed', callback);
  };
};

const getUserSnapshot = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_USER);
  } catch {
    return null;
  }
};

const getAppsSnapshot = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_APPLICATIONS);
  } catch {
    return null;
  }
};

const getServerSnapshot = () => null;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const rawUser = useSyncExternalStore(subscribeToAuth, getUserSnapshot, getServerSnapshot);
  const rawApps = useSyncExternalStore(subscribeToAuth, getAppsSnapshot, getServerSnapshot);

  const user = useMemo(() => {
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as Profile;
    } catch {
      return null;
    }
  }, [rawUser]);

  const appliedJobIds = useMemo(() => {
    if (!rawApps) return [];
    try {
      return JSON.parse(rawApps) as string[];
    } catch {
      return [];
    }
  }, [rawApps]);

  const login = useCallback(
    async (email: string, role: UserRole = 'postulante'): Promise<{ success: boolean; error?: string }> => {
      try {
        const demoCandidate = Object.values(DEMO_USERS).find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );

        const targetUser: Profile = demoCandidate || {
          ...DEMO_USERS[role],
          id: `user-${Date.now()}`,
          email,
          nombre: email.split('@')[0],
        };

        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(targetUser));
        window.dispatchEvent(new Event('portal_funes_auth_changed'));
        return { success: true };
      } catch {
        return { success: false, error: 'Error al iniciar sesión' };
      }
    },
    []
  );

  const loginAsDemo = useCallback((role: UserRole) => {
    const demo = DEMO_USERS[role];
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demo));
    window.dispatchEvent(new Event('portal_funes_auth_changed'));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_USER);
    window.dispatchEvent(new Event('portal_funes_auth_changed'));
  }, []);

  const register = useCallback(
    async (
      profileData: Partial<Profile> & { email: string; nombre: string }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const newProfile: Profile = {
          id: `user-postulante-${Date.now()}`,
          role: 'postulante',
          email: profileData.email,
          nombre: profileData.nombre,
          apellido: profileData.apellido || null,
          dni: profileData.dni || null,
          telefono: profileData.telefono || null,
          fecha_nacimiento: profileData.fecha_nacimiento || null,
          direccion: profileData.direccion || null,
          barrio: profileData.barrio || null,
          es_residente_funes: profileData.es_residente_funes ?? true,
          nivel_educativo: profileData.nivel_educativo || 'Secundario Completo',
          situacion_laboral_actual: profileData.situacion_laboral_actual || 'Búsqueda activa',
          habilidades: profileData.habilidades || [],
          experiencia_resumen: profileData.experiencia_resumen || null,
          cv_url: null,
          disponibilidad_horaria: profileData.disponibilidad_horaria || 'Full-time',
          movilidad_propia: profileData.movilidad_propia ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newProfile));
        window.dispatchEvent(new Event('portal_funes_auth_changed'));
        return { success: true };
      } catch {
        return { success: false, error: 'Error al registrar el perfil' };
      }
    },
    []
  );

  const hasAppliedTo = useCallback(
    (jobId: string): boolean => {
      return appliedJobIds.includes(jobId);
    },
    [appliedJobIds]
  );

  const recordApplication = useCallback(
    (jobId: string, applicationId: string) => {
      const updated = Array.from(new Set([...appliedJobIds, jobId]));
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(updated));

      // Guardar detalle con ID de trámite
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
        // Ignorar error
      }

      window.dispatchEvent(new Event('portal_funes_auth_changed'));
    },
    [appliedJobIds, user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      role: user?.role || null,
      appliedJobIds,
      login,
      loginAsDemo,
      logout,
      register,
      hasAppliedTo,
      recordApplication,
    }),
    [user, appliedJobIds, login, loginAsDemo, logout, register, hasAppliedTo, recordApplication]
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
