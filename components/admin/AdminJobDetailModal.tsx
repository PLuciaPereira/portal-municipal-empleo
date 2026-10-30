'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React from 'react';
import { OfertaAdminItem } from '@/lib/admin';
import { JobStatusBadge } from '@/components/empresa/JobStatusBadge';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  FileText,
  BadgeAlert,
  Info,
} from 'lucide-react';

interface AdminJobDetailModalProps {
  oferta: OfertaAdminItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (oferta: OfertaAdminItem) => void;
  onReject: (oferta: OfertaAdminItem) => void;
  onDeactivate: (oferta: OfertaAdminItem) => void;
  onToggleHighlight?: (oferta: OfertaAdminItem) => void;
}

export function AdminJobDetailModal({
  oferta,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onDeactivate,
  onToggleHighlight,
}: AdminJobDetailModalProps) {
    useBodyScrollLock(Boolean(isOpen));
if (!isOpen || !oferta) return null;

  const isBaja = Boolean(oferta.deleted_at);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-oferta-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-oferta-title" className="text-base font-bold text-zinc-900 leading-tight">
                  {oferta.titulo}
                </h2>
                {oferta.destacada && !isBaja && (
                  <Badge variant="amber" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Destacada
                  </Badge>
                )}
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                Publicado por:{' '}
                <strong className="text-zinc-800">
                  {oferta.empresa?.nombre_fantasia || oferta.empresa?.razon_social || 'Empresa'}
                </strong>{' '}
                · Creada el {new Date(oferta.created_at).toLocaleDateString('es-AR')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto">


          {/* Estado de Moderación y Auditoría */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                Estado Operativo
              </span>
              <div className="mt-1 flex items-center gap-2">
                <JobStatusBadge estado={oferta.estado} isDeleted={isBaja} />
                <span className="text-xs text-zinc-500">
                  {oferta.postulaciones_count || 0} postulaciones registradas
                </span>
              </div>
            </div>

            {oferta.fecha_revision && (
              <div className="text-right text-xs text-zinc-500">
                <span>Última revisión:</span>
                <p className="font-semibold text-zinc-800">
                  {new Date(oferta.fecha_revision).toLocaleString('es-AR')}
                </p>
              </div>
            )}
          </div>

          {/* Motivo de rechazo si aplica */}
          {oferta.estado === 'rechazada' && oferta.motivo_rechazo && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                Motivo de Rechazo Registrado por la Oficina de Empleo:
              </div>
              <p className="text-rose-800 pl-5 whitespace-pre-wrap">{oferta.motivo_rechazo}</p>
            </div>
          )}

          {/* Motivo de baja si aplica */}
          {isBaja && oferta.motivo_baja && (
            <div className="p-4 rounded-xl border border-zinc-300 bg-zinc-100 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                <BadgeAlert className="w-4 h-4 text-zinc-700 shrink-0" />
                Motivo de Baja de la Oferta:
              </div>
              <p className="text-zinc-700 pl-5 whitespace-pre-wrap">{oferta.motivo_baja}</p>
              <p className="text-[11px] text-zinc-500 pl-5 pt-1">
                Dada de baja el {new Date(oferta.deleted_at!).toLocaleString('es-AR')} (Historial conservado)
              </p>
            </div>
          )}

          {/* Tarjetas de Condiciones del Puesto */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Rubro
              </span>
              <p className="font-bold text-zinc-900 truncate">{oferta.rubro?.nombre || 'General'}</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Jornada
              </span>
              <p className="font-bold text-zinc-900">{oferta.tipo_jornada}</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Vacantes
              </span>
              <p className="font-bold text-zinc-900">{oferta.vacantes} puesto(s)</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Ubicación
              </span>
              <p className="font-bold text-zinc-900 truncate">{oferta.ubicacion || 'Funes'}</p>
            </div>
          </div>

          {/* Información complementaria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Contrato
              </span>
              <p className="font-semibold text-zinc-800">{oferta.tipo_contrato || 'No especificado'}</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Remuneración
              </span>
              <p className="font-semibold text-zinc-800">{oferta.rango_salarial || 'A convenir'}</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Fecha Límite
              </span>
              <p className="font-semibold text-zinc-800">
                {oferta.fecha_limite
                  ? new Date(oferta.fecha_limite).toLocaleDateString('es-AR')
                  : 'Sin fecha de cierre'}
              </p>
            </div>
          </div>

          {/* Descripción del Puesto */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-800" />
              Descripción de las Tareas y Puesto
            </h3>
            <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {oferta.descripcion}
            </p>
          </div>

          {/* Requisitos y Experiencia */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-800" />
              Requisitos y Competencias Exigidas
            </h3>
            <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {oferta.requisitos}
            </p>
            {oferta.experiencia_requerida && (
              <div className="pt-2 border-t border-zinc-100 text-xs">
                <span className="font-semibold text-zinc-900">Experiencia mínima:</span>{' '}
                <span className="text-zinc-600">{oferta.experiencia_requerida}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar Ficha
          </Button>

          <div className="flex items-center gap-2">
            {/* Alternar Destaque */}
            {oferta.estado === 'publicada' && !isBaja && onToggleHighlight && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleHighlight(oferta)}
                className="gap-1.5 text-xs text-amber-800 hover:bg-amber-50"
              >
                <Star
                  className={`w-4 h-4 ${
                    oferta.destacada ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'
                  }`}
                />
                {oferta.destacada ? 'Quitar Destaque' : 'Destacar Oferta'}
              </Button>
            )}

            {/* Dar de baja si está publicada y no dada de baja */}
            {oferta.estado === 'publicada' && !isBaja && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeactivate(oferta)}
                className="gap-1.5"
              >
                <BadgeAlert className="w-4 h-4" />
                Dar de Baja
              </Button>
            )}

            {/* Rechazar si no está rechazada ni dada de baja */}
            {oferta.estado !== 'rechazada' && !isBaja && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReject(oferta)}
                className="gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Rechazar Oferta
              </Button>
            )}

            {/* Aprobar si no está publicada ni dada de baja */}
            {oferta.estado !== 'publicada' && !isBaja && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove(oferta)}
                className="gap-1.5 bg-brand-800 hover:bg-brand-900"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aprobar y Publicar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
