'use client';

import React from 'react';
import { AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { ClockIcon } from '@/components/ui/Icons';

interface PostulanteProfileAlertProps {
  percentage: number;
  isMandatoryIncomplete: boolean;
  hasCurriculum: boolean;
  missingRequiredFields: string[];
  optionalSuggestions?: string[];
  onActionClick: () => void;
}

export function PostulanteProfileAlert({
  percentage,
  isMandatoryIncomplete,
  hasCurriculum,
  missingRequiredFields,
  optionalSuggestions = [],
  onActionClick,
}: PostulanteProfileAlertProps) {
  // Si el perfil está 100% completo, no se muestra nada para mantener limpia la pantalla
  if (percentage >= 100 && !isMandatoryIncomplete) {
    return null;
  }

  // 1. Caso: Faltan datos obligatorios indispensables (Prioridad absoluta si falta CV)
  if (isMandatoryIncomplete) {
    const isMissingCv = !hasCurriculum;

    return (
      <aside
        role="alert"
        aria-label={isMissingCv ? 'Empezá subiendo tu CV para postularte' : 'Perfil laboral incompleto: faltan datos obligatorios'}
        className="w-full bg-amber-50/90 border-b border-amber-200/80 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-2 sm:py-2.5 transition-colors"
      >
        <div className="max-w-[1600px] 2xl:max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="p-1 rounded-md bg-amber-100/90 text-amber-800 shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
            <div className="text-xs text-amber-950 font-medium leading-relaxed truncate-2 sm:truncate">
              {isMissingCv ? (
                <>
                  <span className="font-bold text-amber-900">Empezá subiendo tu CV:</span>{' '}
                  <span>
                    Es el paso principal para que la Oficina de Empleo evalúe tu perfil y puedas postularte a las ofertas laborales de Funes.
                  </span>{' '}
                  <span className="text-amber-800/90 hidden lg:inline">
                    {missingRequiredFields.filter((f) => !f.toLowerCase().includes('currículum')).length > 0 &&
                      `(Luego completá: ${missingRequiredFields.filter((f) => !f.toLowerCase().includes('currículum')).join(', ')})`}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-amber-900">Perfil incompleto para intermediación:</span>{' '}
                  <span>
                    Completá tus datos de contacto indispensables ({missingRequiredFields.join(', ')}) para que la Oficina de Empleo pueda coordinar tus entrevistas.
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 self-end sm:self-auto">
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200/70 px-2 py-0.5 rounded-full whitespace-nowrap">
              {isMissingCv ? 'Paso 1: Subir CV' : `Acción requerida (${percentage}%)`}
            </span>
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 underline underline-offset-2 hover:decoration-amber-900 transition-colors cursor-pointer"
            >
              <span>{isMissingCv ? 'Subir mi CV ahora' : 'Completar datos ahora'}</span>
              <ArrowRight className="w-3 h-3 ml-0.5 text-amber-800" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 2. Caso: Obligatorios listos, pero perfil por debajo del 70% (Educación, experiencia, etc.)
  if (percentage < 70) {
    const sugerenciasTexto = optionalSuggestions.length > 0 ? optionalSuggestions.join(', ') : 'experiencia y educación';

    return (
      <aside
        role="status"
        aria-label="Invitación a completar perfil laboral"
        className="w-full bg-sky-50/90 border-b border-sky-200/80 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-2 sm:py-2.5 transition-colors"
      >
        <div className="max-w-[1600px] 2xl:max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="p-1 rounded-md bg-sky-100/90 text-sky-800 shrink-0">
              <ClockIcon className="w-3.5 h-3.5" />
            </span>
            <div className="text-xs text-sky-950 font-medium leading-relaxed truncate-2 sm:truncate">
              <span className="font-bold text-sky-900">Impulsá tus oportunidades:</span>{' '}
              <span>
                Sumá <span className="font-semibold text-sky-950">{sugerenciasTexto}</span> para que la Oficina de Empleo te proponga en más búsquedas activas de Funes.
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 self-end sm:self-auto">
            {/* Barra y badge de progreso */}
            <div className="flex items-center gap-2">
              <div className="w-16 sm:w-20 bg-sky-200/70 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-700 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-sky-800 bg-sky-100/80 border border-sky-200/70 px-2 py-0.5 rounded-full whitespace-nowrap">
                {percentage}% completado
              </span>
            </div>
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 hover:text-sky-950 underline underline-offset-2 hover:decoration-sky-900 transition-colors cursor-pointer"
            >
              <span>Completar perfil</span>
              <ArrowRight className="w-3 h-3 ml-0.5 text-sky-800" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 3. Caso: Perfil avanzado (70% al 99%)
  const sugerenciasFinas = optionalSuggestions.length > 0 ? optionalSuggestions.join(' o ') : 'habilidades o cursos';

  return (
    <aside
      role="status"
      aria-label="Perfil casi completo"
      className="w-full bg-emerald-50/80 border-b border-emerald-200/70 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-2 sm:py-2.5 transition-colors"
    >
      <div className="max-w-[1600px] 2xl:max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="p-1 rounded-md bg-emerald-100/90 text-emerald-800 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="text-xs text-emerald-950 font-medium leading-relaxed truncate-2 sm:truncate">
            <span className="font-bold text-emerald-900">¡Casi listo!</span>{' '}
            <span>
              Tu perfil está muy completo. Agregá {sugerenciasFinas} para alcanzar la máxima afinidad en las derivaciones de la Oficina de Empleo.
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3 self-end sm:self-auto">
          {/* Barra y badge de progreso */}
          <div className="flex items-center gap-2">
            <div className="w-16 sm:w-20 bg-emerald-200/70 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200/70 px-2 py-0.5 rounded-full whitespace-nowrap">
              {percentage}% completado
            </span>
          </div>
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 hover:text-emerald-950 underline underline-offset-2 hover:decoration-emerald-900 transition-colors cursor-pointer"
          >
            <span>Finalizar perfil</span>
            <ArrowRight className="w-3 h-3 ml-0.5 text-emerald-800" />
          </button>
        </div>
      </div>
    </aside>
  );
}
