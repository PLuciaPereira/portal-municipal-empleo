'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/layout/NotificationBell';
import {
  User,
  Inbox,
  GraduationCap,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export const PostulanteNavbar: React.FC = () => {
  return (
    <Suspense fallback={<PostulanteNavbarFallback />}>
      <PostulanteNavbarContent />
    </Suspense>
  );
};

function PostulanteNavbarFallback() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-md border-b border-border shadow-2xs h-16" />
  );
}

interface PostulanteNavItem {
  id: string;
  label: string;
  desktopLabel: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  isActive: boolean;
}

function PostulanteNavbarContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const currentTab = pathname === '/postulante' ? searchParams.get('tab') || 'perfil' : null;
  const isOfertas = pathname?.startsWith('/ofertas');

  const displayName = `${user?.nombre || 'Postulante'} ${user?.apellido || ''}`.trim();

  const navItems: PostulanteNavItem[] = [
    {
      id: 'perfil',
      label: 'Mi perfil y CV',
      desktopLabel: 'Mi Perfil y CV',
      description: 'Datos personales y experiencia',
      href: '/postulante?tab=perfil',
      icon: User,
      iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
      isActive: pathname === '/postulante' && currentTab === 'perfil',
    },
    {
      id: 'postulaciones',
      label: 'Mis postulaciones',
      desktopLabel: 'Mis Postulaciones',
      description: 'Seguimiento de búsquedas',
      href: '/postulante?tab=postulaciones',
      icon: Inbox,
      iconBg: 'bg-blue-50 text-blue-800 border-blue-200/60',
      isActive: pathname === '/postulante' && currentTab === 'postulaciones',
    },
    {
      id: 'cursos',
      label: 'Cursos y talleres',
      desktopLabel: 'Cursos y Talleres',
      description: 'Capacitaciones municipales',
      href: '/postulante?tab=cursos',
      icon: GraduationCap,
      iconBg: 'bg-indigo-50 text-indigo-800 border-indigo-200/60',
      isActive: pathname === '/postulante' && currentTab === 'cursos',
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-md border-b border-border shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16">
          
          {/* LADO IZQUIERDO: Escudo Oficial (~140px de ancho para equilibrio simétrico con Admin) */}
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

          {/* CENTRO: Navegación de Escritorio centrada */}
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-1 xl:gap-2 px-2" aria-label="Navegación del postulante">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.label}
                  className={`inline-flex items-center gap-2 px-2.5 xl:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    item.isActive
                      ? 'bg-brand-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.desktopLabel}</span>
                </Link>
              );
            })}

            {/* Separador sutil antes de Explorar Ofertas */}
            <div className="h-5 w-px bg-zinc-200 mx-1" />

            {/* Explorar ofertas con acento ámbar */}
            <Link
              href="/ofertas"
              title="Explorar ofertas laborales públicas"
              className={`inline-flex items-center gap-2 px-3 xl:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isOfertas
                  ? 'bg-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-500/20'
                  : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 shadow-2xs'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-amber-800" />
              <span>Explorar Ofertas</span>
            </Link>
          </nav>

          {/* LADO DERECHO: Acciones y Usuario Compacto Simétrico (~140px de ancho) */}
          <div className="hidden sm:flex items-center justify-end min-w-[60px] lg:min-w-[140px] gap-2 shrink-0">
            <NotificationBell />

            {/* Separador vertical sutil */}
            <div className="h-5 w-px bg-zinc-200" />

            {/* Avatar interactivo de Postulante Compacto */}
            <Link
              href="/postulante?tab=perfil"
              title={`Postulante: ${displayName}`}
              aria-label={`Perfil de ${displayName}`}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 hover:border-zinc-300 hover:scale-105 transition-all group cursor-pointer shadow-2xs overflow-hidden"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-7 h-7 rounded-lg object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-200 transition-colors">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
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

      {/* Menú Móvil Desplegable: Drawer Estilizado */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-surface px-4 pt-3 pb-6 space-y-4 animate-in fade-in-0 duration-150">
          
          {/* 1. Identificación del Postulante en móvil */}
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/90 flex items-center justify-between shadow-2xs">
            <Link
              href="/postulante?tab=perfil"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 min-w-0 mr-2 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs overflow-hidden">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-foreground block truncate max-w-[170px] group-hover:text-brand-900">
                  {displayName}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Perfil Postulante
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

          {/* 2. Bloque: Mi Cuenta y Formación */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
              Mi Cuenta y Formación
            </span>

            {navItems.map((item) => {
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
                      {item.description && (
                        <span className={`text-[10px] font-medium block truncate ${
                          item.isActive ? 'text-brand-100' : 'text-zinc-500'
                        }`}>
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronRight className={`w-4 h-4 ${
                      item.isActive ? 'text-brand-200' : 'text-zinc-400'
                    }`} />
                  </div>
                </Link>
              );
            })}

            {/* Acción destacada en móvil: Explorar Ofertas */}
            <Link
              href="/ofertas"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between p-2.5 rounded-2xl transition-all mt-2 ${
                isOfertas
                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-950 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isOfertas ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900'
                }`}>
                  <Search className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs block leading-tight">
                    Explorar Ofertas
                  </span>
                  <span className="text-[10px] font-medium block text-amber-800">
                    Ver ofertas laborales públicas
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-800" />
            </Link>
          </div>

        </div>
      )}
    </header>
  );
};
