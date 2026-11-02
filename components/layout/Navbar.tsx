'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import {
  BuildingIcon,
  UserIcon,
  MenuIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ArrowRightIcon,
} from '@/components/ui/Icons';
import { LogIn, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NotificationBell } from '@/components/layout/NotificationBell';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [empresaDropdownOpen, setEmpresaDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const empresaDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown de empresa con click outside o escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        empresaDropdownRef.current &&
        !empresaDropdownRef.current.contains(event.target as Node)
      ) {
        setEmpresaDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEmpresaDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (mobileMenuOpen) {
        setIsVisible(true);
        return;
      }

      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      const delta = currentScrollY - lastScrollY.current;

      // Arriba de todo siempre visible
      if (currentScrollY <= 20) {
        setIsVisible(true);
      } else if (delta > 8 && currentScrollY > 70) {
        // Scrolleando hacia abajo de manera clara -> ocultar
        setIsVisible(false);
      } else if (delta < -5) {
        // Scrolleando hacia arriba (incluso leve) -> mostrar inmediatamente
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);
  const pathname = usePathname();
  const { user, empresa, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { label: 'Ofertas laborales', href: '/ofertas' },
    { label: 'Rubros', href: '/#rubros' },
    { label: 'Cómo funciona', href: '/#como-funciona' },
    { label: 'Cursos', href: '/#capacitaciones' },
    { label: 'Oficina de Empleo', href: '/#contacto' },
  ];

  const role = user?.rol || user?.role;

  const roleLabel =
    role === 'postulante'
      ? 'Postulante'
      : role === 'empresa'
      ? 'Empresa'
      : 'Administrador';

  const roleBadgeVariant =
    role === 'empresa'
      ? 'blue'
      : role === 'admin'
      ? 'zinc'
      : 'emerald';

  const dashboardHref =
    role === 'empresa'
      ? '/empresa'
      : role === 'admin'
      ? '/admin'
      : '/postulante';

  const dashboardLabel =
    role === 'empresa'
      ? 'Panel Empresa'
      : role === 'admin'
      ? 'Panel Municipal'
      : 'Mi Panel';

  const displayName =
    role === 'empresa' && (empresa?.nombre_fantasia || empresa?.razon_social)
      ? empresa.nombre_fantasia || empresa.razon_social
      : `${user?.nombre || 'Usuario'} ${user?.apellido || ''}`.trim();

  return (
    <header className={`sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-md border-b border-border transform-gpu transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0 opacity-100 shadow-xs' : '-translate-y-full opacity-0 pointer-events-none'}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Branding Institucional */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center p-1.5 shadow-xs group-hover:bg-brand-900 transition-colors">
              <Image
                src="/escudo-funes-blanco.png"
                alt="Escudo Oficial de la Municipalidad de Funes"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-tight text-base sm:text-lg">
                Portal de Empleo
              </span>
              <span className="text-xs text-brand-800 font-medium tracking-wide">
                Gobierno de Funes
              </span>
            </div>
          </Link>

          {/* Links de Navegación de Escritorio */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-brand-800 ${
                    isActive ? 'text-brand-800 font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Acciones de Escritorio */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Link
                  href={dashboardHref}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-left"
                >
                  {user?.avatar_url || empresa?.logo_url ? (
                    <img
                      src={user?.avatar_url || empresa?.logo_url || ''}
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-300 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900 leading-tight text-xs max-w-[140px] truncate">
                      {displayName}
                    </span>
                    <Badge variant={roleBadgeVariant} size="sm" className="text-[10px] py-0 px-1.5 self-start">
                      {roleLabel}
                    </Badge>
                  </div>
                </Link>


                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-xs text-zinc-500 hover:text-rose-600 font-medium px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                >
                  Salir
                </button>
              </div>
            ) : (
              <>
                {/* Desplegable interactivo para Empresas */}
                <div className="relative" ref={empresaDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setEmpresaDropdownOpen(!empresaDropdownOpen)}
                    aria-expanded={empresaDropdownOpen}
                    aria-haspopup="true"
                    className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      empresaDropdownOpen
                        ? 'bg-zinc-100 text-brand-900'
                        : 'text-zinc-700 hover:text-brand-900 hover:bg-zinc-100'
                    }`}
                  >
                    <BuildingIcon className="w-4 h-4 text-zinc-500" />
                    <span>Empresas</span>
                    <ChevronDownIcon
                      className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                        empresaDropdownOpen ? 'rotate-180 text-brand-800' : ''
                      }`}
                    />
                  </button>

                  {empresaDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-surface rounded-2xl shadow-xl border border-border p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
                        Espacio empresas y comercios
                      </div>
                      <Link
                        href="/login?redirect=/empresa"
                        onClick={() => setEmpresaDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-brand-50/70 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-brand-800 group-hover:text-white transition-colors">
                          <LogIn className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground group-hover:text-brand-900 leading-tight">
                            Iniciar sesión
                          </span>
                          <span className="text-xs text-muted-foreground leading-normal mt-0.5">
                            Ingresá al panel de tu empresa
                          </span>
                        </div>
                      </Link>

                      <Link
                        href="/registro/empresa"
                        onClick={() => setEmpresaDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-brand-50/70 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-brand-800 group-hover:text-white transition-colors">
                          <PlusCircle className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground group-hover:text-brand-900 leading-tight">
                            Registrar mi empresa
                          </span>
                          <span className="text-xs text-muted-foreground leading-normal mt-0.5">
                            Creá tu cuenta para publicar vacantes
                          </span>
                        </div>
                      </Link>

                      <div className="mt-1 pt-2 border-t border-border/60 px-3 py-1 text-[11px] text-muted-foreground">
                        Servicio 100% público y gratuito
                      </div>
                    </div>
                  )}
                </div>

                {/* Iniciar sesión general */}
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-medium text-zinc-700 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Iniciar sesión
                </Link>

                {/* Registrarme (Postulantes) */}
                <Button
                  href="/registro"
                  size="sm"
                  variant="primary"
                  className="flex items-center gap-1.5 shadow-xs"
                >
                  <UserIcon className="w-4 h-4" />
                  Registrarme
                </Button>
              </>
            )}
          </div>

          {/* Botón Menú Móvil */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 focus:outline-none"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 pt-3 pb-6 space-y-4">
          {isAuthenticated && (
            <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Conectado como:</span>
                <span className="font-bold text-sm text-foreground block truncate max-w-[180px]">
                  {displayName}
                </span>
                <Badge variant={roleBadgeVariant} size="sm" className="mt-0.5">
                  {roleLabel}
                </Badge>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs text-brand-800 font-bold hover:underline"
                  >
                    Ir a {dashboardLabel} &rarr;
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-destructive font-semibold px-2 py-0.5 rounded bg-surface border border-rose-200 cursor-pointer"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}

          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-base font-medium text-foreground hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {!isAuthenticated && (
            <div className="pt-3 border-t border-border/60 flex flex-col gap-4">
              {/* Sección Postulantes */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Vecinos y Postulantes
                </span>
                <Button
                  href="/registro"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  Registrarme como postulante
                </Button>
                <Button
                  href="/login"
                  variant="outline"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Iniciar sesión
                </Button>
              </div>

              {/* Sección Empresas */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Empresas y Comercios
                </span>
                <Link
                  href="/login?redirect=/empresa"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl border border-border bg-surface hover:bg-brand-50 flex items-center justify-between text-sm font-semibold text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <LogIn className="w-4 h-4 text-brand-800" />
                    <span>Iniciar sesión empresa</span>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/registro/empresa"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl border border-brand-200 bg-brand-50/50 hover:bg-brand-50 flex items-center justify-between text-sm font-semibold text-brand-900 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BuildingIcon className="w-4 h-4 text-brand-800" />
                    <span>Registrar mi empresa</span>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-brand-700" />
                </Link>
              </div>

              {/* Acceso Institucional */}
              <Link
                href="/login?redirect=/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-xs text-muted-foreground hover:text-foreground pt-1 pb-1 flex items-center justify-center gap-1.5"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5 text-brand-700" />
                Acceso Oficina de Empleo
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
