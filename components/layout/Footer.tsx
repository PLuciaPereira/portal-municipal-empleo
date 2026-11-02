'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

export const Footer: React.FC = () => {
  const pathname = usePathname();

  // Detectar si la ruta actual pertenece a uno de los paneles de gestión
  const isPanel =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/empresa') ||
    pathname?.startsWith('/postulante');

  if (isPanel) {
    return <PanelFooter />;
  }

  return <PublicFooter />;
};

/**
 * Micro-footer institucional compacto para paneles de usuario (/postulante, /empresa, /admin)
 * Ocupa ~46px de alto, preserva la identidad oficial y provee canal directo de asistencia sin distraer.
 */
const PanelFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-900 text-zinc-400 border-t border-zinc-800 py-3 px-4 sm:px-6 lg:px-8 mt-auto shrink-0">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Identidad Oficial y Derechos */}
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-brand-800 flex items-center justify-center p-0.5 shrink-0 shadow-xs">
            <Image
              src="/escudo-funes-blanco.png"
              alt="Escudo Oficial de la Municipalidad de Funes"
              width={18}
              height={18}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-medium text-zinc-300">
            Municipalidad de Funes
            <span className="text-zinc-600 mx-2">|</span>
            <span className="text-zinc-400">Portal de Empleo © {currentYear}</span>
          </span>
        </div>

        {/* Canal de Asistencia de la Oficina de Empleo */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="text-zinc-500">¿Dudas con tu gestión?</span>
          <a
            href="mailto:empleo@funes.gob.ar"
            className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-medium underline underline-offset-2 transition-colors"
          >
            <MailIcon className="w-3.5 h-3.5 shrink-0" />
            <span>empleo@funes.gob.ar</span>
          </a>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-500 hidden sm:inline">Lun a Vie 7 a 13 hs</span>
        </div>
      </div>
    </footer>
  );
};

/**
 * Footer institucional compacto para páginas públicas (Home, Ofertas, Registro, etc.)
 * Optimizado a py-5 (~170px de alto) con espaciado ágil sin perder claridad ni jerarquía.
 */
const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-900 text-zinc-300 border-t border-zinc-800 shrink-0">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Columna 1: Identidad Institucional */}
          <div className="space-y-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                <Image
                  src="/escudo-funes-blanco.png"
                  alt="Escudo Oficial de la Municipalidad de Funes"
                  width={26}
                  height={26}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-white text-sm block leading-tight">
                  Portal de Empleo
                </span>
                <span className="text-[11px] text-brand-400 font-medium">
                  Gobierno de Funes
                </span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Servicio público y gratuito de intermediación laboral para vincular a vecinos con oportunidades de trabajo en Funes.
            </p>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Navegación
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li>
                <Link href="/ofertas" className="hover:text-brand-300 transition-colors">
                  Ofertas laborales activas
                </Link>
              </li>
              <li>
                <Link href="/#como-funciona" className="hover:text-brand-300 transition-colors">
                  Cómo funciona el proceso
                </Link>
              </li>
              <li>
                <Link href="/registro" className="hover:text-brand-300 transition-colors">
                  Registro para postulantes
                </Link>
              </li>
              <li>
                <Link href="/registro/empresa" className="hover:text-brand-300 transition-colors">
                  Espacio para empresas
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información de Contacto */}
          <div id="contacto">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Oficina de Empleo
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li className="flex items-start gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span>Municipalidad de Funes, Santa Fe</span>
              </li>
              <li className="flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <span>Lun a Vie de 7:00 a 13:00 hs</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MailIcon className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <a
                  href="mailto:empleo@funes.gob.ar"
                  className="hover:text-brand-300 transition-colors text-brand-400 font-medium"
                >
                  empleo@funes.gob.ar
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 4: Garantía de Intermediación y Confidencialidad */}
          <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-brand-400">
                <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  Intermediación segura
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug">
                Datos personales y CVs resguardados por la Oficina de Empleo. Preselección transparente para cada búsqueda.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-700/50 flex items-center justify-between text-[10px] text-zinc-400">
              <span>Trámite 100% gratuito</span>
              <span className="text-brand-400 font-medium">Santa Fe</span>
            </div>
          </div>
        </div>

        {/* Barra Inferior */}
        <div className="mt-5 pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
          <p>© {currentYear} Municipalidad de Funes · Portal de Empleo. Todos los derechos reservados.</p>
          <p className="text-zinc-500">
            Funes, el Jardín de la Provincia · Santa Fe, Argentina
          </p>
        </div>
      </div>
    </footer>
  );
};
