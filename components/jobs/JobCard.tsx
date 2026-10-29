import React from 'react';
import Link from 'next/link';
import { Job } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MapPinIcon,
  ClockIcon,
  BuildingIcon,
  CalendarIcon,
  SparklesIcon,
  UserIcon,
} from '@/components/ui/Icons';

interface JobCardProps {
  job: Job;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  // Formateo de fecha de publicación
  const formattedDate = new Date(job.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <article className="group bg-surface rounded-2xl border border-zinc-200/90 hover:border-brand-700/60 hover:shadow-xs transition-all duration-150 p-5 sm:p-6 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Encabezado y Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.rubros && job.rubros.length > 0 ? (
              job.rubros.map((r) => (
                <Badge key={r.id} variant="brand" size="sm">
                  {r.nombre}
                </Badge>
              ))
            ) : job.rubro ? (
              <Badge variant="brand" size="sm">
                {job.rubro.nombre}
              </Badge>
            ) : null}
            <Badge variant="zinc" size="sm">
              {job.tipo_jornada}
            </Badge>
            {job.destacada && (
              <Badge variant="brand" size="sm" className="gap-1 font-bold">
                <SparklesIcon className="w-3 h-3 text-brand-700" />
                Destacada
              </Badge>
            )}
          </div>
          <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
            {formattedDate}
          </span>
        </div>

        {/* Título y Empresa */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 group-hover:text-brand-800 transition-colors tracking-tight font-sans">
              <Link href={`/ofertas/${job.id}`} className="focus:outline-none">
                {job.titulo}
              </Link>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1 flex items-center gap-1.5 font-medium">
              <BuildingIcon className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="font-bold text-zinc-800">{job.company?.nombre_fantasia || 'Empresa local de Funes'}</span>
              <span className="text-brand-900 font-semibold">• Prioridad residentes de Funes</span>
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-brand-900 bg-brand-50 border border-brand-200 px-3 py-1 rounded-lg shrink-0">
            <UserIcon className="w-3.5 h-3.5 text-brand-800" />
            <span>
              {job.vacantes} {job.vacantes === 1 ? 'vacante' : 'vacantes'}
            </span>
          </div>
        </div>

        {/* Datos clave: Ubicación, Jornada, Vacantes */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 font-medium text-zinc-700">
            <MapPinIcon className="w-4 h-4 text-brand-800 shrink-0" />
            <span>{job.ubicacion}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600">
            <ClockIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>{job.tipo_jornada}</span>
          </div>
          {job.experiencia_requerida && (
            <div className="flex items-center gap-1.5 text-zinc-600">
              <span className="font-semibold text-zinc-700">Exp:</span>
              <span className="truncate">{job.experiencia_requerida}</span>
            </div>
          )}
        </div>

        {/* Breve descripción */}
        <p className="text-xs sm:text-sm text-zinc-600 line-clamp-2 leading-relaxed font-sans">
          {job.descripcion}
        </p>
      </div>

      {/* Pie de tarjeta con acción */}
      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-4">
        <span className="text-[11px] text-zinc-500 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Intermediación municipal gratuita
        </span>

        <Button
          href={`/ofertas/${job.id}`}
          size="sm"
          variant="primary"
          className="shrink-0 font-bold text-xs"
        >
          Ver y Postularme →
        </Button>
      </div>
    </article>
  );
};
