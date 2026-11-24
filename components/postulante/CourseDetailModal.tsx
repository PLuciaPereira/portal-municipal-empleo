'use client';

import React from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { PostulanteCurso, EstadoPostulanteCurso } from '@/types/database';
import { Badge, BadgeProps } from '@/components/ui/Badge';
import {
  GraduationCap,
  X,
  Building,
  Clock,
  Calendar,
  FileText,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

interface CourseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asignacion: PostulanteCurso | null;
}

const CURSO_STATUS_BADGE: Record<
  EstadoPostulanteCurso,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  asignado: { label: 'Asignado', variant: 'blue' },
  en_curso: { label: 'En curso', variant: 'amber' },
  completado: { label: 'Completado', variant: 'emerald' },
  abandonado: { label: 'Abandonado', variant: 'zinc' },
  cancelado: { label: 'Cancelado', variant: 'rose' },
};

export function CourseDetailModal({
  isOpen,
  onClose,
  asignacion,
}: CourseDetailModalProps) {
  useBodyScrollLock(Boolean(isOpen));

  if (!isOpen || !asignacion) return null;

  const curso = asignacion.curso;
  const badgeConfig =
    CURSO_STATUS_BADGE[asignacion.estado] || {
      label: asignacion.estado,
      variant: 'zinc' as const,
    };

  const formattedDate = new Date(asignacion.fecha_asignacion).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-brand-800" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-zinc-900 truncate">
                {curso?.titulo || 'Capacitación Municipal'}
              </h2>
              <p className="text-xs text-zinc-500">
                Programa de formación y desarrollo laboral
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-5 text-zinc-800 text-sm">
          {/* Estado actual y fecha */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-50 border border-zinc-200/70 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600">Estado de la asignación:</span>
              <Badge variant={badgeConfig.variant} size="sm">
                {badgeConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Asignado el {formattedDate}</span>
            </div>
          </div>

          {/* Sede y Duración */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-zinc-200/70 bg-white">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 mb-1">
                <Building className="w-4 h-4 text-brand-700" />
                <span>Institución / Sede</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900">
                {curso?.institucion || 'Sede municipal a confirmar por la Oficina de Empleo'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200/70 bg-white">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 mb-1">
                <Clock className="w-4 h-4 text-brand-700" />
                <span>Duración / Carga horaria</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900">
                {curso?.duracion || 'A coordinar durante el cursado'}
              </p>
            </div>
          </div>

          {/* Descripción del programa */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
              <FileText className="w-4 h-4 text-brand-700" />
              <span>Descripción y contenidos</span>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 text-xs sm:text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
              {curso?.descripcion || 'No se registraron detalles adicionales para este curso.'}
            </div>
          </div>

          {/* Notas de la Oficina de Empleo */}
          {asignacion.observaciones && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                <HelpCircle className="w-4 h-4 text-brand-700" />
                <span>Historial y observaciones</span>
              </div>
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 whitespace-pre-line leading-relaxed">
                {asignacion.observaciones}
              </div>
            </div>
          )}

          {/* Bloque de intermediación: Contacto con la Oficina de Empleo */}
          <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/50 space-y-2">
            <div className="flex items-center gap-2 text-brand-900 font-bold text-xs">
              <Building className="w-4 h-4 text-brand-800" />
              <span>Oficina de Empleo - Municipalidad de Funes</span>
            </div>
            <p className="text-xs text-brand-950/80 leading-relaxed">
              Para consultas sobre horarios, exámenes, certificados de asistencia o nuevas capacitaciones, podés comunicarte directamente con la oficina:
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-900 pt-1 font-medium">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-700" /> Santa Fe 1689, Funes
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-brand-700" /> (0341) 493-6000
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-brand-700" /> empleo@funes.gob.ar
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 flex justify-end bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}