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
    <article className="group bg-surface rounded-2xl border border-border hover:border-brand-600/70 hover:shadow-card transition-all duration-200 p-6 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Encabezado y Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {job.rubro && (
              <Badge variant="brand" size="sm">
                {job.rubro.nombre}
              </Badge>
            )}
            <Badge variant="zinc" size="sm">
              {job.tipo_jornada}
            </Badge>
            {job.destacada && (
              <Badge variant="brand" size="sm" className="gap-1 font-semibold">
                <SparklesIcon className="w-3 h-3 text-brand-700" />
                Destacada
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
            {formattedDate}
          </span>
        </div>

        {/* Título y Empresa */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-brand-800 transition-colors">
            <Link href={`/ofertas/${job.id}`} className="focus:outline-none">
              {job.titulo}
            </Link>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
            <BuildingIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{job.company?.nombre_fantasia || 'Empresa local de Funes'}</span>
            <span className="text-muted-foreground/75 font-normal">| Oficina de Empleo</span>
          </p>
        </div>

        {/* Datos clave: Ubicación, Jornada, Vacantes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="w-4 h-4 text-brand-700 shrink-0" />
            <span className="truncate">{job.ubicacion}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{job.tipo_jornada}</span>
          </div>
          {job.experiencia_requerida && (
            <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Experiencia:</span>
              <span className="truncate">{job.experiencia_requerida}</span>
            </div>
          )}
        </div>

        {/* Breve descripción */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {job.descripcion}
        </p>
      </div>

      {/* Pie de tarjeta con acción */}
      <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-800 bg-brand-100 px-2.5 py-1 rounded-md">
          <UserIcon className="w-3.5 h-3.5 text-brand-700" />
          <span>
            {job.vacantes} {job.vacantes === 1 ? 'vacante disponible' : 'vacantes disponibles'}
          </span>
        </div>

        <Button
          href={`/ofertas/${job.id}`}
          size="sm"
          variant="primary"
          className="shrink-0 font-semibold"
        >
          Ver Detalle & Postularme
        </Button>
      </div>
    </article>
  );
};
