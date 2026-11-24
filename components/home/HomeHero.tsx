import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  SearchIcon,
  UserIcon,
  ShieldCheckIcon,
  BuildingIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  MapPinIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Job } from '@/types/database';

interface HomeHeroProps {
  latestJobs?: Job[];
}

interface FallbackJob {
  id: string;
  puesto: string;
  empresa: string;
  modalidad: string;
  zona: string;
}

const fallbackJobs: FallbackJob[] = [
  {
    id: 'fb-1',
    puesto: 'Atención al Cliente y Ventas',
    empresa: 'Comercio Céntrico',
    modalidad: 'Presencial · Full-time',
    zona: 'Funes Centro',
  },
  {
    id: 'fb-2',
    puesto: 'Ayudante de Cocina / Bachero',
    empresa: 'Gastronomía Local',
    modalidad: 'Turnos rotativos',
    zona: 'Ruta 9 y Galindo',
  },
  {
    id: 'fb-3',
    puesto: 'Auxiliar Administrativo Contable',
    empresa: 'Pyme de Servicios',
    modalidad: 'Lunes a viernes',
    zona: 'Parque Industrial Funes',
  },
];

const quickSearchChips = [
  { label: 'Gastronomía', query: 'gastronomia' },
  { label: 'Atención al Cliente', query: 'comercio' },
  { label: 'Administración', query: 'administracion' },
  { label: 'Mantenimiento y Oficios', query: 'mantenimiento' },
  { label: 'Logística', query: 'logistica' },
];

