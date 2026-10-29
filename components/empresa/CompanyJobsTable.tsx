'use client';

import React, { useState } from 'react';
import { Oferta, Rubro } from '@/types/database';
import { JobStatusBadge } from './JobStatusBadge';
import { Button } from '@/components/ui/Button';
import {
  BriefcaseIcon,
  PencilIcon,
  TrashIcon,
  SendIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/components/ui/Icons';
import { enviarOfertaARevision, renovarOferta30Dias } from '@/lib/empresa';
import { RefreshCw, Calendar, AlertTriangle } from 'lucide-react';
import { CompanyJobModal } from './CompanyJobModal';
import { DeactivateJobModal } from './DeactivateJobModal';

interface CompanyJobsTableProps {
  ofertas: (Oferta & {
    rubro: Rubro | null;
    ofertas_rubros: { rubro_id: number; rubro: Rubro | null }[];
  })[];
  loading?: boolean;
  onRefresh: () => void;
  onViewCandidates?: (ofertaId: string) => void;
}

export function CompanyJobsTable({
  ofertas,
  loading,
  onRefresh,
  onViewCandidates,
}: CompanyJobsTableProps) {
  const [selectedOfertaEdit, setSelectedOfertaEdit] = useState<Oferta | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedOfertaDeactivate, setSelectedOfertaDeactivate] = useState<Oferta | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  
  const handleRenewJob = async (ofertaId: string) => {
    setRenewingId(ofertaId);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await renovarOferta30Dias(ofertaId);
      if (!res.success) {
        setActionError(res.error || 'No se pudo renovar la oferta.');
      } else {
        setActionSuccess('Oferta renovada exitosamente por 30 días adicionales.');
        onRefresh();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error inesperado al renovar.');
    } finally {
      setRenewingId(null);
    }
  };

  const handleSendToReview = async (ofertaId: string) => {
    setSendingId(ofertaId);
    setActionSuccess(null);
    setActionError(null);

    try {
      const res = await enviarOfertaARevision(ofertaId);
      if (!res.success) {
        setActionError(res.error || 'No se pudo enviar la oferta a revisión.');
      } else {
        setActionSuccess('Oferta enviada exitosamente para revisión de la Oficina de Empleo.');
        onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      setActionError(msg);
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-zinc-500">
        <ClockIcon className="w-8 h-8 mx-auto animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Cargando búsquedas de la empresa...</p>
      </div>
    );
  }

  if (ofertas.length === 0) {
    return (
      <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
        <BriefcaseIcon className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-800">No tenés búsquedas laborales registradas</h4>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
          Hacé clic en &quot;Crear Oferta&quot; para publicar una nueva vacante laboral y que la Oficina de Empleo la revise y presente postulantes calificados.
        </p>
      </div>
    );
  }

  return (
    <>
      {actionSuccess && (
        <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="space-y-4">
        {ofertas.map((o) => {
          const isBorrador = o.estado === 'borrador';
          const isPendiente = o.estado === 'pendiente_revision';
          const isRechazada = o.estado === 'rechazada';
          const isDeleted = Boolean(o.deleted_at);
          const isPublicada = o.estado === 'publicada';

          // Cálculo de días restantes de vigencia
          let diasRestantes: number | null = null;
          let isVencida = false;
          let isPorVencer = false;

          if (o.fecha_limite) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaFin = new Date(o.fecha_limite + 'T00:00:00');
            const diffTime = fechaFin.getTime() - hoy.getTime();
            diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diasRestantes < 0) {
              isVencida = true;
            } else if (diasRestantes <= 5 && isPublicada) {
              isPorVencer = true;
            }
          }

          return (
            <div
              key={o.id}
              className={`p-5 bg-white border rounded-2xl shadow-sm transition-all space-y-4 ${
                isDeleted ? 'opacity-65 border-zinc-200 bg-zinc-50/50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-zinc-900">{o.titulo}</h4>
                    <JobStatusBadge estado={o.estado} isDeleted={isDeleted} />
                    {isVencida && !isDeleted && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md flex items-center gap-1">
                        <AlertCircleIcon className="w-3 h-3" /> Vencida
                      </span>
                    )}
                    {isPorVencer && !isDeleted && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Vence en {diasRestantes === 0 ? 'hoy' : `${diasRestantes} días`}
                      </span>
                    )}
                    {o.rubro && (
                      <span className="text-[11px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md">
                        {o.rubro.nombre}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {o.tipo_jornada} • {o.vacantes} {o.vacantes === 1 ? 'vacante' : 'vacantes'} • Ubicación: {o.ubicacion}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {onViewCandidates && !isDeleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewCandidates(o.id)}
                    >
                      <UsersIcon className="w-4 h-4 mr-1 text-zinc-600" />
                      Ver Candidatos
                    </Button>
                  )}

                  {isBorrador && !isDeleted && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOfertaEdit(o);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <PencilIcon className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSendToReview(o.id)}
                        isLoading={sendingId === o.id}
                      >
                        <SendIcon className="w-3.5 h-3.5 mr-1" />
                        Enviar a Revisión
                      </Button>
                    </>
                  )}

                  {isRechazada && !isDeleted && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedOfertaEdit(o);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <PencilIcon className="w-3.5 h-3.5 mr-1" />
                      Corregir Oferta
                    </Button>
                  )}

                  {(isPorVencer || isVencida || o.estado === 'finalizada') && !isDeleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-brand-500 text-brand-700 hover:bg-brand-50"
                      onClick={() => handleRenewJob(o.id)}
                      isLoading={renewingId === o.id}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Renovar por 30 días
                    </Button>
                  )}
                  {!isDeleted && !isPendiente && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        setSelectedOfertaDeactivate(o);
                        setIsDeactivateModalOpen(true);
                      }}
                    >
                      <TrashIcon className="w-3.5 h-3.5 mr-1" />
                      Baja
                    </Button>
                  )}
                </div>
              </div>

              {/* Mensajes de advertencia según estado */}
              {isPorVencer && !isDeleted && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Esta oferta expira en <strong>{diasRestantes === 0 ? 'hoy' : `${diasRestantes} días`}</strong>. Podés renovarla ahora para que continúe publicada en el portal sin interrupciones.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="shrink-0 text-xs"
                    onClick={() => handleRenewJob(o.id)}
                    isLoading={renewingId === o.id}
                  >
                    Renovar ahora
                  </Button>
                </div>
              )}
              {isVencida && !isDeleted && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Esta oferta finalizó su período de vigencia y ya no es visible para los postulantes en el portal.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="shrink-0 text-xs"
                    onClick={() => handleRenewJob(o.id)}
                    isLoading={renewingId === o.id}
                  >
                    Republicar / Renovar 30 días
                  </Button>
                </div>
              )}
              {isPendiente && !isDeleted && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <ClockIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">En evaluación por la Oficina de Empleo</span>
                    <span>
                      La búsqueda está siendo revisada para asegurar el cumplimiento con las pautas laborales del Municipio. No se puede editar mientras esté en revisión.
                    </span>
                  </div>
                </div>
              )}

              {isRechazada && o.motivo_rechazo && !isDeleted && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Observaciones de la Oficina de Empleo:</span>
                    <span>{o.motivo_rechazo}</span>
                  </div>
                </div>
              )}

              {isDeleted && o.motivo_baja && (
                <div className="p-2.5 bg-zinc-100 rounded-xl text-xs text-zinc-600">
                  <span className="font-semibold">Motivo de baja:</span> {o.motivo_baja}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isEditModalOpen && (
        <CompanyJobModal
          ofertaToEdit={selectedOfertaEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedOfertaEdit(null);
          }}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}

      {isDeactivateModalOpen && selectedOfertaDeactivate && (
        <DeactivateJobModal
          oferta={selectedOfertaDeactivate}
          isOpen={isDeactivateModalOpen}
          onClose={() => {
            setIsDeactivateModalOpen(false);
            setSelectedOfertaDeactivate(null);
          }}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </>
  );
}
