'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BriefcaseIcon,
  BuildingIcon,
  UserIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

export interface AppSidebarProps {
  isCompact?: boolean;
  className?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCompact = false,
  className = '',
}) => {
  const pathname = usePathname();

  const navigation = [
    { name: 'Ofertas Laborales', href: '/ofertas', icon: BriefcaseIcon },
    { name: 'Postulantes', href: '/postulantes', icon: UserIcon },
    { name: 'Empresas', href: '/empresas', icon: BuildingIcon },
    { name: 'Oficina de Empleo', href: '/admin', icon: ShieldCheckIcon },
  ];

  return (
    <aside
      className={`bg-brand-900 text-white flex flex-col justify-between transition-all duration-200 ${
        isCompact ? 'w-20' : 'w-64'
      } ${className}`}
    >
      <div>
        {/* Marca Superior Institucional (Sección 12 del Design System) */}
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center">
            <Image
              src="/escudo-funes-blanco.png"
              alt="Escudo Municipalidad de Funes"
              width={38}
              height={38}
              className="w-full h-full object-contain"
              priority
            />
          </div>

          {!isCompact && (
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-[11px] font-bold tracking-wider uppercase text-white/90 leading-tight">
                Municipalidad
              </span>
              <span className="text-xs font-extrabold tracking-wider uppercase text-white leading-tight">
                De Funes
              </span>
              <span className="text-[11px] text-brand-400 font-medium leading-tight mt-0.5">
                Portal de Empleo
              </span>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="p-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title={item.name}
              >
                <Icon className="w-5 h-5 shrink-0 text-white/90" />
                {!isCompact && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer del Sidebar */}
      <div className="p-4 border-t border-white/10 text-[11px] text-white/60 text-center">
        {!isCompact ? 'Gobierno de la Ciudad de Funes' : 'Funes'}
      </div>
    </aside>
  );
};
