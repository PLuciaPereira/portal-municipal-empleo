import React from 'react';
import Link from 'next/link';
import {
  BriefcaseIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-900 text-zinc-300 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Columna 1: Identidad Institucional */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <BriefcaseIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-base block leading-tight">
                  Portal de Empleo
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  Gobierno de Funes
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Servicio público y gratuito de intermediación laboral para vincular a los vecinos de la ciudad de Funes con empresas y oportunidades de trabajo locales.
            </p>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navegación
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li>
                <Link href="/ofertas" className="hover:text-emerald-400 transition-colors">
                  Ofertas Laborales Activas
                </Link>
              </li>
              <li>
                <Link href="/#como-funciona" className="hover:text-emerald-400 transition-colors">
                  Cómo funciona el proceso
                </Link>
              </li>
              <li>
                <Link href="/postulantes" className="hover:text-emerald-400 transition-colors">
                  Registro para Postulantes
                </Link>
              </li>
              <li>
                <Link href="/empresas" className="hover:text-emerald-400 transition-colors">
                  Espacio para Empresas
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información de Contacto */}
          <div id="contacto">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Oficina de Empleo
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Municipalidad de Funes, Santa Fe</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Atención: Lunes a Viernes de 7:00 a 13:00 hs</span>
              </li>
              <li className="flex items-center gap-2">
                <MailIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>empleo@funes.gob.ar</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Privacidad e Intermediación */}
          <div className="bg-zinc-800/60 p-4 rounded-xl border border-zinc-700/60">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <ShieldCheckIcon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Intermediación Segura
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed mb-3">
              Los datos personales y CVs son resguardados por la Oficina de Empleo. Las empresas solo acceden a postulantes preseleccionados para cada puesto.
            </p>
            <Link
              href="/admin"
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 transition-colors block"
            >
              Acceso a gestión interna
            </Link>
          </div>
        </div>

        {/* Barra Inferior */}
        <div className="mt-10 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} Municipalidad de Funes · Portal de Empleo. Todos los derechos reservados.</p>
          <p className="text-zinc-500">
            Funes, el Jardín de la Provincia · Santa Fe, Argentina
          </p>
        </div>
      </div>
    </footer>
  );
};
