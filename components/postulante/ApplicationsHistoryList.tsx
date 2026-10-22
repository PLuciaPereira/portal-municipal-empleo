'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PostulacionConDetalle,
  withdrawApplication,
  getCurriculumSignedUrl,
} from '@/lib/postulante';
import { getApplicationStatusConfig } from '@/components/applications/ApplicationStatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  MapPinIcon,
  ChevronDownIcon,
} from '@/components/ui/Icons';
import {
  FileText,
  ExternalLink,
  History,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';

export interface ApplicationsHistoryListProps {
  applications: PostulacionConDetalle[];
  isLoading?: boolean;
  onChanged: () => void | Promise<void>;
}

export const ApplicationsHistoryList: React.FC<ApplicationsHistoryListProps> = ({
  applications,
  isLoading = false,
  onChanged,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appToWithdraw, setAppToWithdraw] = useState<PostulacionConDetalle | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [openingCvId, setOpeningCvId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeCount = applications.filter(
    (app) => app.estado !== 'retirado_por_postulante'
  ).length;

  const handleOpenCvSnapshot = async (app: PostulacionConDetalle) => {
    const fileUrl = app.cv_url_snapshot || app.cv?.archivo_url;
    if (!fileUrl) return;

    setFeedback(null);
    try {
      setOpeningCvId(app.id);
      const res = await getCurriculumSignedUrl(fileUrl);
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'No se pudo abrir el currículum adjunto a esta postulación.',
        });
      }
    } finally {
      setOpeningCvId(null);
    }
  };

  const handleConfirmWithdraw = async (reason?: string) => {
    if (!appToWithdraw) return;
    setFeedback(null);

    try {
      setIsWithdrawing(true);
      const res = await withdrawApplication(appToWithdraw.id, reason);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setAppToWithdraw(null);
        await onChanged();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <section className="bg-white border border-[#E0E8E1] rounded-[24px] p-7 shadow-xs">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-zinc-900 font-display">
          Mis Postulaciones e Historial de Seguimiento
        </h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-[13px] font-bold bg-[#E4F1E8] text-[#0A3D2A]">
          {activeCount} {activeCount === 1 ? 'activa' : 'activas'}
        </span>
      </div>
      <p className="mt-1 text-xs sm:text-[13px] text-[#5A7064]">
        Consultá el estado de intermediación municipal de cada postulación y su trazabilidad cronológica.
      </p>

      {feedback && (
        <div
          className={`mt-4 p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 py-6">
          <div className="h-44 rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="h-44 rounded-2xl bg-zinc-100 animate-pulse" />
        </div>
      ) : applications.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<BriefcaseIcon className="w-8 h-8 text-brand-800" />}
            title="Aún no te postulaste a ninguna búsqueda laboral"
            description="Explorá las ofertas laborales publicadas por comercios y empresas de Funes y postulate con tu perfil registrado."
            action={{
              label: 'Explorar ofertas vigentes',
              href: '/ofertas',
              variant: 'primary',
            }}
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4 sm:space-y-5">
          {applications.map((app) => {
            const oferta = app.oferta;
            const empresaNombre =
              oferta?.empresa?.nombre_fantasia ||
              oferta?.empresa?.razon_social ||
              'Empresa de Funes';
            const isExpanded = expandedId === app.id;
            const canWithdraw =
              app.estado !== 'contratado' &&
              app.estado !== 'retirado_por_postulante' &&
              app.estado !== 'no_seleccionado' &&
              app.estado !== 'rechazado_por_empresa' &&
              (app.estado as string) !== 'no_derivado';
            const hasCvLink = Boolean(app.cv_url_snapshot || app.cv?.archivo_url);
            
            const formattedCreated = new Date(app.created_at).toLocaleDateString(
              'es-AR',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }
            );

            // Determinación de No Derivado (si es no_derivado o no_seleccionado sin fecha_derivacion)
            const isNoDerivado =
              (app.estado as string) === 'no_derivado' ||
              (app.estado === 'no_seleccionado' && !app.fecha_derivacion);

            const isRechazadoEmpresa = app.estado === 'rechazado_por_empresa';
            const isSeleccionado = app.estado === 'seleccionado' || app.estado === 'contratado';
            const isRetirado = app.estado === 'retirado_por_postulante';

            // Motivo de no derivación informado por la Oficina de Empleo
            const motivoNoDerivacion =
              app.notas_oficina_empleo ||
              app.historial.find((h) => h.observaciones)?.observaciones ||
              null;

            // Insignia superior derecha
            let badgeBg = 'bg-[#E6F0FB] text-[#174F93]';
            let badgeIcon = <CalendarIcon className="w-3.5 h-3.5" />;
            let badgeLabel = 'Recibido por Oficina de Empleo';

            if (isRechazadoEmpresa) {
              badgeBg = 'bg-[#FDECEF] text-[#A3193B]';
              badgeIcon = <X className="w-3.5 h-3.5 stroke-[2.4]" />;
              badgeLabel = 'No seleccionado por empresa';
            } else if (isNoDerivado) {
              badgeBg = 'bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]';
              badgeIcon = <XCircle className="w-3.5 h-3.5 text-[#71717A]" />;
              badgeLabel = 'No derivado';
            } else if (isSeleccionado) {
              badgeBg = 'bg-[#D9EEDF] text-[#064230]';
              badgeIcon = <Check className="w-3.5 h-3.5 stroke-[2.4]" />;
              badgeLabel = app.estado === 'contratado' ? 'Contratado' : 'Seleccionado por empresa';
            } else if (app.estado === 'presentado_a_empresa') {
              badgeBg = 'bg-[#E4F1E8] text-[#0A3D2A]';
              badgeIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
              badgeLabel = 'Derivado a la empresa';
            } else if (app.estado === 'en_revision' || app.estado === 'preseleccionado' || app.estado === 'entrevista') {
              badgeBg = 'bg-[#FEF3C7] text-[#92400E]';
              badgeIcon = <CalendarIcon className="w-3.5 h-3.5" />;
              badgeLabel = 'En revisión técnica municipal';
            } else if (isRetirado) {
              badgeBg = 'bg-zinc-100 text-zinc-600';
              badgeIcon = <XCircle className="w-3.5 h-3.5" />;
              badgeLabel = 'Retirado voluntariamente';
            }

            return (
              <article
                key={app.id}
                className={`border border-[#E0E8E1] rounded-[20px] p-5 sm:p-6 transition-all ${
                  isRetirado ? 'bg-zinc-50/70 opacity-80' : 'bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {oferta?.rubro?.nombre && (
                      <span className="inline-block px-2.5 py-1 rounded-[8px] bg-[#F1F5F1] text-[#33493D] text-xs font-bold mb-2">
                        {oferta.rubro.nombre}
                      </span>
                    )}

                    <h3 className="text-xl sm:text-[22px] font-bold text-zinc-900 leading-snug">
                      {oferta ? (
                        <Link
                          href={`/ofertas/${app.oferta_id}`}
                          className="hover:text-brand-800 transition-colors"
                        >
                          {oferta.titulo}
                        </Link>
                      ) : (
                        <span>Oferta laboral #{app.oferta_id.slice(0, 8)}</span>
                      )}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#5A7064]">
                      <span className="inline-flex items-center gap-1.5">
                        <BuildingIcon className="w-3.5 h-3.5 text-zinc-400" />
                        {empresaNombre}
                      </span>
                      {oferta?.ubicacion && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 text-zinc-400" />
                          {oferta.ubicacion}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                        Postulado el {formattedCreated}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold ${badgeBg}`}
                    >
                      {badgeIcon}
                      {badgeLabel}
                    </span>
                  </div>
                </div>

                {/* Línea de etapas visual (Stepper) */}
                <div
                  className="grid grid-cols-4 gap-1 sm:gap-2 mt-5 sm:mt-6"
                  role="list"
                  aria-label="Etapas de la postulación"
                >
                  {/* Etapa 1: Postulado */}
                  <div role="listitem">
                    <div className="flex items-center">
                      <span className="w-6 h-6 rounded-full bg-[#0E4D36] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                      <span className="flex-1 h-0.5 bg-[#0E4D36]" />
                    </div>
                    <div className="mt-2 text-xs sm:text-[13px] font-bold text-zinc-900">
                      Postulado
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#5A7064]">
                      {formattedCreated}
                    </div>
                  </div>

                  {/* Etapa 2: Recibido */}
                  <div role="listitem">
                    <div className="flex items-center">
                      <span className="w-6 h-6 rounded-full bg-[#0E4D36] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                      <span
                        className={`flex-1 h-0.5 ${
                          isRechazadoEmpresa || isSeleccionado || app.estado === 'presentado_a_empresa'
                            ? 'bg-[#0E4D36]'
                            : 'bg-[#D3DED5]'
                        }`}
                      />
                    </div>
                    <div className="mt-2 text-xs sm:text-[13px] font-bold text-zinc-900">
                      Recibido
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#5A7064]">
                      Oficina de Empleo
                    </div>
                  </div>

                  {/* Etapa 3: Revisión técnica / Derivado */}
                  {isRechazadoEmpresa || isSeleccionado || app.estado === 'presentado_a_empresa' ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-[#0E4D36] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                        <span
                          className={`flex-1 h-0.5 ${
                            isRechazadoEmpresa || isSeleccionado ? 'bg-[#0E4D36]' : 'bg-[#D3DED5]'
                          }`}
                        />
                      </div>
                      <div className="mt-2 text-xs sm:text-[13px] font-bold text-zinc-900">
                        Derivado
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#5A7064]">
                        A la empresa
                      </div>
                    </div>
                  ) : isNoDerivado ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-[#71717A] text-white flex items-center justify-center shrink-0">
                          <X className="w-3.5 h-3.5 stroke-[2.4]" />
                        </span>
                        <span className="flex-1 h-0.5 bg-[#D3DED5]" />
                      </div>
                      <div className="mt-2 text-xs sm:text-[13px] font-bold text-[#52525B]">
                        Revisión técnica
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#71717A]">
                        No derivado
                      </div>
                    </div>
                  ) : (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-white border-2 border-[#E0A12B] flex items-center justify-center shrink-0">
                          <span className="w-2 h-2 rounded-full bg-[#E0A12B]" />
                        </span>
                        <span className="flex-1 h-0.5 bg-[#D3DED5]" />
                      </div>
                      <div className="mt-2 text-xs sm:text-[13px] font-bold text-zinc-900">
                        Revisión técnica
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#5A7064]">
                        En curso
                      </div>
                    </div>
                  )}

                  {/* Etapa 4: Resultado final o Derivación pendiente */}
                  {isRechazadoEmpresa ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-[#A3193B] text-white flex items-center justify-center shrink-0">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      </div>
                      <div className="mt-2 text-xs sm:text-[13px] font-bold text-[#A3193B]">
                        Resultado
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#5A7064]">
                        No seleccionado
                      </div>
                    </div>
                  ) : isSeleccionado ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-[#0E4D36] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      </div>
                      <div className="mt-2 text-xs sm:text-[13px] font-bold text-[#0E4D36]">
                        Resultado
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#5A7064]">
                        {app.estado === 'contratado' ? 'Contratado' : 'Seleccionado'}
                      </div>
                    </div>
                  ) : (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-white border-2 border-[#C3D1C7] shrink-0" />
                      </div>
                      <div className="mt-2 text-xs sm:text-[13px] font-semibold text-[#5A7064]">
                        {isNoDerivado ? 'Derivación' : 'Derivado'}
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#5A7064]">
                        {isNoDerivado ? 'Cancelada' : 'A la empresa'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Caja de mensaje de estado actual */}
                <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-[#F4F7F4] text-xs sm:text-sm text-[#33493D] border border-[#E0E8E1]/60">
                  {isNoDerivado ? (
                    <div className="space-y-1.5">
                      <p className="font-semibold text-zinc-900">
                        La Oficina de Empleo no derivó esta postulación a la empresa.
                      </p>
                      {motivoNoDerivacion ? (
                        <p className="text-zinc-700">
                          <strong>Motivo informado:</strong> {motivoNoDerivacion}
                        </p>
                      ) : (
                        <p className="text-zinc-500 italic text-xs">
                          Motivo: Criterio de perfil o requisitos excluyentes de la vacante según evaluación técnica municipal.
                        </p>
                      )}
                    </div>
                  ) : isRechazadoEmpresa ? (
                    <div className="space-y-1">
                      <p>La empresa finalizó la revisión de candidatos derivados para esta búsqueda.</p>
                      {app.motivo_rechazo_empresa && (
                        <p className="text-zinc-600 text-xs">
                          <strong>Motivo de la empresa:</strong> {app.motivo_rechazo_empresa}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p>{getApplicationStatusConfig(app.estado).description}</p>
                  )}
                </div>

                {/* Pie: CV adjunto y acciones */}
                <div className="mt-4 pt-4 border-t border-[#EEF2EE] flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-[#4B6256]">
                    <FileText className="w-4 h-4 text-[#0E4D36]" />
                    <span>CV presentado:</span>
                    <strong className="text-zinc-800">
                      {app.cv?.nombre_cv || (hasCvLink ? 'Copia histórica adjunta' : 'Perfil registrado')}
                    </strong>
                    {hasCvLink && (
                      <button
                        type="button"
                        onClick={() => handleOpenCvSnapshot(app)}
                        disabled={openingCvId === app.id}
                        className="font-bold text-[#0E4D36] hover:text-[#08301F] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        Ver copia enviada
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="min-h-[44px] px-4 rounded-full border border-[#D3DED5] bg-white text-[#10231B] font-semibold text-sm inline-flex items-center gap-2 hover:bg-zinc-50 cursor-pointer"
                    >
                      <History className="w-4 h-4" />
                      Historial ({app.historial.length})
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {oferta && (
                      <Link
                        href={`/ofertas/${app.oferta_id}`}
                        className="min-h-[44px] px-4 rounded-full border border-[#0E4D36] bg-white text-[#0E4D36] font-bold text-sm inline-flex items-center justify-center hover:bg-[#F1F8F3] transition-colors"
                      >
                        {app.estado === 'retirado_por_postulante' &&
                        oferta.estado === 'publicada' &&
                        !oferta.deleted_at
                          ? 'Ver oferta / Volver a postularme'
                          : 'Ver oferta'}
                      </Link>
                    )}

                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setAppToWithdraw(app)}
                        className="min-h-[44px] px-3.5 rounded-full text-[#A3193B] font-bold text-sm inline-flex items-center gap-1.5 hover:bg-rose-50 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Retirar postulación
                      </button>
                    )}
                  </div>
                </div>

                {/* Desplegable de Historial de Trazabilidad */}
                {isExpanded && (
                  <div className="mt-4 px-4 sm:px-5 py-4 bg-[#F4F7F4] rounded-xl border border-[#E0E8E1] space-y-3 animate-in fade-in duration-150">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B6256]">
                      Trazabilidad de la postulación (Trámite #{app.id.slice(0, 8)})
                    </h4>

                    {app.mensaje_postulante && (
                      <div className="p-3 bg-white rounded-lg border border-[#E0E8E1] text-xs text-zinc-700">
                        <span className="font-semibold text-zinc-900 block mb-0.5">
                          Tu mensaje de presentación:
                        </span>
                        <p className="italic text-zinc-600">
                          &ldquo;{app.mensaje_postulante}&rdquo;
                        </p>
                      </div>
                    )}

                    {app.historial.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        Postulación registrada el {formattedCreated}.
                      </p>
                    ) : (
                      <ol className="relative border-l-2 border-[#BFE0CB] ml-2.5 space-y-3 pl-4">
                        {app.historial.map((h) => {
                          const hDate = new Date(h.created_at).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          return (
                            <li key={h.id} className="relative text-xs">
                              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0E4D36] ring-4 ring-white" />
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-zinc-800">
                                  {getApplicationStatusConfig(h.estado_nuevo).label}
                                </span>
                                <span className="text-[11px] text-[#5A7064]">
                                  {hDate}
                                </span>
                              </div>
                              {h.observaciones && (
                                <p className="text-zinc-600 mt-1">{h.observaciones}</p>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(appToWithdraw)}
        title="¿Retirar tu postulación de esta búsqueda?"
        description={
          appToWithdraw
            ? `Vas a retirar voluntariamente tu postulación para el puesto "${
                appToWithdraw.oferta?.titulo || 'seleccionado'
              }". Si cambiás de opinión mientras la oferta siga publicada, podrás volver a postularte.`
            : undefined
        }
        confirmText="Confirmar retiro"
        cancelText="Volver atrás"
        variant="destructive"
        requireReason={false}
        isLoading={isWithdrawing}
        onConfirm={handleConfirmWithdraw}
        onClose={() => setAppToWithdraw(null)}
      />
    </section>
  );
};