export const HomeHero: React.FC<HomeHeroProps> = ({ latestJobs = [] }) => {
  // Si tenemos ofertas reales pasadas por props, usamos las primeras 3; si no, usamos el fallback
  const hasRealJobs = latestJobs && latestJobs.length > 0;
  const displayJobs = hasRealJobs ? latestJobs.slice(0, 3) : null;

  return (
    <div className="bg-background border-b border-border">
      {/* Sección Principal de 2 Columnas (Desktop) / Apilada (Mobile) */}
      <section className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-8 pb-5 sm:pt-12 sm:pb-8 2xl:pt-16 2xl:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 2xl:gap-12 items-center justify-center">
          
          {/* =========================================================
              COLUMNA IZQUIERDA: Propuesta de Valor y Buscador
              ========================================================= */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left flex flex-col justify-center">
            {/* Badge Oficial Municipal de Funes */}
            <div className="inline-flex items-center self-start gap-2 px-3 py-1 rounded-full bg-brand-800 text-brand-100 border border-brand-700/80 text-xs font-semibold shadow-xs">
              <Image
                src="/escudo-funes-blanco.png"
                alt="Escudo Oficial de la Municipalidad de Funes"
                width={16}
                height={16}
                className="w-4 h-4 object-contain shrink-0"
                priority
              />
              <span>Portal oficial de empleo · Municipalidad de Funes</span>
            </div>

            {/* H1 Principal con Resaltador Cálido */}
            <h1 className="text-2xl sm:text-3xl lg:text-[2.6rem] 2xl:text-[3.1rem] font-extrabold tracking-tight text-foreground leading-[1.16]">
              Encontrá tu próxima oportunidad laboral en{' '}
              <span className="inline-block relative px-2.5 py-0.5 rounded-xl bg-amber-100 text-brand-950 border border-amber-300/80 shadow-2xs font-extrabold">
                Funes
              </span>
            </h1>

            {/* Subtítulo Institucional */}
            <p className="text-sm sm:text-base 2xl:text-[17px] text-muted-foreground leading-relaxed max-w-2xl">
              El punto de encuentro oficial entre los vecinos y las empresas locales. Un servicio público, transparente, confidencial y gratuito con intermediación municipal.
            </p>

            {/* Tarjeta de Búsqueda Blanca con Sombra Suave */}
            <div className="bg-surface p-1.5 sm:p-2 rounded-2xl border border-border shadow-md max-w-2xl">
              <form action="/ofertas" method="GET" className="flex flex-col sm:flex-row items-center gap-2">
                <label htmlFor="hero-search-input" className="sr-only">
                  Buscar ofertas de empleo
                </label>
                <div className="relative flex-1 w-full flex items-center">
                  <div className="absolute left-3 pointer-events-none text-muted-foreground flex items-center justify-center">
                    <SearchIcon className="w-4.5 h-4.5 text-brand-800" aria-hidden="true" />
                  </div>
                  <input
                    id="hero-search-input"
                    name="q"
                    type="text"
                    placeholder="Puesto, rubro o palabra clave (ej. Mozo, Ventas, Chofer)..."
                    className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 border-0"
                  />
                </div>
                <Button
                  type="submit"
                  size="md"
                  variant="primary"
                  className="w-full sm:w-auto h-10 px-5 font-bold shadow-xs shrink-0 text-xs sm:text-sm"
                >
                  Buscar ofertas
                </Button>
              </form>
            </div>

            {/* Chips de Búsquedas Frecuentes */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-muted-foreground">
              <span className="font-medium mr-1 text-foreground flex items-center gap-1">
                <SparklesIcon className="w-3.5 h-3.5 text-brand-600" />
                Búsquedas frecuentes:
              </span>
              {quickSearchChips.map((chip) => (
                <Link
                  key={chip.query}
                  href={`/ofertas?q=${encodeURIComponent(chip.query)}`}
                  className="px-2.5 py-1 rounded-lg bg-surface hover:bg-brand-50 text-foreground hover:text-brand-900 border border-border hover:border-brand-300 transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 shadow-2xs font-medium inline-flex items-center text-xs"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            {/* Link Secundario de Registro */}
            <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>¿Buscás trabajo y aún no te registraste?</span>
              <Link
                href="/registro"
                className="font-semibold text-brand-800 hover:text-brand-900 underline underline-offset-4 flex items-center gap-1 group py-0.5"
              >
                <span>Cargá tu CV en la Oficina de Empleo</span>
                <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* =========================================================
              COLUMNA DERECHA: Panel Verde Oscuro con Últimas Ofertas
              ========================================================= */}
          <div className="lg:col-span-5 w-full max-w-lg mx-auto lg:max-w-none">
            <div className="bg-brand-900 text-white rounded-2xl p-5 sm:p-6 2xl:p-7 shadow-xl border border-brand-800 space-y-3.5">
              
              {/* Encabezado del Panel */}
              <div className="flex items-center justify-between pb-1 border-b border-brand-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-800 flex items-center justify-center text-brand-200">
                    <BriefcaseIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">Últimas ofertas</h2>
                    <p className="text-[11px] text-brand-200">Convocatorias abiertas en Funes</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-800 text-brand-200 border border-brand-700">
                  Nuevas
                </span>
              </div>

              {/* Lista de 3 Tarjetas (Reales o Fallback) */}
              <div className="space-y-2.5">
                {displayJobs ? (
                  displayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/ofertas/${job.id}`}
                      className="block p-2.5 sm:p-3 rounded-xl bg-surface text-foreground border border-border shadow-xs hover:border-brand-600 hover:shadow-sm hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-brand-800 transition-colors truncate">
                            {job.titulo}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              {job.empresa?.nombre_fantasia || job.company?.nombre_fantasia || 'Empresa de Funes'}
                            </span>
                            {job.tipo_jornada && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{job.tipo_jornada}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
                            <div className="flex items-center gap-1 text-brand-700 font-medium">
                              <MapPinIcon className="w-3 h-3 shrink-0" />
                              <span className="truncate">{job.ubicacion || 'Funes, Santa Fe'}</span>
                            </div>
                            <span className="text-zinc-500 font-medium bg-zinc-100/90 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                              {(() => {
                                const d = job.fecha_revision || job.created_at;
                                if (!d) return 'Reciente';
                                const isToday = new Date().toDateString() === new Date(d).toDateString();
                                return isToday ? 'Publicada hoy' : new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center shrink-0 group-hover:bg-brand-800 group-hover:text-white transition-colors">
                          <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  fallbackJobs.map((job) => (
                    <Link
                      key={job.id}
                      href="/ofertas"
                      className="block p-2.5 sm:p-3 rounded-xl bg-surface text-foreground border border-border shadow-xs hover:border-brand-600 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-brand-800 transition-colors truncate">
                            {job.puesto}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground/80">{job.empresa}</span>
                            <span aria-hidden="true">·</span>
                            <span>{job.modalidad}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-brand-700 font-medium">
                            <MapPinIcon className="w-3 h-3 shrink-0" />
                            <span>{job.zona}</span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center shrink-0 group-hover:bg-brand-800 group-hover:text-white transition-colors">
                          <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Pie del Panel */}
              <div className="pt-1 text-center border-t border-brand-800/80">
                <Link
                  href="/ofertas"
                  className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-brand-200 hover:text-white transition-colors py-0.5 group"
                >
                  <span>Ver todas las ofertas vigentes</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================
          FRANJA INFERIOR: Sellos Institucionales de Confianza
          ========================================================= */}
      <section className="bg-surface/90 border-t border-border/80 py-3 sm:py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 justify-center items-center">
            
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-background/80 border border-border/90 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 border border-brand-200">
                <BuildingIcon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">100% Local</h4>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">
                  Empresas y vecinos de Funes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-background/80 border border-border/90 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 border border-brand-200">
                <ShieldCheckIcon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">Gratuito y oficial</h4>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">
                  Sin costo para postulantes ni comercios
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-brand-50/70 border border-brand-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 border border-brand-200">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">Intermediación</h4>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">
                  Preselección y confidencialidad
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
