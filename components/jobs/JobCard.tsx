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
    <article className="group bg-white rounded-2xl border border-zinc-200/90 hover:border-emerald-500/80 hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Encabezado y Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {job.rubro && (
              <Badge variant="blue" size="sm">
                {job.rubro.nombre}
              </Badge>
            )}
            <Badge variant="zinc" size="sm">
              {job.tipo_jornada}
            </Badge>
            {job.destacada && (
              <Badge variant="emerald" size="sm" className="gap-1 font-semibold">
                <SparklesIcon className="w-3 h-3 text-emerald-600" />
                Destacada
              </Badge>
            )}
          </div>
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-600" />
            {formattedDate}
          </span>
        </div>

        {/* Título y Empresa */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
            <Link href={`/ofertas/${job.id}`} className="focus:outline-none">
              {job.titulo}
            </Link>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1 flex items-center gap-1.5 font-medium">
            <BuildingIcon className="w-4 h-4 text-zinc-600 shrink-0" />
            <span>{job.company?.nombre_fantasia || 'Empresa local de Funes'}</span>
            <span className="text-zinc-600 font-normal">| Oficina de Empleo</span>
          </p>
        </div>

        {/* Datos clave: Ubicación, Jornada, Vacantes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 pt-1 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{job.ubicacion}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-zinc-600 shrink-0" />
            <span>{job.tipo_jornada}</span>
          </div>
          {job.experiencia_requerida && (
            <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2 text-zinc-600">
              <span className="font-semibold text-zinc-700">Experiencia:</span>
              <span className="truncate">{job.experiencia_requerida}</span>
            </div>
          )}
        </div>

        {/* Breve descripción */}
        <p className="text-sm text-zinc-600 line-clamp-2 leading-relaxed">
          {job.descripcion}
        </p>
      </div>

      {/* Pie de tarjeta con acción */}
      <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
          <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
          <span>
            {job.vacantes} {job.vacantes === 1 ? 'vacante disponible' : 'vacantes disponibles'}
          </span>
        </div>

        <Button
          href={`/ofertas/${job.id}`}
          size="sm"
          variant="primary"
          className="shrink-0"
        >
          Ver Detalle & Postularme
        </Button>
      </div>
    </article>
  );
};
