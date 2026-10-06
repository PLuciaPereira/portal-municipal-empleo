'use client';

import React from 'react';
import { Rubro } from '@/types/database';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  SearchIcon,
  FilterIcon,
  XMarkIcon,
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

export interface FilterState {
  query: string;
  rubro: string;
  jornada: string;
  zona: string;
  destacadasOnly: boolean;
}

interface JobFiltersProps {
  filters: FilterState;
  rubros: Rubro[];
  totalResults: number;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  rubros,
  totalResults,
  onFilterChange,
  onReset,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const jornadas = [
    { label: 'Todas las jornadas', value: 'todas' },
    { label: 'Jornada Completa', value: 'Completa' },
    { label: 'Media Jornada', value: 'Media' },
    { label: 'Turnos Rotativos', value: 'Turnos' },
  ];

  const zonasFunes = [
    { label: 'Todas las zonas', value: 'todas' },
    { label: 'Funes Centro', value: 'Centro' },
    { label: 'Ruta 9 / Garitas', value: 'Ruta 9' },
    { label: 'Parque Industrial / Autopista', value: 'Parque Industrial' },
    { label: 'Barrios Cerrados / Quintas', value: 'Barrios' },
  ];

  const hasActiveFilters =
    filters.query !== '' ||
    filters.rubro !== 'todos' ||
    filters.jornada !== 'todas' ||
    filters.zona !== 'todas' ||
    filters.destacadasOnly;

  const content = (
    <div className="space-y-6">
      {/* Buscador de texto */}
      <div className="space-y-1.5">
        <label htmlFor="search-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
          Palabra clave o puesto
        </label>
        <Input
          id="search-input"
          placeholder="Ej: Cocinero, Ventas, Electricista..."
          value={filters.query}
          onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          leftIcon={<SearchIcon className="w-4 h-4 text-zinc-400" />}
        />
      </div>

      {/* Rubro */}
      <div className="space-y-2">
        <label htmlFor="rubro-select" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <BriefcaseIcon className="w-4 h-4 text-emerald-700" />
          Rubro / Sector
        </label>
        <select
          id="rubro-select"
          value={filters.rubro}
          onChange={(e) => onFilterChange({ ...filters, rubro: e.target.value })}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-colors"
        >
          <option value="todos">Todos los rubros</option>
          {rubros.map((r) => (
            <option key={r.id} value={r.nombre}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo de Jornada */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <ClockIcon className="w-4 h-4 text-emerald-700" />
          Jornada Laboral
        </label>
        <div className="space-y-1.5">
          {jornadas.map((j) => (
            <label
              key={j.value}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                filters.jornada === j.value
                  ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <input
                type="radio"
                name="jornada"
                value={j.value}
                checked={filters.jornada === j.value}
                onChange={() => onFilterChange({ ...filters, jornada: j.value })}
                className="text-emerald-700 focus:ring-emerald-600"
              />
              <span>{j.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Zona o Localidad en Funes */}
      <div className="space-y-2">
        <label htmlFor="zona-select" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <MapPinIcon className="w-4 h-4 text-emerald-700" />
          Zona en Funes
        </label>
        <select
          id="zona-select"
          value={filters.zona}
          onChange={(e) => onFilterChange({ ...filters, zona: e.target.value })}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 px-3 text-sm text-zinc-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-colors"
        >
          {zonasFunes.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </div>

      {/* Checkbox solo destacadas */}
      <div className="pt-2 border-t border-zinc-100">
        <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            checked={filters.destacadasOnly}
            onChange={(e) =>
              onFilterChange({ ...filters, destacadasOnly: e.target.checked })
            }
            className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-zinc-300"
          />
          <span>Mostrar solo búsquedas destacadas</span>
        </label>
      </div>

      {/* Botón Restablecer */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-zinc-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full text-zinc-600 hover:text-rose-700 hover:bg-rose-50"
          >
            Limpiar todos los filtros
          </Button>
        </div>
      )}

      {/* Nota institucional */}
      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-900 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-700" />
          <span>Intermediación Municipal</span>
        </div>
        <p className="text-emerald-800/90 leading-relaxed">
          Las ofertas son verificadas por la Oficina de Empleo. Tu postulación es privada y confidencial.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Botón flotante/visible en dispositivos móviles */}
      <div className="lg:hidden flex items-center justify-between mb-4 bg-white p-3.5 rounded-xl border border-zinc-200 shadow-xs">
        <div className="text-sm font-medium text-zinc-700">
          <span className="font-bold text-zinc-900">{totalResults}</span> ofertas encontradas
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-2 text-zinc-700"
        >
          <FilterIcon className="w-4 h-4 text-emerald-700" />
          Filtros {hasActiveFilters && '(Activos)'}
        </Button>
      </div>

      {/* Modal / Sheet lateral para Mobile */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-y-auto bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <FilterIcon className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-zinc-900 text-base">Filtros de Búsqueda</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900"
                  aria-label="Cerrar filtros"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {content}
            </div>

            <div className="pt-6 border-t border-zinc-200 mt-6">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={() => setIsMobileOpen(false)}
              >
                Ver {totalResults} ofertas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar para pantallas grandes (Desktop) */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-5 h-5 text-emerald-700" />
              <h2 className="font-bold text-zinc-900 text-sm">Filtros de Búsqueda</h2>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Limpiar
              </button>
            )}
          </div>

          {content}
        </div>
      </aside>
    </>
  );
};
