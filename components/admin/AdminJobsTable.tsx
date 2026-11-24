'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { OfertaAdminItem } from '@/lib/admin';
import { JobStatus } from '@/types/database';
import { JobStatusBadge } from '@/components/empresa/JobStatusBadge';
import { AdminJobDetailModal } from './AdminJobDetailModal';
import { InviteCandidateToJobModal } from './InviteCandidateToJobModal';
import { PostulanteAdminItem } from '@/lib/admin';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import {
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  Check,
  Star,
  BadgeAlert,
  UserPlus,
  ArrowUpDown,
} from 'lucide-react';
import {
  aprobarOfertaAdmin,
  rechazarOfertaAdmin,
  darDeBajaOfertaAdmin,
  toggleDestacadaOfertaAdmin,
} from '@/lib/admin';

interface AdminJobsTableProps {
  ofertas: OfertaAdminItem[];
  postulantesDisponibles?: PostulanteAdminItem[];
  loading?: boolean;
  onRefresh: () => void;
  onSelectOfertaPostulaciones?: (ofertaId: string) => void;
}

type FilterEstado = JobStatus | 'todas' | 'bajas';

export function AdminJobsTable({
  ofertas,
  postulantesDisponibles = [],
  loading,
  onRefresh,
  onSelectOfertaPostulaciones,
}: AdminJobsTableProps) {
  const [filterEstado, setFilterEstado] = useState<FilterEstado>('pendiente_revision');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 5;

  // Resetear a primera página al cambiar filtros o criterio de orden
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, sortOrder]);

  // Modales
  const [selectedOferta, setSelectedOferta] = useState<OfertaAdminItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [ofertaToInvitePostulante, setOfertaToInvitePostulante] = useState<OfertaAdminItem | null>(null);
  const [isInviteCandidateModalOpen, setIsInviteCandidateModalOpen] = useState(false);

  const [ofertaToApprove, setOfertaToApprove] = useState<OfertaAdminItem | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const [ofertaToReject, setOfertaToReject] = useState<OfertaAdminItem | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const [ofertaToDeactivate, setOfertaToDeactivate] = useState<OfertaAdminItem | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

  // Estados de acción
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Filtrado reactivo en cliente
  const filteredOfertas = useMemo(() => {
    return ofertas.filter((of) => {
      const isDeleted = Boolean(of.deleted_at);

      if (filterEstado === 'bajas') {
        if (!isDeleted || of.estado === 'borrador') return false;
      } else if (filterEstado !== 'todas') {
        if (isDeleted || of.estado !== filterEstado) return false;
      } else {
        // En "todas", tampoco mostrar borradores dados de baja que nunca llegaron al municipio
        if (isDeleted && of.estado === 'borrador') return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitulo = (of.titulo || '').toLowerCase().includes(q);
        const matchesEmpresa = (
          of.empresa?.nombre_fantasia ||
          of.empresa?.razon_social ||
          ''
        )
          .toLowerCase()
          .includes(q);
        const matchesRubro = (of.rubro?.nombre || '').toLowerCase().includes(q);
        const matchesUbicacion = (of.ubicacion || '').toLowerCase().includes(q);
        const matchesJornada = (of.tipo_jornada || '').toLowerCase().includes(q);
        const matchesContrato = (of.tipo_contrato || '').toLowerCase().includes(q);
        const matchesRequisitos = (of.requisitos || '').toLowerCase().includes(q);
        const matchesDescripcion = (of.descripcion || '').toLowerCase().includes(q);
        const matchesExp = (of.experiencia_requerida || '').toLowerCase().includes(q);
        return (
          matchesTitulo ||
          matchesEmpresa ||
          matchesRubro ||
          matchesUbicacion ||
          matchesJornada ||
          matchesContrato ||
          matchesRequisitos ||
          matchesDescripcion ||
          matchesExp
        );
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'titulo') {
        return (a.titulo || '').localeCompare(b.titulo || '', 'es', { sensitivity: 'base' });
      }
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (sortOrder === 'antiguas') {
        return timeA - timeB;
      }
      // 'recientes' predeterminado por fecha de creación descendente
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [ofertas, filterEstado, searchTerm, sortOrder]);

  const totalPages = Math.ceil(filteredOfertas.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOfertas = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredOfertas.slice(start, start + PAGE_SIZE);
  }, [filteredOfertas, safeCurrentPage, PAGE_SIZE]);

  // Contadores por filtro
  const counts = useMemo(() => {
    return {
      todas: ofertas.length,
      pendientes: ofertas.filter(
        (o) => o.estado === 'pendiente_revision' && !o.deleted_at
      ).length,
      publicadas: ofertas.filter((o) => o.estado === 'publicada' && !o.deleted_at).length,
      rechazadas: ofertas.filter((o) => o.estado === 'rechazada' && !o.deleted_at).length,
      // Las bajas en el panel municipal solo consideran ofertas que ya estuvieron en circuito (no borradores privados)
      bajas: ofertas.filter((o) => Boolean(o.deleted_at) && o.estado !== 'borrador').length,
    };
  }, [ofertas]);

  // Manejar apertura de detalle
  const handleOpenDetail = (oferta: OfertaAdminItem) => {
    setSelectedOferta(oferta);
    setIsDetailModalOpen(true);
  };

  // Aprobar
  const handleInitiateApprove = (oferta: OfertaAdminItem) => {
    setOfertaToApprove(oferta);
    setIsApproveDialogOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!ofertaToApprove) return;
    setActionLoading(true);
    setFeedback(null);

    const res = await aprobarOfertaAdmin(ofertaToApprove.id);
    setActionLoading(false);
    setIsApproveDialogOpen(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `La oferta "${ofertaToApprove.titulo}" fue aprobada y ya está disponible públicamente en el catálogo.`,
      });
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      onRefresh();
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'No se pudo aprobar la oferta laboral.',
      });
    }
  };

  // Rechazar
  const handleInitiateReject = (oferta: OfertaAdminItem) => {
    setOfertaToReject(oferta);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = async (motivo?: string) => {
    if (!ofertaToReject) return;
    if (!motivo || !motivo.trim()) {
      setFeedback({
        type: 'error',
        message: 'Debe ingresar un motivo obligatorio para el rechazo.',
      });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    const res = await rechazarOfertaAdmin(ofertaToReject.id, motivo);
    setActionLoading(false);
    setIsRejectDialogOpen(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `La oferta "${ofertaToReject.titulo}" fue rechazada y se notificó el motivo a la empresa.`,
      });
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      onRefresh();
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'No se pudo procesar el rechazo de la oferta.',
      });
    }
  };

  // Dar de baja
  const handleInitiateDeactivate = (oferta: OfertaAdminItem) => {
    setOfertaToDeactivate(oferta);
    setIsDeactivateDialogOpen(true);
  };

  const handleConfirmDeactivate = async (motivo?: string) => {
    if (!ofertaToDeactivate) return;
    if (!motivo || !motivo.trim()) {
      setFeedback({
        type: 'error',
        message: 'Debe ingresar un motivo obligatorio para la baja de la oferta.',
      });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    const res = await darDeBajaOfertaAdmin(ofertaToDeactivate.id, motivo);
    setActionLoading(false);
    setIsDeactivateDialogOpen(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `La oferta "${ofertaToDeactivate.titulo}" fue dada de baja lógicamente (su historial y postulaciones quedan preservados).`,
      });
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      onRefresh();
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'No se pudo dar de baja la oferta.',
      });
    }
  };

  // Alternar Destacada
  const handleToggleHighlight = async (oferta: OfertaAdminItem) => {
    const nuevoEstado = !oferta.destacada;
    const res = await toggleDestacadaOfertaAdmin(oferta.id, nuevoEstado);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: nuevoEstado
          ? `La oferta "${oferta.titulo}" ahora figura como Destacada en la portada.`
          : `Se removió el destaque de la oferta "${oferta.titulo}".`,
      });
      onRefresh();
      if (selectedOferta?.id === oferta.id) {
        setSelectedOferta({ ...selectedOferta, destacada: nuevoEstado });
      }
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'No se pudo actualizar el destaque de la oferta.',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Mensaje de feedback */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-zinc-200 shadow-xs mb-3">
        {/* Pestañas de estado */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-lg overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterEstado('pendiente_revision')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'pendiente_revision'
                ? counts.pendientes > 0
                  ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300/80 shadow-xs ring-1 ring-amber-400/20'
                  : 'bg-white text-zinc-900 shadow-xs'
                : counts.pendientes > 0
                ? 'bg-amber-50/80 text-amber-900 hover:bg-amber-100/80 border border-amber-200/70'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock
              className={`w-3.5 h-3.5 ${
                counts.pendientes > 0 ? 'text-amber-700' : 'text-zinc-500'
              }`}
            />
            <span>Pendientes</span>
            {counts.pendientes > 0 ? (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shadow-2xs ${
                  filterEstado === 'pendiente_revision'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-200 text-amber-950'
                }`}
              >
                {counts.pendientes}
              </span>
            ) : (
              <span className="text-zinc-400 font-normal">({counts.pendientes})</span>
            )}
          </button>

          <button
            onClick={() => setFilterEstado('publicada')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'publicada'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Publicadas ({counts.publicadas})
          </button>

          <button
            onClick={() => setFilterEstado('rechazada')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'rechazada'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rechazadas ({counts.rechazadas})
          </button>

          <button
            onClick={() => setFilterEstado('bajas')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'bajas'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <BadgeAlert className="w-3.5 h-3.5 text-zinc-600" />
            Dadas de Baja ({counts.bajas})
          </button>

          <button
            onClick={() => setFilterEstado('todas')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filterEstado === 'todas'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Todas ({counts.todas})
          </button>
        </div>

        {/* Buscador y Selector Compacto de Orden */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por puesto, empresa, rubro, requisitos o localidad..."
              className="pl-8 h-8 text-xs w-full bg-zinc-50 border-zinc-200"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 px-2 h-8 rounded-lg border border-zinc-200 text-xs shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-medium hidden sm:inline">Orden:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'recientes' | 'antiguas' | 'titulo')}
              className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="recientes">Más reciente primero</option>
              <option value="antiguas">Más antiguo primero</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Ofertas */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : filteredOfertas.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                filterEstado === 'pendiente_revision'
                  ? 'No hay ofertas pendientes de revisión'
                  : 'No se encontraron ofertas laborales'
              }
              description={
                searchTerm
                  ? `No hay ofertas que coincidan con la búsqueda "${searchTerm}".`
                  : filterEstado === 'pendiente_revision'
                  ? 'Todas las ofertas enviadas por empresas han sido moderadas.'
                  : 'No existen registros de ofertas para este filtro.'
              }
              action={
                searchTerm
                  ? {
                      label: 'Limpiar búsqueda',
                      onClick: () => setSearchTerm(''),
                      variant: 'outline',
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto scroll-smooth">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Puesto y empresa</th>
                  <th className="py-3 px-3">Rubro y modalidad</th>
                  <th className="py-3 px-3">Vacantes y postulaciones</th>
                  <th className="py-3 px-3">Estado</th>
                  {/* Columnas independientes para cada acción sin título de texto */}
                  <th className="py-3 px-1.5 w-24 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {paginatedOfertas.map((of) => {
                  const isBaja = Boolean(of.deleted_at);
                  const isPendiente = of.estado === 'pendiente_revision' && !isBaja;
                  const isPublicada = of.estado === 'publicada' && !isBaja;

                  return (
                    <tr
                      key={of.id}
                      className="hover:bg-zinc-50/60 transition-colors group"
                    >
                      {/* Puesto y empresa */}
                      <td className="py-3 px-3.5 font-medium text-zinc-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-900 flex items-center justify-center font-bold shrink-0 border border-brand-200/50">
                            <Briefcase className="w-4 h-4 text-brand-800" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-900 block leading-tight text-xs truncate max-w-[220px]" title={of.titulo}>
                                {of.titulo}
                              </span>
                              {of.destacada && !isBaja && (
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] font-medium text-zinc-500 truncate max-w-[220px] mt-0.5" title={of.empresa?.nombre_fantasia || of.empresa?.razon_social || 'Empresa'}>
                              {of.empresa?.nombre_fantasia || of.empresa?.razon_social || 'Empresa'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rubro y modalidad */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-zinc-800 block text-xs truncate max-w-[170px]" title={of.rubro?.nombre || 'General'}>
                          {of.rubro?.nombre || 'General'}
                        </span>
                        <div className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[170px]">
                          {of.tipo_jornada}
                        </div>
                      </td>

                      {/* Vacantes y postulaciones */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-zinc-800">
                          {of.vacantes} {of.vacantes === 1 ? 'vacante' : 'vacantes'}
                        </span>
                        <span className="text-zinc-400 mx-1">·</span>
                        <span className="text-xs text-zinc-500 font-medium">
                          {of.postulaciones_count || 0} postulaciones
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <JobStatusBadge estado={of.estado} isDeleted={isBaja} />
                      </td>

                      {/* Columna Acción 1: Ficha */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(of)}
                          className="h-8 px-2.5 text-zinc-600 hover:text-zinc-900 gap-1 text-xs w-full justify-center"
                          title="Ver ficha completa de la oferta"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ficha</span>
                        </Button>
                      </td>

                      {/* Columna Acción 2: Aprobar */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        {isPendiente ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleInitiateApprove(of)}
                            className="h-8 px-2.5 bg-brand-800 hover:bg-brand-900 text-xs gap-1 w-full justify-center"
                            title="Aprobar y publicar oferta"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </Button>
                        ) : (
                          <span className="text-zinc-300 select-none">-</span>
                        )}
                      </td>

                      {/* Columna Acción 3: Rechazar / Baja */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        {isPendiente ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleInitiateReject(of)}
                            className="h-8 px-2.5 text-xs gap-1 w-full justify-center"
                            title="Rechazar oferta"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </Button>
                        ) : isPublicada ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleInitiateDeactivate(of)}
                            className="h-8 px-2.5 text-xs gap-1 w-full justify-center"
                            title="Dar de baja oferta pública"
                          >
                            <BadgeAlert className="w-3.5 h-3.5" />
                            <span>Dar de baja</span>
                          </Button>
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
        )}

        {/* Paginación */}
        {filteredOfertas.length > PAGE_SIZE && (
          <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredOfertas.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal de Detalle Completo de la Oferta */}
            <InviteCandidateToJobModal
        isOpen={isInviteCandidateModalOpen}
        oferta={ofertaToInvitePostulante}
        postulantesDisponibles={postulantesDisponibles}
        onClose={() => {
          setIsInviteCandidateModalOpen(false);
          setOfertaToInvitePostulante(null);
        }}
        onSuccess={() => {
          onRefresh();
        }}
      />

      <AdminJobDetailModal
        oferta={selectedOferta}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onApprove={(of) => {
          setIsDetailModalOpen(false);
          handleInitiateApprove(of);
        }}
        onReject={(of) => {
          setIsDetailModalOpen(false);
          handleInitiateReject(of);
        }}
        onDeactivate={(of) => {
          setIsDetailModalOpen(false);
          handleInitiateDeactivate(of);
        }}
        onToggleHighlight={(of) => handleToggleHighlight(of)}
      />

      {/* ConfirmDialog: Aprobación */}
      <ConfirmDialog
        isOpen={isApproveDialogOpen}
        onClose={() => setIsApproveDialogOpen(false)}
        onConfirm={handleConfirmApprove}
        title="¿Aprobar y publicar la oferta laboral?"
        description={
          ofertaToApprove
            ? `La oferta "${ofertaToApprove.titulo}" pasará a estar pública inmediatamente en el catálogo general. Cualquier postulante registrado podrá enviar su postulación.`
            : ''
        }
        confirmText="Aprobar y Publicar"
        variant="primary"
        isLoading={actionLoading}
      />

      {/* ConfirmDialog: Rechazo con Motivo Obligatorio */}
      <ConfirmDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        title="Rechazar oferta laboral"
        description={
          ofertaToReject
            ? `Ingrese el motivo formal por el cual se rechaza la oferta "${ofertaToReject.titulo}". Este motivo quedará registrado institucionalmente y será notificado a la empresa.`
            : ''
        }
        confirmText="Confirmar Rechazo"
        variant="destructive"
        requireReason={true}
        reasonLabel="Motivo del Rechazo (Obligatorio)"
        reasonPlaceholder="Ej: El puesto no detalla jornada laboral o los requisitos son incompatibles con la normativa..."
        isLoading={actionLoading}
      />

      {/* ConfirmDialog: Dar de baja con Motivo Obligatorio */}
      <ConfirmDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => setIsDeactivateDialogOpen(false)}
        onConfirm={handleConfirmDeactivate}
        title="Dar de baja oferta laboral"
        description={
          ofertaToDeactivate
            ? `La oferta "${ofertaToDeactivate.titulo}" dejará de estar visible públicamente y no admitirá nuevas postulaciones. Su historial y los postulantes inscritos se conservarán intactos en la base de datos.`
            : ''
        }
        confirmText="Confirmar Baja"
        variant="destructive"
        requireReason={true}
        reasonLabel="Motivo de la Baja (Obligatorio)"
        reasonPlaceholder="Ej: Vacantes cubiertas por intermediación municipal / Solicitud expresa de la empresa empleadora..."
        isLoading={actionLoading}
      />
    </div>
  );
}
