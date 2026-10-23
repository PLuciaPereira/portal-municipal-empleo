import React from 'react';
import Link from 'next/link';
import {
  ShoppingBagIcon,
  UtensilsIcon,
  HammerIcon,
  BriefcaseIcon,
  TruckIcon,
  TreesIcon,
  HeartPulseIcon,
  LaptopIcon,
  ArrowRightIcon,
} from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';

export const HomeCategories: React.FC = () => {
  const rubros = [
    {
      nombre: 'Comercio y Atención',
      descripcion: 'Ventas, atención al público, cajeros y repositores',
      icon: ShoppingBagIcon,
      query: 'comercio',
      vacantes: 'Múltiples vacantes',
    },
    {
      nombre: 'Gastronomía y Cocina',
      descripcion: 'Mozos, cocineros, ayudantes y bacheros',
      icon: UtensilsIcon,
      query: 'gastronomia',
      vacantes: 'Demanda constante',
    },
    {
      nombre: 'Oficios y Mantenimiento',
      descripcion: 'Electricidad, plomería, pintura y obra civil',
      icon: HammerIcon,
      query: 'oficios',
      vacantes: 'Obras y servicios',
    },
    {
      nombre: 'Administración y Gestión',
      descripcion: 'Facturación, contabilidad, secretaría y pymes',
      icon: BriefcaseIcon,
      query: 'administracion',
      vacantes: 'Puestos en pymes',
    },
    {
      nombre: 'Logística y Distribución',
      descripcion: 'Choferes, repartidores, depósito y paquetería',
      icon: TruckIcon,
      query: 'logistica',
      vacantes: 'Local y regional',
    },
    {
      nombre: 'Jardinería y Espacios Verdes',
      descripcion: 'Mantenimiento de quintas, piletas y poda',
      icon: TreesIcon,
      query: 'jardineria',
      vacantes: 'Casas y barrios',
    },
    {
      nombre: 'Salud y Cuidado de Personas',
      descripcion: 'Acompañamiento, asistencia y enfermería',
      icon: HeartPulseIcon,
      query: 'salud',
      vacantes: 'Atención y cuidado',
    },
    {
      nombre: 'Tecnología y Soporte',
      descripcion: 'Redes, servicio técnico, diseño y sistemas',
      icon: LaptopIcon,
      query: 'tecnologia',
      vacantes: 'Soporte y remoto',
    },
  ];

  return (
    <section id="rubros" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Badge variant="brand" size="sm">
            Mercado Laboral en Funes
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Principales rubros de empleo en la ciudad
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Explorá las búsquedas y sectores con mayor demanda laboral en los comercios, servicios e industrias de Funes.
          </p>
        </div>
        <Link
          href="/ofertas"
          className="text-xs sm:text-sm font-semibold text-brand-800 hover:text-brand-900 inline-flex items-center gap-1.5 self-start sm:self-auto py-1 px-3 rounded-lg hover:bg-brand-50 transition-colors"
        >
          <span>Explorar todas las vacantes</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>

      {/* Grilla de Rubros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {rubros.map((rubro, index) => {
          const RubroIcon = rubro.icon;
          return (
            <Link
              key={index}
              href={`/ofertas?q=${encodeURIComponent(rubro.query)}`}
              className="group p-5 bg-surface rounded-2xl border border-border hover:border-brand-600 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center mb-3 group-hover:bg-brand-800 group-hover:text-white transition-colors border border-brand-200">
                  <RubroIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground group-hover:text-brand-800 transition-colors leading-snug">
                  {rubro.nombre}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {rubro.descripcion}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-border/70 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                  {rubro.vacantes}
                </span>
                <span className="text-muted-foreground group-hover:text-brand-800 font-semibold inline-flex items-center gap-0.5 transition-colors">
                  Ver ofertas <ArrowRightIcon className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
