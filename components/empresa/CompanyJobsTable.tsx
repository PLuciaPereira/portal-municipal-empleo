'use client';

import React, { useState, useMemo } from 'react';
import { Oferta, Rubro } from '@/types/database';
import { JobStatusBadge } from './JobStatusBadge';
import { Button } from '@/components/ui/Button';
import {
  BriefcaseIcon,
  PencilIcon,
  SendIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/components/ui/Icons';
import { enviarOfertaARevision, renovarOferta30Dias } from '@/lib/empresa';
import { RefreshCw, Search, ArrowUpDown, Info } from 'lucide-react';
import Link from 'next/link';
import { Pagination } from '@/components/ui/Pagination';
import { CompanyJobModal } from './CompanyJobModal';
import { DeactivateJobModal } from './DeactivateJobModal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

interface CompanyJobsTableProps {
  ofertas: (Oferta & {
    rubro: Rubro | null;
    ofertas_rubros: { rubro_id: number; rubro: Rubro | null }[];
  })[];
  loading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onViewCandidates?: (ofertaId: string) => void;
}

export function CompanyJobsTable({
  ofertas,
  loading,
  error,
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
  const [filterEstado, setFilterEstado] = useState<FilterEstado>('publicada');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  // Clave local para persistir la última vez que la empresa vio sus ofertas publicadas
  const LAST_SEEN_PUBLICADAS_KEY = 'portal_empresa_last_seen_publicadas';

  // Identificar si alguna oferta pasó recientemente de "En revisión" a "Publicada" (aprobada por el Municipio)
  const hasNewlyApprovedJobs = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const lastSeen = localStorage.getItem(LAST_SEEN_PUBLICADAS_KEY);
    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

    return ofertas.some((o) => {
      if (o.estado !== 'publicada' || !o.fecha_revision || o.deleted_at) return false;
      const revisionTime = new Date(o.fecha_revision).getTime();
      return revisionTime > lastSeenTime;
    });
  }, [ofertas]);

  // Handlers con reset de página
  const handleFilterEstadoChange = (estado: FilterEstado) => {
    setFilterEstado(estado);
    setCurrentPage(1);

    if (estado === 'publicada' && typeof window !== 'undefined') {
      localStorage.setItem(LAST_SEEN_PUBLICADAS_KEY, new Date().toISOString());
    }
  };

  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleSortByChange = (order: 'recientes' | 'antiguas' | 'titulo') => {
    setSortBy(order);
    setCurrentPage(1);
  };

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

  const totalPages = Math.ceil(filteredOfertas.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Asegurar que si los filtros reducen el total de páginas, no quede en una página huérfana
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOfertas = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredOfertas.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredOfertas, safeCurrentPage]);

  
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
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudieron recuperar las ofertas de la empresa"
        description={error}
        onRetry={onRefresh}
      />
    );
  }

  if (ofertas.length === 0) {
    return (
      <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
        <BriefcaseIcon className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-800">No tenés búsquedas laborales registradas</h4>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
          Hacé clic en &quot;Crear oferta&quot; para publicar una nueva vacante laboral y que la Oficina de Empleo la revise y presente postulantes calificados.
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

      {/* Barra de Filtros, Búsqueda y Ordenamiento Integrada */}
      <div className="bg-zinc-50/80 rounded-xl p-2 sm:p-2.5 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-3">
        {/* Chips de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold pb-0.5 md:pb-0">
          {/* 1. Publicadas */}
          <button
            type="button"
            onClick={() => handleFilterEstadoChange('publicada')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              filterEstado === 'publicada'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <span>Publicadas ({counts.publicadas})</span>
            {hasNewlyApprovedJobs && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  filterEstado === 'publicada' ? 'bg-emerald-300' : 'bg-emerald-500 animate-pulse'
                }`}
                title="Tenés búsquedas aprobadas por el Municipio recientemente"
              />
            )}
          </button>

          {/* 2. En revisión */}
          <button
            type="button"
            onClick={() => handleFilterEstadoChange('pendiente_revision')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'pendiente_revision'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            En revisión ({counts.pendientes})
          </button>

          {/* 3. Rechazadas */}
          <button
            type="button"
            onClick={() => handleFilterEstadoChange('rechazada')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'rechazada'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Rechazadas ({counts.rechazadas})
          </button>

          {/* 4. Borradores */}
          <button
            type="button"
            onClick={() => handleFilterEstadoChange('borrador')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'borrador'
                ? 'bg-zinc-700 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Borradores ({counts.borradores})
          </button>

          {/* 5. Baja */}
          <button
            type="button"
            onClick={() => handleFilterEstadoChange('bajas')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'bajas'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Baja ({counts.bajas})
          </button>

          {/* 6. Todas */}
          <button
            type="button"
            onClick={() => handleFilterEstadoChange('todas')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterEstado === 'todas'
                ? 'bg-brand-900 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Todas ({counts.todas})
          </button>
        </div>

        {/* Buscador y Selector de Orden */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              placeholder="Buscar por puesto o rubro..."
              className="text-xs pl-8 pr-3 py-1 h-7.5 rounded-lg border border-zinc-200 bg-white w-full sm:w-52 focus:outline-brand-800"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 h-7.5 rounded-lg border border-zinc-200 text-xs shrink-0 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-medium hidden sm:inline">Orden:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortByChange(e.target.value as 'recientes' | 'antiguas' | 'titulo')}
              aria-label="Ordenar ofertas laborales"
              className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="recientes">Más reciente primero</option>
              <option value="antiguas">Más antiguo primero</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
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
        /* TABLA CON COLUMNAS INDEPENDIENTES PARA CADA ACCIÓN */
        <>
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto scroll-smooth">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5">Puesto y características</th>
                    <th className="py-3 px-3">Vigencia y fechas</th>
                    <th className="py-3 px-3">Estado</th>
                    {/* Columnas independientes para cada acción */}
                    <th className="py-3 px-1.5 w-32 text-center">Candidatos</th>
                    <th className="py-3 px-1.5 w-36 text-center">Gestión</th>
                    <th className="py-3 px-1.5 w-36 text-center">Renovar</th>
                    <th className="py-3 px-1.5 w-24 text-center">Baja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {paginatedOfertas.map((o) => {
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
                      <tr
                        key={o.id}
                        className={`transition-colors hover:bg-zinc-50/60 ${
                          isDeleted
                            ? 'opacity-65 bg-zinc-50/50'
                            : isPorVencer
                            ? 'bg-amber-50/15'
                            : ''
                        }`}
                      >
                        {/* Columna: Puesto y características */}
                        <td className="py-3.5 px-3.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-900 flex items-center justify-center font-bold shrink-0 border border-brand-200/50">
                              <BriefcaseIcon className="w-4 h-4 text-brand-800" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-zinc-900 block leading-tight text-xs truncate max-w-[240px]" title={o.titulo}>
                                  {o.titulo}
                                </span>
                                {o.rubro && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded font-medium">
                                    {o.rubro.nombre}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[260px]">
                                {o.tipo_jornada} • {o.vacantes} {o.vacantes === 1 ? 'vacante' : 'vacantes'} • {o.ubicacion}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Columna: Vigencia y fechas */}
                        <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-zinc-800">
                              Creada: {new Date(o.created_at).toLocaleDateString('es-AR')}
                            </div>
                            {o.fecha_limite ? (
                              <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                                {isVencida ? (
                                  <span className="text-rose-700 font-semibold flex items-center gap-1">
                                    <AlertCircleIcon className="w-3 h-3" /> Vencida el {new Date(o.fecha_limite + 'T00:00:00').toLocaleDateString('es-AR')}
                                  </span>
                                ) : isPorVencer ? (
                                  <span className="text-amber-800 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                    Vence en {diasRestantes === 0 ? 'hoy' : `${diasRestantes} días`}
                                  </span>
                                ) : (
                                  <span>Hasta {new Date(o.fecha_limite + 'T00:00:00').toLocaleDateString('es-AR')} ({diasRestantes} días)</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-zinc-400">Sin límite especificado</div>
                            )}
                          </div>
                        </td>

                        {/* Columna: Estado */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="space-y-1">
                            <JobStatusBadge estado={o.estado} isDeleted={isDeleted} />
                            {isRechazada && o.motivo_rechazo && !isDeleted && (
                              <p className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 line-clamp-1" title={o.motivo_rechazo}>
                                Obs: {o.motivo_rechazo}
                              </p>
                            )}
                            {isDeleted && o.motivo_baja && (
                              <p className="text-[10px] text-zinc-500 truncate max-w-[150px]" title={o.motivo_baja}>
                                Baja: {o.motivo_baja}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Columna Acción 1: Candidatos */}
                        <td className="py-3.5 px-1.5 text-center align-middle whitespace-nowrap">
                          {onViewCandidates && !isDeleted ? (
                            isPendiente ? (
                              <div className="relative group inline-flex justify-center w-full">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="h-8 px-2 rounded-lg opacity-60 cursor-not-allowed text-zinc-400 border-zinc-200 text-xs font-bold w-full justify-center"
                                  title="Estará disponible cuando la oferta sea aprobada por la Oficina de Empleo."
                                >
                                  <UsersIcon className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                                  <span>Candidatos</span>
                                </Button>
                                <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end z-50 w-64 shadow-xl">
                                  <div className="bg-zinc-900 text-white text-[11px] font-medium rounded-xl px-3 py-2 text-left shadow-lg leading-relaxed border border-zinc-700">
                                    🔒 Los candidatos estarán disponibles una vez aprobada la oferta por la Oficina de Empleo de Funes.
                                  </div>
                                  <div className="w-2.5 h-2.5 bg-zinc-900 rotate-45 -mt-1.5 mr-6 border-r border-b border-zinc-700" />
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onViewCandidates(o.id)}
                                className="h-8 px-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full"
                              >
                                <UsersIcon className="w-3.5 h-3.5 text-zinc-600" />
                                <span>Ver candidatos</span>
                              </button>
                            )
                          ) : (
                            <span className="text-zinc-300 select-none">-</span>
                          )}
                        </td>

                        {/* Columna Acción 2: Gestión / Edición / Revisión */}
                        <td className="py-3.5 px-1.5 text-center align-middle whitespace-nowrap">
                          {isBorrador && !isDeleted ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                type="button"
                                onClick={() => handleSendToReview(o.id)}
                                disabled={sendingId === o.id}
                                className="h-8 px-2 rounded-lg bg-brand-800 text-white text-xs font-bold hover:bg-brand-900 inline-flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                                title="Enviar oferta para moderación de la Oficina de Empleo"
                              >
                                <SendIcon className="w-3 h-3" />
                                <span>Revisión</span>
                              </button>
                              <Link
                                href={`/empresa/ofertas/${o.id}/editar`}
                                className="h-8 px-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 inline-flex items-center justify-center gap-1 transition-colors"
                                title="Editar datos del borrador"
                              >
                                <PencilIcon className="w-3 h-3" />
                                <span>Editar</span>
                              </Link>
                            </div>
                          ) : isRechazada && !isDeleted ? (
                            <Link
                              href={`/empresa/ofertas/${o.id}/editar`}
                              className="h-8 px-2.5 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold inline-flex items-center justify-center gap-1 shadow-xs transition-colors w-full"
                              title="Corregir observaciones de la Oficina de Empleo"
                            >
                              <PencilIcon className="w-3 h-3" />
                              <span>Corregir</span>
                            </Link>
                          ) : (
                            <span className="text-zinc-300 select-none">-</span>
                          )}
                        </td>

                        {/* Columna Acción 3: Renovar */}
                        <td className="py-3.5 px-1.5 text-center align-middle whitespace-nowrap">
                          {(isPorVencer || isVencida || o.estado === 'finalizada') && !isDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleRenewJob(o.id)}
                              disabled={renewingId === o.id}
                              className="h-8 px-2 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer w-full"
                              title="Renovar publicación por 30 días"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Renovar 30 d</span>
                            </button>
                          ) : (
                            <span className="text-zinc-300 select-none">-</span>
                          )}
                        </td>

                        {/* Columna Acción 4: Dar de baja */}
                        <td className="py-3.5 px-1.5 text-center align-middle whitespace-nowrap">
                          {!isDeleted ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOfertaDeactivate(o);
                                setIsDeactivateModalOpen(true);
                              }}
                              className="h-8 px-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-bold transition-colors cursor-pointer w-full justify-center inline-flex items-center"
                              title="Dar de baja vacante laboral"
                            >
                              <span>Baja</span>
                            </button>
                          ) : (
                            <span className="text-zinc-300 select-none">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredOfertas.length > PAGE_SIZE && (
            <div className="pt-2">
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={filteredOfertas.length}
                pageSize={PAGE_SIZE}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </>
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
