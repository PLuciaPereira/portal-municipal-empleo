'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  PostulacionAdminItem,
  getPostulacionesGestionAdmin,
  cambiarEstadoPostulacionAdmin,
  getCurriculumSignedUrlAdmin,
  coordinarEntrevistaAdmin,
} from '@/lib/admin';
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge';
import { AdminApplicantDetailModal } from './AdminApplicantDetailModal';
import { AdminJobDetailModal } from './AdminJobDetailModal';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Send,
  MapPin,
  Calendar,
  Phone,
  AlertCircle,
  Check,
  Download,
  Briefcase,
  Building2,
  Sparkles,
  Inbox,
  Filter,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';

interface AdminNewApplicationsViewProps {
  onRefreshCounts?: () => void;
  onNavigateToOferta?: (ofertaId: string) => void;
}

type TabFiltro = 'todas' | 'nuevas' | 'en_revision' | 'entrevista';

export function AdminNewApplicationsView({
  onRefreshCounts,
  onNavigateToOferta,
}: AdminNewApplicationsViewProps) {
  const [postulaciones, setPostulaciones] = useState<PostulacionAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<TabFiltro>('nuevas');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  // Resetear a primera página al cambiar filtros o criterio de orden
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, sortOrder]);

  // Modales
  const [selectedPostulanteModal, setSelectedPostulanteModal] = useState<any | null>(null);
  const [selectedOfertaComparativa, setSelectedOfertaComparativa] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOfertaFicha, setSelectedOfertaFicha] = useState<any | null>(null);
  const [isOfertaFichaModalOpen, setIsOfertaFichaModalOpen] = useState(false);

  // Diálogos de acción
  const [targetPostulacion, setTargetPostulacion] = useState<PostulacionAdminItem | null>(null);
  const [isDeriveDialogOpen, setIsDeriveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isScheduleInterviewOpen, setIsScheduleInterviewOpen] = useState(false);

  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getPostulacionesGestionAdmin();
    if (res.data) {
      setPostulaciones(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (!isMounted) return;
      await loadData();
    };
    void fetch();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Contadores por sub-estado
  const counts = useMemo(() => {
    return {
      todas: postulaciones.length,
      nuevas: postulaciones.filter((p) => p.estado === 'postulado').length,
      en_revision: postulaciones.filter(
        (p) => p.estado === 'en_revision' || p.estado === 'preseleccionado'
      ).length,
      entrevista: postulaciones.filter((p) => p.estado === 'entrevista').length,
    };
  }, [postulaciones]);

  // Filtrado reactivo en cliente
  const filteredList = useMemo(() => {
    return postulaciones.filter((p) => {
      // Filtro de pestaña
      if (activeTab === 'nuevas') {
        if (p.estado !== 'postulado') return false;
      } else if (activeTab === 'en_revision') {
        if (p.estado !== 'en_revision' && p.estado !== 'preseleccionado') return false;
      } else if (activeTab === 'entrevista') {
        if (p.estado !== 'entrevista') return false;
      }

      // Filtro de texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const postName = `${p.postulante?.nombre || ''} ${p.postulante?.apellido || ''}`.toLowerCase();
        const dni = (p.postulante?.dni || '').toLowerCase();
        const ofertaTitulo = (p.oferta?.titulo || '').toLowerCase();
        const empresaNombre = (
          p.oferta?.empresa?.nombre_fantasia ||
          p.oferta?.empresa?.razon_social ||
          ''
        ).toLowerCase();
        return (
          postName.includes(q) ||
          dni.includes(q) ||
          ofertaTitulo.includes(q) ||
          empresaNombre.includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'titulo') {
        const nameA = `${a.postulante?.apellido || ''} ${a.postulante?.nombre || ''}`.trim() || a.oferta?.titulo || '';
        const nameB = `${b.postulante?.apellido || ''} ${b.postulante?.nombre || ''}`.trim() || b.oferta?.titulo || '';
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      }
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (sortOrder === 'antiguas') {
        return timeA - timeB;
      }
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [postulaciones, activeTab, searchTerm, sortOrder]);

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, safeCurrentPage, PAGE_SIZE]);

  // Abrir Legajo
  const handleOpenApplicantModal = (post: PostulacionAdminItem) => {
    if (!post.postulante) return;
    setSelectedPostulanteModal({
      ...post.postulante,
      curriculums: post.cv ? [post.cv] : [],
    });
    setSelectedOfertaComparativa(post.oferta || null);
    setIsDetailModalOpen(true);
  };

  // Abrir Ficha de la Oferta Laboral
  const handleOpenOfertaFicha = (oferta: any) => {
    if (!oferta) return;
    setSelectedOfertaFicha(oferta);
    setIsOfertaFichaModalOpen(true);
  };

  // Abrir CV
  const handleOpenCv = async (archivoUrl: string, id: string) => {
    setDownloadingCvId(id);
    const res = await getCurriculumSignedUrlAdmin(archivoUrl);
    setDownloadingCvId(null);
    if (res.url) {
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'No se pudo abrir el currículum.',
      });
    }
  };

  // Pasar a "En revisión" y abrir legajo
  const handleMarcarRevision = async (post: PostulacionAdminItem) => {
    handleOpenApplicantModal(post);
    setActionLoading(true);
    setFeedback(null);
    const res = await cambiarEstadoPostulacionAdmin(post.id, 'en_revision');
    setActionLoading(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `La postulación de ${post.postulante?.nombre} pasó a "En revisión técnica".`,
      });
      void loadData();
      onRefreshCounts?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al cambiar estado.' });
    }
  };

  // Derivar formalmente a la empresa
  const handleInitiateDerive = (post: PostulacionAdminItem) => {
    setTargetPostulacion(post);
    setIsDeriveDialogOpen(true);
  };

  const handleConfirmDerive = async () => {
    if (!targetPostulacion) return;
    setActionLoading(true);
    setFeedback(null);
    const res = await cambiarEstadoPostulacionAdmin(targetPostulacion.id, 'presentado_a_empresa');
    setActionLoading(false);
    setIsDeriveDialogOpen(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `El candidato ${targetPostulacion.postulante?.nombre} fue formalmente derivado a ${
          targetPostulacion.oferta?.empresa?.nombre_fantasia || 'la empresa'
        }.`,
      });
      void loadData();
      onRefreshCounts?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al derivar candidato.' });
    }
  };

  // No derivar
  const handleInitiateReject = (post: PostulacionAdminItem) => {
    setTargetPostulacion(post);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!targetPostulacion) return;
    setActionLoading(true);
    setFeedback(null);
    const res = await cambiarEstadoPostulacionAdmin(targetPostulacion.id, 'no_seleccionado');
    setActionLoading(false);
    setIsRejectDialogOpen(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Se cerró la postulación de ${targetPostulacion.postulante?.nombre} como no seleccionada.`,
      });
      void loadData();
      onRefreshCounts?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al actualizar postulación.' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado descriptivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              Gestión de nuevas postulaciones
            </h2>
            {counts.nuevas > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shadow-xs animate-pulse">
                {counts.nuevas} sin revisar
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Revise los ingresos de postulantes a vacantes de Funes, analice sus antecedentes, coordine entrevistas y derive los perfiles aptos a las empresas solicitantes.
          </p>
        </div>
      </div>

      {/* Banner de feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {/* Barra de Filtros y Búsqueda (Fila Horizontal Idéntica a Ofertas) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        {/* Pestañas de estado a la izquierda */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('nuevas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'nuevas'
                ? 'bg-amber-400 text-zinc-900 font-bold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-zinc-900" />
            Nuevas sin revisar ({counts.nuevas})
          </button>

          <button
            onClick={() => setActiveTab('en_revision')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'en_revision'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            En revisión técnica ({counts.en_revision})
          </button>

          <button
            onClick={() => setActiveTab('entrevista')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'entrevista'
                ? 'bg-purple-100 text-purple-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            Con entrevista ({counts.entrevista})
          </button>

          <button
            onClick={() => setActiveTab('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'todas'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Todas en proceso ({counts.todas})
          </button>
        </div>

        {/* Buscador Rápido y Selector de Orden a la derecha */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64 md:w-72 lg:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por postulante, DNI u oferta..."
              className="pl-9 pr-14 h-10 text-xs w-full bg-zinc-50 border-zinc-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 h-10 rounded-xl border border-zinc-200 text-xs shrink-0">
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

      {/* Tabla de Postulaciones */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm space-y-3">
            <div className="w-8 h-8 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Cargando postulaciones...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                activeTab === 'nuevas'
                  ? 'No hay postulaciones nuevas pendientes de revisión'
                  : 'No se encontraron postulaciones'
              }
              description={
                searchTerm
                  ? 'No hay resultados que coincidan con la búsqueda ingresada.'
                  : activeTab === 'nuevas'
                  ? 'Todas las postulaciones recibidas han sido puestas en revisión o gestionadas.'
                  : 'No existen registros para esta etapa.'
              }
              action={
                searchTerm
                  ? {
                      label: 'Limpiar búsqueda',
                      onClick: () => {
                        setSearchTerm('');
                      },
                      variant: 'outline',
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto scroll-smooth">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Postulante</th>
                  <th className="py-3 px-3">Oferta postulada</th>
                  <th className="py-3 px-3">CV presentado</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Fecha de ingreso</th>
                  {/* Columnas de acción independientes sin títulos de encabezado */}
                  <th className="py-3 px-1.5 w-24 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {paginatedList.map((post) => {
                  const isNueva = post.estado === 'postulado';
                  const isEnRevision =
                    post.estado === 'en_revision' || post.estado === 'preseleccionado';
                  const isEntrevista = post.estado === 'entrevista';

                  return (
                    <tr
                      key={post.id}
                      className={`transition-colors ${
                        isNueva
                          ? 'bg-amber-50/50 hover:bg-amber-100/60 border-l-4 border-l-amber-500'
                          : 'hover:bg-zinc-50/70 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Postulante */}
                      <td className="py-3 px-3.5 font-medium text-zinc-900">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isNueva
                                ? 'bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs'
                                : 'bg-brand-50 text-brand-900'
                            }`}
                          >
                            {post.postulante?.nombre.charAt(0)}
                            {post.postulante?.apellido ? post.postulante.apellido.charAt(0) : ''}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-900 block leading-tight truncate max-w-[170px]">
                                {post.postulante?.nombre} {post.postulante?.apellido || ''}
                              </span>
                              {isNueva && (
                                <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-amber-950 font-extrabold text-[10px] tracking-tight uppercase shadow-2xs">
                                  Nueva
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                              <span className="font-mono">DNI: {post.postulante?.dni || 'S/D'}</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-zinc-400" />
                                {post.postulante?.localidad || 'Funes'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Oferta y Empresa con botón directo para ver ficha */}
                      <td className="py-3 px-3">
                        <div className="min-w-0">
                          {post.oferta ? (
                            <button
                              onClick={() => handleOpenOfertaFicha(post.oferta)}
                              className="font-bold text-zinc-900 hover:text-brand-800 hover:underline block leading-tight text-xs truncate max-w-[210px] text-left cursor-pointer group"
                              title={`Ver requisitos completos de: ${post.oferta.titulo}`}
                            >
                              <span className="flex items-center gap-1 truncate">
                                <span className="truncate">{post.oferta.titulo}</span>
                                <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-brand-700 shrink-0 inline" />
                              </span>
                            </button>
                          ) : (
                            <span className="font-bold text-zinc-900 block leading-tight text-xs truncate max-w-[210px]">
                              Oferta sin título
                            </span>
                          )}
                          <span
                            className="text-[11px] font-medium text-zinc-500 truncate max-w-[210px] mt-0.5 block"
                            title={
                              post.oferta?.empresa?.nombre_fantasia ||
                              post.oferta?.empresa?.razon_social ||
                              'Empresa'
                            }
                          >
                            {post.oferta?.empresa?.nombre_fantasia ||
                              post.oferta?.empresa?.razon_social ||
                              'Empresa'}
                          </span>
                        </div>
                      </td>

                      {/* CV Presentado */}
                      <td className="py-3 px-3">
                        {post.cv ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-zinc-800 font-medium truncate max-w-[110px] text-xs"
                              title={post.cv.nombre_cv}
                            >
                              {post.cv.nombre_cv}
                            </span>
                            <button
                              onClick={() => handleOpenCv(post.cv!.archivo_url, post.cv!.id)}
                              disabled={downloadingCvId === post.cv.id}
                              className="text-brand-800 hover:text-brand-900 p-1 hover:bg-brand-50 rounded-md transition-colors cursor-pointer"
                              title="Ver / Descargar CV"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : post.cv_url_snapshot ? (
                          <span className="text-zinc-500 text-[11px]">Snapshot histórico</span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Sin CV adjunto</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <ApplicationStatusBadge status={post.estado} size="sm" />
                      </td>

                      {/* Fecha de postulación */}
                      <td className="py-3 px-3 text-zinc-600 text-[11px] whitespace-nowrap">
                        <span className="font-semibold block">
                          {new Date(post.created_at).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-zinc-400 text-[10px]">
                          {new Date(post.created_at).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} hs
                        </span>
                      </td>

                      {/* Columna Acción 1: Legajo */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenApplicantModal(post)}
                          className="h-8 px-2.5 text-zinc-600 hover:text-zinc-900 gap-1 text-xs w-full justify-center"
                          title="Ver legajo y antecedentes del postulante"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Legajo</span>
                        </Button>
                      </td>

                      {/* Columna Acción 2: Revisar */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        {isNueva ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarcarRevision(post)}
                            disabled={actionLoading}
                            className="h-8 px-2.5 text-xs text-amber-950 bg-amber-100 hover:bg-amber-200 border-amber-300 font-bold gap-1 shadow-2xs w-full justify-center"
                            title="Poner en revisión y abrir legajo"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Revisar</span>
                          </Button>
                        ) : (
                          <span className="text-zinc-300 select-none">-</span>
                        )}
                      </td>

                      {/* Columna Acción 3: Entrevista */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        {isEnRevision ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTargetPostulacion(post);
                              setIsScheduleInterviewOpen(true);
                            }}
                            className="h-8 px-2.5 text-purple-700 hover:bg-purple-50 gap-1 text-xs w-full justify-center"
                            title="Agendar o registrar entrevista previa"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Entrevista</span>
                          </Button>
                        ) : (
                          <span className="text-zinc-300 select-none">-</span>
                        )}
                      </td>

                      {/* Columna Acción 4: Derivar */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        {(isNueva || isEnRevision || isEntrevista) ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleInitiateDerive(post)}
                            disabled={actionLoading}
                            className="h-8 px-2.5 bg-brand-800 hover:bg-brand-900 text-xs gap-1 shadow-2xs w-full justify-center"
                            title="Derivar formalmente a la empresa"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Derivar</span>
                          </Button>
                        ) : (
                          <span className="text-zinc-300 select-none">-</span>
                        )}
                      </td>

                      {/* Columna Acción 5: No derivar */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        {(isNueva || isEnRevision || isEntrevista) ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleInitiateReject(post)}
                            disabled={actionLoading}
                            className="h-8 px-2.5 text-xs gap-1 w-full justify-center"
                            title="No derivar y finalizar postulación"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>No derivar</span>
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
        {filteredList.length > PAGE_SIZE && (
          <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredList.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal de Legajo del Postulante (con comparativa de requisitos) */}
      {selectedPostulanteModal && (
        <AdminApplicantDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPostulanteModal(null);
            setSelectedOfertaComparativa(null);
          }}
          postulante={selectedPostulanteModal}
          ofertaComparativa={selectedOfertaComparativa}
        />
      )}

      {/* Modal de Ficha Técnica de la Oferta Laboral (Solo Lectura) */}
      {selectedOfertaFicha && (
        <AdminJobDetailModal
          isOpen={isOfertaFichaModalOpen}
          onClose={() => {
            setIsOfertaFichaModalOpen(false);
            setSelectedOfertaFicha(null);
          }}
          oferta={selectedOfertaFicha}
          readOnly={true}
        />
      )}

      {/* Modal de Coordinación de Entrevista Previa */}
      {targetPostulacion && (
        <ScheduleInterviewModal
          isOpen={isScheduleInterviewOpen}
          onClose={() => {
            setIsScheduleInterviewOpen(false);
            setTargetPostulacion(null);
          }}
          postulacionId={targetPostulacion.id}
          postulanteNombre={`${targetPostulacion.postulante?.nombre || ''} ${
            targetPostulacion.postulante?.apellido || ''
          }`}
          ofertaTitulo={targetPostulacion.oferta?.titulo || 'Oferta'}
          onConfirm={async (data) => {
            const res = await coordinarEntrevistaAdmin({
              postulacionId: targetPostulacion.id,
              postulanteId: targetPostulacion.postulante_id,
              ...data,
            });
            if (res.success) {
              setIsScheduleInterviewOpen(false);
              setTargetPostulacion(null);
              void loadData();
              onRefreshCounts?.();
              setFeedback({
                type: 'success',
                message: res.message || 'Entrevista municipal registrada y notificada con éxito.',
              });
            } else {
              setFeedback({
                type: 'error',
                message: res.message || 'Error al agendar entrevista.',
              });
            }
          }}
        />
      )}

      {/* Diálogo de Confirmación: Derivación a la Empresa */}
      <ConfirmDialog
        isOpen={isDeriveDialogOpen}
        onClose={() => setIsDeriveDialogOpen(false)}
        onConfirm={handleConfirmDerive}
        title="¿Derivar candidato formalmente a la empresa?"
        description={`Se presentará a ${targetPostulacion?.postulante?.nombre} a la empresa ${
          targetPostulacion?.oferta?.empresa?.nombre_fantasia || 'solicitante'
        }. La empresa podrá acceder a su currículum y datos de contacto.`}
        confirmText="Confirmar derivación"
        variant="primary"
        isLoading={actionLoading}
      />

      {/* Diálogo de Confirmación: No Derivación */}
      <ConfirmDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        title="¿No derivar postulación a la empresa?"
        description={`La postulación de ${targetPostulacion?.postulante?.nombre} se cerrará en esta búsqueda y se notificará institucionalmente al postulante.`}
        confirmText="No derivar"
        variant="destructive"
        isLoading={actionLoading}
      />
    </div>
  );
}
