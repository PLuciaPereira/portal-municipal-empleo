'use client';

import React from 'react';
import {
  Briefcase,
  Building2,
  Users,
  UserPlus,
  GraduationCap,
  TrendingUp,
  UserCog,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { AdminCounts } from '@/lib/admin';

export type AdminTab =
  | 'inicio'
  | 'nuevas_postulaciones'
  | 'ofertas'
  | 'empresas'
  | 'postulantes'
  | 'registro_asistido'
  | 'capacitaciones'
  | 'administradores'
  | 'estadisticas';

interface AdminHomeViewProps {
  counts: AdminCounts;
  onNavigateTab: (tab: AdminTab) => void;
}

interface ModuleItem {
  id: AdminTab;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant: 'warning' | 'neutral';
  };
}

interface ModuleCategory {
  title: string;
  subtitle: string;
  items: ModuleItem[];
}

export const AdminHomeView: React.FC<AdminHomeViewProps> = ({
  counts,
  onNavigateTab,
}) => {
  const categories: ModuleCategory[] = [
    {
      title: 'Gestión Operativa de Empleo',
      subtitle: 'Nuevas postulaciones, moderación de vacantes y padrón municipal',
      items: [
        {
          id: 'nuevas_postulaciones',
          title: 'Nuevas postulaciones',
          description: 'Revisión rápida de postulantes ingresados, legajos y derivaciones.',
          icon: Inbox,
          badge:
            counts.postulacionesNuevas > 0
              ? { text: `${counts.postulacionesNuevas} sin revisar`, variant: 'warning' }
              : undefined,
        },
        {
          id: 'ofertas',
          title: 'Ofertas laborales',
          description: 'Revisión, aprobación y publicación de vacantes solicitadas por empresas.',
          icon: Briefcase,
          badge:
            counts.ofertasPendientes > 0
              ? { text: `${counts.ofertasPendientes} por aprobar`, variant: 'warning' }
              : undefined,
        },
        {
          id: 'empresas',
          title: 'Validación de empresas',
          description: 'Control de razones sociales, CUIT y autorizaciones de publicación.',
          icon: Building2,
          badge:
            counts.empresasPendientes > 0
              ? { text: `${counts.empresasPendientes} pendientes`, variant: 'warning' }
              : undefined,
        },
        {
          id: 'postulantes',
          title: 'Padrón de postulantes',
          description: 'Búsqueda de vecinos registrados, perfiles y legajos laborales.',
          icon: Users,
          badge:
            counts.postulantesActivos > 0
              ? { text: `${counts.postulantesActivos} registrados`, variant: 'neutral' }
              : undefined,
        },
      ],
    },
    {
      title: 'Atención Presencial y Formación',
      subtitle: 'Carga presencial de legajos y oferta formativa',
      items: [
        {
          id: 'registro_asistido',
          title: 'Registro asistido de CV',
          description: 'Carga directa de antecedentes para vecinos en sede municipal.',
          icon: UserPlus,
        },
        {
          id: 'capacitaciones',
          title: 'Cursos y formación laboral',
          description: 'Programas de capacitación técnica y talleres de empleabilidad.',
          icon: GraduationCap,
        },
      ],
    },
    {
      title: 'Analítica y Administración',
      subtitle: 'Métricas de intermediación y equipo municipal',
      items: [
        {
          id: 'estadisticas',
          title: 'Estadísticas del mercado',
          description: 'Indicadores de demanda local, inserción y reportes del portal.',
          icon: TrendingUp,
        },
        {
          id: 'administradores',
          title: 'Equipo operativo',
          description: 'Gestión de operadores del panel, roles y credenciales de acceso.',
          icon: UserCog,
        },
      ],
    },
  ];

  return (
    <div className="space-y-7 animate-fadeIn pb-8">
      {categories.map((category) => (
        <section key={category.title} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-zinc-200/80 pb-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700">
              {category.title}
            </h2>
            <span className="text-[11px] text-zinc-500 font-medium">
              {category.subtitle}
            </span>
          </div>

          <div
            className={`grid grid-cols-1 ${
              category.items.length === 4
                ? 'sm:grid-cols-2 lg:grid-cols-4'
                : category.items.length === 3
                ? 'md:grid-cols-3'
                : 'md:grid-cols-2'
            } gap-3 sm:gap-4`}
          >
            {category.items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigateTab(item.id);
                    }
                  }}
                  className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-4.5 hover:border-brand-500/60 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group text-left focus:outline-hidden focus:ring-2 focus:ring-brand-800"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100/90 border border-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-900 group-hover:border-brand-200 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border leading-tight ${
                            item.badge.variant === 'warning'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {item.badge.text}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 group-hover:text-brand-900 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-semibold text-brand-900 group-hover:text-brand-950">
                    <span>Revisar</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
