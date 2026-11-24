'use client';

import React from 'react';
import { ClockIcon, XCircleIcon } from '@/components/ui/Icons';
import { ArrowRight, Edit3 } from 'lucide-react';

interface CompanyVerificationAlertProps {
  estado: string | null | undefined;
  motivoRechazo?: string | null;
  onReenviarClick?: () => void;
}

export function CompanyVerificationAlert({
  estado,
  motivoRechazo,
  onReenviarClick,
}: CompanyVerificationAlertProps) {
  if (!estado || estado === 'aprobada') {
    return null;
  }

  const isRechazada = estado === 'rechazada';
  const isPendiente = estado === 'pendiente';

  if (!isRechazada && !isPendiente) {
    return null;
  }

  if (isRechazada) {
    const hasMotivo = Boolean(motivoRechazo && motivoRechazo.trim());

    return (
      <aside
        role="alert"
        aria-label="Estado de revisión municipal: solicitud rechazada"
        className="w-full bg-rose-50/90 border-b border-rose-200/80 px-4 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5 transition-colors"
      >
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="p-1 rounded-md bg-rose-100/90 text-rose-700 shrink-0">
              <XCircleIcon className="w-3.5 h-3.5" />
            </span>
            <div className="text-xs text-rose-950 font-medium leading-relaxed truncate-2 sm:truncate">
              <span className="font-bold text-rose-900">Solicitud no aprobada:</span>{' '}
              {hasMotivo ? (
                <span>
                  Motivo informado: <span className="font-semibold text-rose-900 underline decoration-rose-300 underline-offset-2">"{motivoRechazo?.trim()}"</span>.
                </span>
              ) : (
                <span>La Oficina de Empleo no aprobó la habilitación de la empresa.</span>
              )}{' '}
              <span className="text-rose-800/90 hidden sm:inline">
                Podés corregir los datos comerciales para solicitar una nueva evaluación.
              </span>
            </div>
          </div>

          {onReenviarClick && (
            <div className="shrink-0 flex items-center">
              <button
                type="button"
                onClick={onReenviarClick}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 hover:text-rose-950 underline underline-offset-2 hover:decoration-rose-900 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-rose-700" />
                <span>Corregir datos y reenviar</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Estado: Pendiente de revisión
  return (
    <aside
      role="status"
      aria-label="Estado de revisión municipal: solicitud en evaluación"
      className="w-full bg-amber-50/90 border-b border-amber-200/80 px-4 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5 transition-colors"
    >
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="p-1 rounded-md bg-amber-100/90 text-amber-800 shrink-0">
            <ClockIcon className="w-3.5 h-3.5" />
          </span>
          <div className="text-xs text-amber-950 font-medium leading-relaxed">
            <span className="font-bold text-amber-900">Solicitud en evaluación:</span>{' '}
            <span>
              La Oficina de Empleo está revisando los datos de tu empresa.
            </span>{' '}
            <span className="text-amber-800/90 hidden md:inline">
              La publicación de ofertas laborales quedará habilitada una vez aprobada la cuenta.
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200/70 px-2 py-0.5 rounded-full">
            Trámite en curso
          </span>
        </div>
      </div>
    </aside>
  );
}
