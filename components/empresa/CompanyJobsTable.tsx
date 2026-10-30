'use client';

import React, { useState, useMemo } from 'react';
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
import { RefreshCw, Calendar, AlertTriangle, Search, ArrowUpDown, Info } from 'lucide-react';
import Link from 'next/link';
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

  // Filtros reactivos con contadores (patrón unificado con panel admin)
  type FilterEstado = 'todas' | 'publicada' | 'pendiente_revision' | 'borrador' | 'rechazada' | 'bajas';
  const [filterEstado, setFilterEstado] = useState<FilterEstado>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');

  // Contadores por estado
  const counts = useMemo(() => {
    return {
      todas: ofertas.length,
      publicadas: ofertas.filter((o) => o.estado === 'publicada' && !o.deleted_at).length,
      pendientes: ofertas.filter((o) => o.estado === 'pendiente_revision' && !o.deleted_at).length,
      borradores: ofertas.filter((o) => o.estado === 'borrador' && !o.deleted_at).length,
      rechazadas: ofertas.filter((o) => o.estado === 'rechazada' && !o.deleted_at).length,
      bajas: ofertas.filter((o) => Boolean(o.deleted_at)).length,
    };
  }, [ofertas]);

  // Lista filtrada y ordenada cronológicamente (más nuevo primero por defecto)
  const filteredOfertas = useMemo(() => {
    const list = ofertas.filter((o) => {
      const isDeleted = Boolean(o.deleted_at);

      if (filterEstado === 'bajas') {
        if (!isDeleted) return false;
      } else if (filterEstado !== 'todas') {
        if (isDeleted || o.estado !== filterEstado) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitulo = (o.titulo || '').toLowerCase().includes(q);
        const matchesRubro = (o.rubro?.nombre || '').toLowerCase().includes(q);
        const matchesUbicacion = (o.ubicacion || '').toLowerCase().includes(q);
        return matchesTitulo || matchesRubro || matchesUbicacion;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'antiguas') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'titulo') {
        return (a.titulo || '').localeCompare(b.titulo || '');
      }
      // 'recientes' (por defecto): más nueva primera
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [ofertas, filterEstado, searchTerm, sortBy]);

  
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

      {/* Barra de Filtros, Búsqueda y Ordenamiento Integrada (Plana como en Mockup) */}
      <div className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        {/* Chips de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterEstado('todas')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'todas'
                ? 'bg-brand-900 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Todas ({counts.todas})
          </button>
          <button
            type="button"
            onClick={() => setFilterEstado('publicada')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'publicada'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Publicadas ({counts.publicadas})
          </button>
          <button
            type="button"
            onClick={() => setFilterEstado('pendiente_revision')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'pendiente_revision'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Pendientes de Revisión ({counts.pendientes})
          </button>
          <button
            type="button"
            onClick={() => setFilterEstado('borrador')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'borrador'
                ? 'bg-zinc-700 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Borradores ({counts.borradores})
          </button>
          <button
            type="button"
            onClick={() => setFilterEstado('rechazada')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'rechazada'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Rechazadas ({counts.rechazadas})
          </button>
          <button
            type="button"
            onClick={() => setFilterEstado('bajas')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'bajas'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Dadas de baja ({counts.bajas})
          </button>
        </div>

        {/* Buscador y Selector de Orden */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por puesto o rubro..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 bg-white w-60 focus:outline-brand-800"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-700 cursor-pointer focus:outline-brand-800"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguas">Más antiguas</option>
            <option value="titulo">Título A - Z</option>
          </select>
        </div>
      </div>

      {filteredOfertas.length === 0 ? (
        <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
          <BriefcaseIcon className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-zinc-600">
            No se encontraron ofertas con los filtros seleccionados.
          </p>
        </div>
      ) : (
        /* LISTADO PLANO Y ORDENADO: Contenedor continuo tipo ATS sin tarjetas cortadas */
        <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden shadow-xs">
          {filteredOfertas.map((o) => {
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
              className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                isDeleted
                  ? 'opacity-65 bg-zinc-50/50'
                  : isPorVencer
                  ? 'bg-amber-50/20 hover:bg-amber-50/40'
                  : 'hover:bg-zinc-50/60'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-base font-extrabold text-zinc-900">{o.titulo}</h4>
                  <JobStatusBadge estado={o.estado} isDeleted={isDeleted} />
                  {isVencida && !isDeleted && (
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md flex items-center gap-1">
                      <AlertCircleIcon className="w-3 h-3" /> Vencida
                    </span>
                  )}
                  {isPorVencer && !isDeleted && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                      Vence en {diasRestantes === 0 ? 'hoy' : `${diasRestantes} días`}
                    </span>
                  )}
                  {o.fecha_limite && !isVencida && !isPorVencer && !isDeleted && (
                    <span className="text-xs text-zinc-500 font-medium">
                      &bull; Vigente hasta el {new Date(o.fecha_limite + 'T00:00:00').toLocaleDateString('es-AR')} {diasRestantes !== null && `(faltan ${diasRestantes} días)`}
                    </span>
                  )}
                  {o.rubro && (
                    <span className="text-[11px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md font-medium">
                      {o.rubro.nombre}
                    </span>
                  )}
                  {isBorrador && !isDeleted && (
                    <span className="text-xs text-zinc-400 italic font-medium">
                      (Privado · No enviado al Municipio)
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500">
                  {o.tipo_jornada} &bull; {o.vacantes} {o.vacantes === 1 ? 'vacante' : 'vacantes'} &bull; Ubicación: {o.ubicacion} &bull; Creada: {new Date(o.created_at).toLocaleDateString('es-AR')}
                </p>

                {(o.estado === 'publicada' || o.estado === 'pendiente_revision') && !isDeleted && (
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200/80 rounded-md px-2 py-0.5">
                      <Info className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>Para modificar condiciones o requisitos, comunicate con la Oficina de Empleo de Funes.</span>
                    </span>
                  </div>
                )}

                {isRechazada && o.motivo_rechazo && !isDeleted && (
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2 mt-1">
                    <AlertCircleIcon className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Observaciones de la Oficina de Empleo:</span>
                      <span>{o.motivo_rechazo}</span>
                    </div>
                  </div>
                )}

                {isDeleted && o.motivo_baja && (
                  <div className="p-2 bg-zinc-100 rounded-lg text-xs text-zinc-600">
                    <span className="font-semibold">Motivo de baja:</span> {o.motivo_baja}
                  </div>
                )}
              </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {onViewCandidates && !isDeleted && (
                    isPendiente ? (
                      <div className="relative group inline-block">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="h-8 px-3 rounded-lg opacity-50 cursor-not-allowed text-zinc-400 border-zinc-200 text-xs font-bold"
                        >
                          <UsersIcon className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                          Ver Candidatos
                        </Button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 w-56">
                          <div className="bg-zinc-900 text-white text-[11px] font-medium rounded-lg px-2.5 py-1.5 text-center shadow-lg leading-snug">
                            Estará disponible cuando la oferta sea aprobada por la Oficina de Empleo.
                          </div>
                          <div className="w-2 h-2 bg-zinc-900 rotate-45 -mt-1" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onViewCandidates(o.id)}
                        className="h-8 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UsersIcon className="w-3.5 h-3.5 text-zinc-600" />
                        Ver Candidatos
                      </button>
                    )
                  )}

                  {isBorrador && !isDeleted && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSendToReview(o.id)}
                        disabled={sendingId === o.id}
                        className="h-8 px-3 rounded-lg bg-brand-800 text-white text-xs font-bold hover:bg-brand-900 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <SendIcon className="w-3.5 h-3.5" />
                        Enviar a Revisión
                      </button>
                      <Link
                        href={`/empresa/ofertas/${o.id}/editar`}
                        className="h-8 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 inline-flex items-center gap-1 transition-colors"
                      >
                        <PencilIcon className="w-3 h-3" />
                        Editar
                      </Link>
                    </>
                  )}

                  {isRechazada && !isDeleted && (
                    <Link
                      href={`/empresa/ofertas/${o.id}/editar`}
                      className="h-8 px-3 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <PencilIcon className="w-3 h-3" />
                      Corregir Oferta
                    </Link>
                  )}

                  {(isPorVencer || isVencida || o.estado === 'finalizada') && !isDeleted && (
                    <button
                      type="button"
                      onClick={() => handleRenewJob(o.id)}
                      disabled={renewingId === o.id}
                      className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Renovar por 30 días
                    </button>
                  )}

                  {!isDeleted && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOfertaDeactivate(o);
                        setIsDeactivateModalOpen(true);
                      }}
                      className="h-8 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Baja
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
