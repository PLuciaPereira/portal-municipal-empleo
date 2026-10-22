'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PostulacionConDetalle,
  withdrawApplication,
  getCurriculumSignedUrl,
} from '@/lib/postulante';
import {
  ApplicationStatusBadge,
  getApplicationStatusConfig,
} from '@/components/applications/ApplicationStatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
    <Card className="border-zinc-200 shadow-sm">
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900">
                Mis Postulaciones e Historial de Seguimiento
              </h3>
              <Badge variant="zinc" size="sm">
                {activeCount} {activeCount === 1 ? 'activa' : 'activas'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Consultá el estado de intermediación municipal de cada postulación y su trazabilidad cronológica.
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
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
              className="p-1 rounded hover:bg-black/5"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 py-4">
            <div className="h-24 rounded-xl bg-zinc-100 animate-pulse" />
            <div className="h-24 rounded-xl bg-zinc-100 animate-pulse" />
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon className="w-7 h-7 text-brand-800" />}
            title="Aún no te postulaste a ninguna búsqueda laboral"
            description="Explorá las ofertas laborales publicadas por comercios y empresas de Funes y postulate con tu perfil registrado."
            action={{
              label: 'Explorar ofertas vigentes',
              href: '/ofertas',
              variant: 'primary',
            }}
          />
        ) : (
          <div className="space-y-3.5">
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
                app.estado !== 'rechazado_por_empresa';
              const hasCvLink = Boolean(app.cv_url_snapshot || app.cv?.archivo_url);
              const formattedCreated = new Date(app.created_at).toLocaleDateString(
                'es-AR',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }
              );
              const statusInfo = getApplicationStatusConfig(app.estado);

              return (
                <div
                  key={app.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    app.estado === 'retirado_por_postulante'
                      ? 'border-zinc-200 bg-zinc-50/60 opacity-85'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {oferta ? (
                            <Link
                              href={`/ofertas/${app.oferta_id}`}
                              className="text-base font-bold text-zinc-900 hover:text-brand-800 transition-colors"
                            >
                              {oferta.titulo}
                            </Link>
                          ) : (
                            <span className="text-base font-bold text-zinc-900">
                              Oferta laboral #{app.oferta_id.slice(0, 8)}
                            </span>
                          )}
                          {oferta?.rubro?.nombre && (
                            <Badge variant="zinc" size="sm">
                              {oferta.rubro.nombre}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
                          <span className="inline-flex items-center gap-1 font-medium text-zinc-700">
                            <BuildingIcon className="w-3.5 h-3.5 text-zinc-400" />
                            {empresaNombre}
                          </span>
                          {oferta?.ubicacion && (
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon className="w-3.5 h-3.5 text-zinc-400" />
                              {oferta.ubicacion}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                            Postulado el {formattedCreated}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <ApplicationStatusBadge status={app.estado} />
                      </div>
                    </div>

                    {/* Explicación del estado actual */}
                    {statusInfo.description && (
                      <p className="text-xs text-zinc-600 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
                        {statusInfo.description}
                      </p>
                    )}

                    {/* Pie de tarjeta: CV adjunto y acciones */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-zinc-600">
                        <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          CV presentado:{' '}
                          <strong>
                            {app.cv?.nombre_cv ||
                              (hasCvLink ? 'Copia histórica adjunta' : 'Perfil registrado')}
                          </strong>
                        </span>

                        {hasCvLink && (
                          <button
                            type="button"
                            onClick={() => handleOpenCvSnapshot(app)}
                            disabled={openingCvId === app.id}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer disabled:opacity-50"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {openingCvId === app.id ? 'Abriendo...' : 'Ver copia enviada'}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : app.id)
                          }
                          className="text-xs"
                        >
                          <History className="w-3.5 h-3.5 mr-1" />
                          Historial ({app.historial.length})
                          <ChevronDownIcon
                            className={`w-3.5 h-3.5 ml-1 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>

                        {oferta && (
                          <Button
                            href={`/ofertas/${app.oferta_id}`}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            {app.estado === 'retirado_por_postulante' &&
                            oferta.estado === 'publicada' &&
                            !oferta.deleted_at
                              ? 'Ver oferta / Volver a postularme'
                              : 'Ver oferta'}
                          </Button>
                        )}

                        {canWithdraw && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAppToWithdraw(app)}
                            className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Retirar postulación
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Línea de tiempo desplegable de historial_postulacion */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 py-4 bg-zinc-50 border-t border-zinc-200/80 space-y-3 animate-in fade-in duration-150">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Trazabilidad de la postulación (Trámite #{app.id.slice(0, 8)})
                      </h4>

                      {app.mensaje_postulante && (
                        <div className="p-2.5 bg-white rounded-xl border border-zinc-200 text-xs text-zinc-700">
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
                        <ol className="relative border-l-2 border-emerald-200 ml-2.5 space-y-3 pl-4">
                          {app.historial.map((h) => {
                            const hDate = new Date(h.created_at).toLocaleString(
                              'es-AR',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            );
                            return (
                              <li key={h.id} className="relative text-xs">
                                <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-zinc-50" />
                                <div className="flex flex-wrap items-center gap-2">
                                  <ApplicationStatusBadge
                                    status={h.estado_nuevo}
                                    size="sm"
                                  />
                                  <span className="text-[11px] text-zinc-500">
                                    {hDate}
                                  </span>
                                </div>
                                {h.observaciones && (
                                  <p className="text-zinc-600 mt-1">
                                    {h.observaciones}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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
    </Card>
  );
};
