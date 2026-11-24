'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { getAdminCounts, AdminCounts } from '@/lib/admin';
import {
  Briefcase,
  Building2,
  Users,
  UserPlus,
  GraduationCap,
  TrendingUp,
  UserCog,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  User,
  ChevronRight,
  Inbox,
} from 'lucide-react';

export const AdminNavbar: React.FC = () => {
  return (
    <Suspense fallback={<AdminNavbarFallback />}>
      <AdminNavbarContent />
    </Suspense>
  );
};

function AdminNavbarFallback() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-md border-b border-border shadow-2xs h-16" />
  );
}

interface AdminNavItem {
  id: string;
  label: string;
  desktopLabel: string;
  desktopShortLabel?: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  iconBg: string;
  isActive: boolean;
}

function AdminNavbarContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const currentTab = pathname === '/admin' ? searchParams.get('tab') || 'inicio' : null;

  const [counts, setCounts] = useState<AdminCounts>({
    empresasPendientes: 0,
    ofertasPendientes: 0,
    postulantesActivos: 0,
    intermediacionesActivas: 0,
    postulacionesNuevas: 0,
  });

  const loadCounts = useCallback(async () => {
    try {
      const data = await getAdminCounts();
      setCounts(data);
    } catch (e) {
      console.error('Error al cargar contadores en AdminNavbar:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      if (!isMounted) return;
      await loadCounts();
    };
    void fetchCounts();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadCounts();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadCounts]);

  const displayName = `${user?.nombre || 'Administrador'} ${user?.apellido || ''}`.trim();

  // Pestañas operativas principales
  const operationalNavItems: AdminNavItem[] = [
    {
      id: 'inicio',
      label: 'Inicio',
      desktopLabel: 'Inicio',
      description: 'Vista general y accesos',
      href: '/admin?tab=inicio',
      icon: LayoutDashboard,
      iconBg: 'bg-brand-50 text-brand-800 border-brand-200/60',
      isActive: pathname === '/admin' && (currentTab === 'inicio' || !currentTab),
    },
    {
      id: 'nuevas_postulaciones',
      label: 'Nuevas postulaciones',
      desktopLabel: 'Postulaciones',
      description: 'Gestión y derivación',
      href: '/admin?tab=nuevas_postulaciones',
      icon: Inbox,
      badge: counts.postulacionesNuevas,
      iconBg: 'bg-amber-50 text-amber-800 border-amber-200/60',
      isActive: pathname === '/admin' && currentTab === 'nuevas_postulaciones',
    },
    {
      id: 'ofertas',
      label: 'Ofertas laborales',
      desktopLabel: 'Ofertas',
      description: 'Moderación y vacantes',
      href: '/admin?tab=ofertas',
      icon: Briefcase,
      badge: counts.ofertasPendientes,
      iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
      isActive: pathname === '/admin' && currentTab === 'ofertas',
    },
    {
      id: 'empresas',
      label: 'Validación de empresas',
      desktopLabel: 'Empresas',
      description: 'Habilitaciones y CUIT',
      href: '/admin?tab=empresas',
      icon: Building2,
      badge: counts.empresasPendientes,
      iconBg: 'bg-amber-50 text-amber-800 border-amber-200/60',
      isActive: pathname === '/admin' && currentTab === 'empresas',
    },
    {
      id: 'postulantes',
      label: 'Padrón de postulantes',
      desktopLabel: 'Postulantes',
      description: 'Búsqueda y derivaciones',
      href: '/admin?tab=postulantes',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-800 border-blue-200/60',
      isActive: pathname === '/admin' && currentTab === 'postulantes',
    },
    {
      id: 'registro_asistido',
      label: 'Registro asistido',
      desktopLabel: 'Registro asistido',
      desktopShortLabel: 'Reg. asistido',
      description: 'Carga presencial de CV',
      href: '/admin?tab=registro_asistido',
      icon: UserPlus,
      iconBg: 'bg-teal-50 text-teal-800 border-teal-200/60',
      isActive: pathname === '/admin' && currentTab === 'registro_asistido',
    },
  ];

  // Pestañas secundarias (Cursos, Estadísticas, Equipo)
  const secondaryNavItems: AdminNavItem[] = [
    {
      id: 'capacitaciones',
      label: 'Cursos y formación',
      desktopLabel: 'Cursos',
      href: '/admin?tab=capacitaciones',
      icon: GraduationCap,
      iconBg: 'bg-indigo-50 text-indigo-700',
      isActive: pathname === '/admin' && currentTab === 'capacitaciones',
    },
    {
      id: 'estadisticas',
      label: 'Estadísticas del mercado',
      desktopLabel: 'Estadísticas',
      href: '/admin?tab=estadisticas',
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 text-emerald-700',
      isActive: pathname === '/admin' && currentTab === 'estadisticas',
    },
    {
      id: 'administradores',
      label: 'Equipo operativo',
      desktopLabel: 'Equipo',
      href: '/admin?tab=administradores',
      icon: UserCog,
      iconBg: 'bg-zinc-100 text-zinc-700',
      isActive: pathname === '/admin' && currentTab === 'administradores',
    },
  ];

  const allNavItems: AdminNavItem[] = [...operationalNavItems, ...secondaryNavItems];

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-md border-b border-border shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16">
          
          {/* LADO IZQUIERDO: Escudo Oficial desplazado hacia adentro (~140px de ancho para equilibrio) */}
          <div className="flex items-center justify-start min-w-[60px] lg:min-w-[140px] pl-1 sm:pl-2 shrink-0 select-none">
            <div
              className="flex items-center p-1 rounded-xl select-none cursor-default"
              title="Portal de Empleo · Municipalidad de Funes"
              aria-label="Portal de Empleo - Municipalidad de Funes"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-800 hover:bg-brand-900 flex items-center justify-center p-1.5 shadow-xs transition-colors cursor-default select-none">
                <Image
                  src="/escudo-funes-blanco.png"
                  alt="Escudo Oficial de la Municipalidad de Funes"
                  width={28}
                  height={28}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  priority
                />
              </div>
            </div>
          </div>

          {/* CENTRO: Las 7 Pestañas Rigurosamente Centradas en Desktop */}
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-1 xl:gap-2 px-2" aria-label="Navegación del administrador">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    item.isActive
                      ? 'bg-brand-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {'desktopShortLabel' in item && item.desktopShortLabel ? (
                    <>
                      <span className="hidden xl:inline">{item.desktopLabel}</span>
                      <span className="xl:hidden">{item.desktopShortLabel}</span>
                    </>
                  ) : (
                    <span>{item.desktopLabel}</span>
                  )}
                  {Boolean('badge' in item && item.badge && item.badge > 0) && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold leading-none ${
                      item.isActive ? 'bg-amber-400 text-zinc-900' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* LADO DERECHO: Acciones y Usuario Compacto Simétrico (~140px de ancho) */}
          <div className="hidden sm:flex items-center justify-end min-w-[60px] lg:min-w-[140px] gap-2 shrink-0">
            <NotificationBell />

            {/* Separador vertical sutil */}
            <div className="h-5 w-px bg-zinc-200" />

            {/* Icono de Usuario Administrador Compacto y Elegante */}
            <Link
              href="/admin?tab=inicio"
              title={`Administrador: ${displayName}`}
              aria-label={`Perfil de ${displayName}`}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 hover:border-zinc-300 hover:scale-105 transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold text-xs group-hover:bg-brand-900 transition-colors">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
            </Link>

            {/* Botón Salir Icono Compacto con Tooltip */}
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center justify-center w-9 h-9 text-zinc-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Controles para Pantallas menores a LG: Notificaciones + Menú hamburguesa */}
          <div className="flex lg:hidden items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 focus:outline-none cursor-pointer"
              aria-label="Menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menú Móvil Desplegable: Drawer Estilizado con Jerarquía por Áreas */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-surface px-4 pt-3 pb-6 space-y-4 animate-in fade-in-0 duration-150">
          
          {/* 1. Identificación del administrador en móvil */}
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/90 flex items-center justify-between shadow-2xs">
            <Link
              href="/admin?tab=inicio"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 min-w-0 mr-2 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <User className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-foreground block truncate max-w-[170px] group-hover:text-brand-900">
                  {displayName}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Administrador Municipal
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-bold px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer shrink-0 shadow-2xs"
            >
              <LogOut className="w-3 h-3" />
              <span>Salir</span>
            </button>
          </div>

          {/* 2. Bloque: Gestión Operativa (Lista elegante con iconos temáticos y chevron) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
              Gestión Operativa
            </span>

            {operationalNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                    item.isActive
                      ? 'bg-brand-900 text-white shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/70 text-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      item.isActive
                        ? 'bg-white/15 text-white'
                        : `border ${item.iconBg}`
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs block leading-tight truncate">
                        {item.label}
                      </span>
                      <span className={`text-[10px] font-medium block truncate ${
                        item.isActive ? 'text-brand-100' : 'text-zinc-500'
                      }`}>
                        {item.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${
                        item.isActive
                          ? 'bg-amber-400 text-zinc-900'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 ${
                      item.isActive ? 'text-brand-200' : 'text-zinc-400'
                    }`} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 3. Bloque: Formación y Configuración (3 tarjetas simétricas y limpias) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
              Formación y Configuración
            </span>

            <div className="grid grid-cols-3 gap-2">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all ${
                      item.isActive
                        ? 'bg-brand-900 text-white border-brand-900 shadow-xs'
                        : 'bg-zinc-50 border-zinc-200/70 hover:bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                      item.isActive ? 'bg-white/15 text-white' : item.iconBg
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[11px] leading-none truncate w-full">
                      {item.desktopLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </header>
  );
}
