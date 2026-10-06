'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Job, Rubro } from '@/types/database';
import { JobCard } from './JobCard';
import { JobFilters, FilterState } from './JobFilters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  SearchIcon,
  UserIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

interface JobCatalogViewProps {
  initialJobs: Job[];
  rubros: Rubro[];
}

export const JobCatalogView: React.FC<JobCatalogViewProps> = ({
  initialJobs,
  rubros,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Leer estado inicial desde query params
  const paramRubro = searchParams.get('rubro') || 'todos';
  const paramQuery = searchParams.get('q') || '';
  const paramJornada = searchParams.get('jornada') || 'todas';
  const paramZona = searchParams.get('zona') || 'todas';

  const [filters, setFilters] = useState<FilterState>({
    query: paramQuery,
    rubro: paramRubro,
    jornada: paramJornada,
    zona: paramZona,
    destacadasOnly: false,
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sincronizar URL cuando cambian los filtros principales
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.rubro && filters.rubro !== 'todos') params.set('rubro', filters.rubro);
    if (filters.jornada && filters.jornada !== 'todas') params.set('jornada', filters.jornada);
    if (filters.zona && filters.zona !== 'todas') params.set('zona', filters.zona);

    const queryStr = params.toString();
    const newUrl = queryStr ? `/ofertas?${queryStr}` : '/ofertas';
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  // Filtrado reactivo en cliente para máxima velocidad
  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      // 1. Filtro por texto
      if (filters.query.trim()) {
        const q = filters.query.toLowerCase().trim();
        const matchesTitle = job.titulo.toLowerCase().includes(q);
        const matchesDesc = job.descripcion.toLowerCase().includes(q);
        const matchesReq = job.requisitos.toLowerCase().includes(q);
        const matchesComp = job.company?.nombre_fantasia.toLowerCase().includes(q);
        const matchesRub = job.rubro?.nombre.toLowerCase().includes(q);

        if (!matchesTitle && !matchesDesc && !matchesReq && !matchesComp && !matchesRub) {
          return false;
        }
      }

      // 2. Filtro por rubro
      if (filters.rubro !== 'todos') {
        const target = filters.rubro.toLowerCase();
        const currentRubro = job.rubro?.nombre.toLowerCase() || '';
        if (!currentRubro.includes(target) && target !== job.rubro?.id.toString()) {
          return false;
        }
      }

      // 3. Filtro por jornada
      if (filters.jornada !== 'todas') {
        if (!job.tipo_jornada.toLowerCase().includes(filters.jornada.toLowerCase())) {
          return false;
        }
      }

      // 4. Filtro por zona
      if (filters.zona !== 'todas') {
        if (!job.ubicacion.toLowerCase().includes(filters.zona.toLowerCase())) {
          return false;
        }
      }

      // 5. Filtro destacadas
      if (filters.destacadasOnly && !job.destacada) {
        return false;
      }

      return true;
    });
  }, [initialJobs, filters]);

  const handleReset = () => {
    setFilters({
      query: '',
      rubro: 'todos',
      jornada: 'todas',
      zona: 'todas',
      destacadasOnly: false,
    });
  };

  const hasActiveFilters =
    filters.query !== '' ||
    filters.rubro !== 'todos' ||
    filters.jornada !== 'todas' ||
    filters.zona !== 'todas' ||
    filters.destacadasOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Banner de Cabecera */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-10 text-white relative overflow-hidden shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/70 border border-emerald-500/40 text-emerald-100 text-xs font-medium">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-300" />
            Bolsa de Empleo Municipal &bull; Funes, Santa Fe
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ofertas Laborales Vigentes
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Consultá las búsquedas activas de comercios y empresas de Funes. Postulate de manera gratuita; la Oficina de Empleo acompaña y preselecciona cada postulación con absoluta confidencialidad.
          </p>
        </div>
      </div>

      {/* Etiquetas de filtros activos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
          <span className="text-xs font-semibold text-zinc-500 mr-1">Filtros aplicados:</span>

          {filters.query && (
            <Badge variant="emerald" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              <span>Búsqueda: &ldquo;{filters.query}&rdquo;</span>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, query: '' })}
                className="hover:text-emerald-950 p-0.5"
                aria-label="Quitar filtro de búsqueda"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </Badge>
          )}

          {filters.rubro !== 'todos' && (
            <Badge variant="blue" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              <span>Rubro: {filters.rubro}</span>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, rubro: 'todos' })}
                className="hover:text-sky-950 p-0.5"
                aria-label="Quitar filtro de rubro"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </Badge>
          )}

          {filters.jornada !== 'todas' && (
            <Badge variant="amber" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              <span>Jornada: {filters.jornada}</span>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, jornada: 'todas' })}
                className="hover:text-amber-950 p-0.5"
                aria-label="Quitar filtro de jornada"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </Badge>
          )}

          {filters.zona !== 'todas' && (
            <Badge variant="purple" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              <span>Zona: {filters.zona}</span>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, zona: 'todas' })}
                className="hover:text-purple-950 p-0.5"
                aria-label="Quitar filtro de zona"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </Badge>
          )}

          {filters.destacadasOnly && (
            <Badge variant="emerald" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              <span>Solo destacadas</span>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, destacadasOnly: false })}
                className="hover:text-emerald-950 p-0.5"
                aria-label="Quitar filtro de solo destacadas"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </Badge>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium ml-2 hover:underline"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* Contenedor Principal: Sidebar Filtros + Grilla de Ofertas */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <JobFilters
          filters={filters}
          rubros={rubros}
          totalResults={filteredJobs.length}
          onFilterChange={setFilters}
          onReset={handleReset}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Listado de Ofertas */}
        <section className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-500 pb-2 border-b border-zinc-200">
            <span>
              Mostrando <strong className="text-zinc-900 font-bold">{filteredJobs.length}</strong> {filteredJobs.length === 1 ? 'oferta' : 'ofertas laborales'}
            </span>
            <span className="text-emerald-700 font-medium hidden sm:inline">
              Funes y área metropolitana
            </span>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            /* Estado sin resultados */
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
                <SearchIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-lg font-bold text-zinc-900">
                  No se encontraron ofertas coincidentes
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Probá modificando o limpiando los filtros para ver todas las oportunidades disponibles en Funes.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="secondary" size="md" onClick={handleReset}>
                  Restablecer todos los filtros
                </Button>
              </div>
            </div>
          )}

          {/* Banner de invitación a registrar CV general */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <UserIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-zinc-900 text-base">
                  ¿No encontraste un puesto afín a tu perfil?
                </h4>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Cargá tus datos y tu CV en la base general de la Oficina de Empleo. Cuando una empresa busque un perfil similar al tuyo, podremos convocarte directamente.
                </p>
              </div>
            </div>
            <Button
              href="/postulantes"
              variant="outline"
              size="md"
              className="shrink-0 w-full sm:w-auto"
            >
              Registrar mi Perfil
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
