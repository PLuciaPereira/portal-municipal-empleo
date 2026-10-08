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
        <label htmlFor="search-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Palabra clave o puesto
        </label>
        <Input
          id="search-input"
          placeholder="Ej: Cocinero, Ventas, Electricista..."
          value={filters.query}
          onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          leftIcon={<SearchIcon className="w-4 h-4 text-brand-800" />}
        />
      </div>

      {/* Rubro */}
      <div className="space-y-2">
        <label htmlFor="rubro-select" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <BriefcaseIcon className="w-4 h-4 text-brand-800" />
          Rubro / Sector
        </label>
        <select
          id="rubro-select"
          value={filters.rubro}
          onChange={(e) => onFilterChange({ ...filters, rubro: e.target.value })}
          className="w-full rounded-xl border border-border bg-surface py-2 px-3 text-sm text-foreground focus:outline-none focus:border-brand-800 focus:ring-3 focus:ring-brand-800/15 transition-all"
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
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ClockIcon className="w-4 h-4 text-brand-800" />
          Jornada Laboral
        </label>
        <div className="space-y-1.5">
          {jornadas.map((j) => (
            <label
              key={j.value}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors ${
                filters.jornada === j.value
                  ? 'bg-brand-100 text-brand-900 font-semibold border border-brand-300'
                  : 'text-foreground hover:bg-brand-50/60'
              }`}
            >
              <input
                type="radio"
                name="jornada"
                value={j.value}
                checked={filters.jornada === j.value}
                onChange={() => onFilterChange({ ...filters, jornada: j.value })}
                className="text-brand-800 focus:ring-brand-800 accent-brand-800"
              />
              <span>{j.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Zona o Localidad en Funes */}
      <div className="space-y-2">
        <label htmlFor="zona-select" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MapPinIcon className="w-4 h-4 text-brand-800" />
          Zona en Funes
        </label>
        <select
          id="zona-select"
          value={filters.zona}
          onChange={(e) => onFilterChange({ ...filters, zona: e.target.value })}
          className="w-full rounded-xl border border-border bg-surface py-2 px-3 text-sm text-foreground focus:outline-none focus:border-brand-800 focus:ring-3 focus:ring-brand-800/15 transition-all"
        >
          {zonasFunes.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </div>

      {/* Checkbox solo destacadas */}
      <div className="pt-2 border-t border-border/60">
        <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={filters.destacadasOnly}
            onChange={(e) =>
              onFilterChange({ ...filters, destacadasOnly: e.target.checked })
            }
            className="w-4 h-4 rounded text-brand-800 focus:ring-brand-800 border-border accent-brand-800"
          />
          <span>Mostrar solo búsquedas destacadas</span>
        </label>
      </div>

      {/* Botón Restablecer */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full text-muted-foreground hover:text-destructive hover:bg-rose-50"
          >
            Limpiar todos los filtros
          </Button>
        </div>
      )}

      {/* Nota institucional */}
      <div className="p-3.5 rounded-xl bg-brand-100/80 border border-brand-300/70 text-xs text-brand-900 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold">
          <ShieldCheckIcon className="w-4 h-4 text-brand-800" />
          <span>Intermediación Municipal</span>
        </div>
        <p className="text-brand-900/90 leading-relaxed">
          Las ofertas son verificadas por la Oficina de Empleo. Tu postulación es privada y confidencial.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Botón flotante/visible en dispositivos móviles */}
      <div className="lg:hidden flex items-center justify-between mb-4 bg-surface p-3.5 rounded-xl border border-border shadow-xs">
        <div className="text-sm font-medium text-muted-foreground">
          <span className="font-bold text-foreground">{totalResults}</span> ofertas encontradas
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-2 text-foreground"
        >
          <FilterIcon className="w-4 h-4 text-brand-800" />
          Filtros {hasActiveFilters && '(Activos)'}
        </Button>
      </div>

      {/* Modal / Sheet lateral para Mobile */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-y-auto bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-surface h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FilterIcon className="w-5 h-5 text-brand-800" />
                  <h3 className="font-bold text-foreground text-base">Filtros de Búsqueda</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Cerrar filtros"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {content}
            </div>

            <div className="pt-6 border-t border-border mt-6">
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
        <div className="sticky top-24 bg-surface rounded-2xl border border-border p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-5 h-5 text-brand-800" />
              <h2 className="font-bold text-foreground text-sm">Filtros de Búsqueda</h2>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-brand-800 hover:underline font-semibold"
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
