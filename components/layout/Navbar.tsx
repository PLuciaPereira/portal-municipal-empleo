'use client';

import React, { useState } from 'react';
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
} from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { label: 'Ofertas Laborales', href: '/ofertas' },
    { label: 'Cómo Funciona', href: '/#como-funciona' },
    { label: 'Oficina de Empleo', href: '/#contacto' },
  ];

  const roleLabel =
    user?.role === 'postulante'
      ? 'Postulante'
      : user?.role === 'empresa'
      ? 'Empresa'
      : 'Oficina de Empleo';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <span className="font-bold text-zinc-900 leading-tight text-base sm:text-lg">
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
                  className={`text-sm font-medium transition-colors hover:text-emerald-700 ${
                    isActive ? 'text-emerald-700 font-semibold' : 'text-zinc-600'
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
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    {user?.nombre.charAt(0)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-zinc-900 leading-tight">
                      {user?.nombre} {user?.apellido}
                    </span>
                    <Badge variant="emerald" size="sm" className="text-[10px] py-0 px-1.5 self-start">
                      {roleLabel}
                    </Badge>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="text-xs text-zinc-500 hover:text-rose-600 font-medium px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                >
                  Salir
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/empresas"
                  className="text-xs sm:text-sm font-medium text-zinc-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
                >
                  <BuildingIcon className="w-4 h-4 text-zinc-500" />
                  Empresas
                </Link>

                <Button
                  href="/login"
                  size="sm"
                  variant="primary"
                  className="flex items-center gap-1.5"
                >
                  <UserIcon className="w-4 h-4" />
                  Ingresar / Registrarme
                </Button>
              </>
            )}
          </div>

          {/* Botón Móvil */}
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
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 pt-3 pb-6 space-y-4">
          {isAuthenticated && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 block">Conectado como:</span>
                <span className="font-bold text-sm text-zinc-900">
                  {user?.nombre} {user?.apellido}
                </span>
                <Badge variant="emerald" size="sm" className="mt-0.5">
                  {roleLabel}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-rose-600 font-semibold px-2 py-1 rounded bg-white border border-rose-200"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-base font-medium text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50/50 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {!isAuthenticated && (
            <div className="pt-3 border-t border-zinc-100 flex flex-col gap-2.5">
              <Button
                href="/login"
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Iniciar Sesión / Ingresar
              </Button>
              <Button
                href="/registro"
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Registrarme como Postulante
              </Button>
              <Button
                href="/empresas"
                variant="ghost"
                size="md"
                className="w-full justify-center text-zinc-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BuildingIcon className="w-4 h-4 mr-2" />
                Espacio Empresas
              </Button>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-xs text-zinc-500 hover:text-zinc-800 pt-2 flex items-center justify-center gap-1"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5 text-zinc-400" />
                Acceso Oficina de Empleo
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
