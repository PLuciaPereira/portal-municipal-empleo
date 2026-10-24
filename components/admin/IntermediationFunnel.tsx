'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  OfertaAdminItem,
  PostulacionAdminItem,
  getPostulacionesPorOfertaAdmin,
  cambiarEstadoPostulacionAdmin,
  getCurriculumSignedUrlAdmin,
} from '@/lib/admin';
import { ApplicationStatus } from '@/types/database';
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge';
import { AdminApplicantDetailModal } from './AdminApplicantDetailModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Send,
  FileText,
  MapPin,
  Calendar,
  Phone,
  HelpCircle,
  MessageSquare,
  AlertCircle,
  Check,
  Download,
  Info,
} from 'lucide-react';

interface IntermediationFunnelProps {
  oferta: OfertaAdminItem;
  onBack: () => void;
  onUpdated?: () => void;
}

type FunnelFilter = 'todos' | 'postulado' | 'en_revision' | 'entrevista' | 'presentado_a_empresa' | 'no_seleccionado' | 'resueltos_empresa';

export function IntermediationFunnel({
  oferta,
  onBack,
  onUpdated,
}: IntermediationFunnelProps) {
  const [postulaciones, setPostulaciones] = useState<PostulacionAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<FunnelFilter>('todos');
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [selectedPostulanteModal, setSelectedPostulanteModal] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Diálogos de acción
  const [targetPostulacion, setTargetPostulacion] = useState<PostulacionAdminItem | null>(null);
  const [isDeriveDialogOpen, setIsDeriveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [interviewNotes, setInterviewNotes] = useState('');

  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getPostulacionesPorOfertaAdmin(oferta.id);
    if (res.data) {
      setPostulaciones(res.data);
    }
    setLoading(false);
  }, [oferta.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Localidades únicas presentes en los postulantes inscritos a esta oferta
  const localidadesDisponibles = useMemo(() => {
    const set = new Set<string>();
    postulaciones.forEach((p) => {
      if (p.postulante?.localidad && p.postulante.localidad.trim()) {
        set.add(p.postulante.localidad.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [postulaciones]);

  // Contadores por etapa
  const counts = useMemo(() => {
    return {
      todos: postulaciones.length,
      postulado: postulaciones.filter((p) => p.estado === 'postulado').length,
      en_revision: postulaciones.filter((p) => p.estado === 'en_revision' || p.estado === 'preseleccionado').length,
      entrevista: postulaciones.filter((p) => p.estado === 'entrevista').length,
      presentado_a_empresa: postulaciones.filter((p) => p.estado === 'presentado_a_empresa').length,
      no_seleccionado: postulaciones.filter((p) => p.estado === 'no_seleccionado').length,
      resueltos_empresa: postulaciones.filter((p) => p.estado === 'contratado' || p.estado === 'rechazado_por_empresa').length,
    };
  }, [postulaciones]);

  // Filtrado reactivo en cliente
  const filteredList = useMemo(() => {
    return postulaciones.filter((p) => {
      // Filtro de etapa
      if (activeTab === 'postulado') {
        if (p.estado !== 'postulado') return false;
      } else if (activeTab === 'en_revision') {
        if (p.estado !== 'en_revision' && p.estado !== 'preseleccionado') return false;
      } else if (activeTab === 'entrevista') {
        if (p.estado !== 'entrevista') return false;
      } else if (activeTab === 'presentado_a_empresa') {
        if (p.estado !== 'presentado_a_empresa') return false;
      } else if (activeTab === 'no_seleccionado') {
        if (p.estado !== 'no_seleccionado') return false;
      } else if (activeTab === 'resueltos_empresa') {
        if (p.estado !== 'contratado' && p.estado !== 'rechazado_por_empresa') return false;
      }

      // Filtro de Localidad (gestión interna)
      if (selectedLocalidad !== 'todas') {
        if (!p.postulante?.localidad || p.postulante.localidad.toLowerCase() !== selectedLocalidad.toLowerCase()) {
          return false;
        }
      }

      // Filtro de texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const postName = `${p.postulante?.nombre || ''} ${p.postulante?.apellido || ''}`.toLowerCase();
        const dni = (p.postulante?.dni || '').toLowerCase();
        const loc = (p.postulante?.localidad || '').toLowerCase();
        return postName.includes(q) || dni.includes(q) || loc.includes(q);
      }

      return true;
    });
  }, [postulaciones, activeTab, selectedLocalidad, searchTerm]);

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

  // Marcar como Recibido / En revisión técnica
  const handleMarcarRevision = async (post: PostulacionAdminItem) => {
    setActionLoading(true);
    setFeedback(null);
    const res = await cambiarEstadoPostulacionAdmin(post.id, 'en_revision');
    setActionLoading(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `La postulación de ${post.postulante?.nombre} fue marcada como "Recibida / En revisión técnica".`,
      });
      void loadData();
      onUpdated?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al cambiar estado.' });
    }
  };

  // Registrar Entrevista Previa (Opcional)
  const handleOpenInterviewModal = (post: PostulacionAdminItem) => {
    setTargetPostulacion(post);
    setInterviewNotes(post.notas_oficina_empleo || '');
    setIsInterviewDialogOpen(true);
  };

  const handleConfirmInterview = async () => {
    if (!targetPostulacion) return;
    setActionLoading(true);
    setFeedback(null);
    const res = await cambiarEstadoPostulacionAdmin(targetPostulacion.id, 'entrevista', {
      notasOficina: interviewNotes,
    });
    setActionLoading(false);
    setIsInterviewDialogOpen(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Se registró la entrevista previa para ${targetPostulacion.postulante?.nombre}.`,
      });
      void loadData();
      onUpdated?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al registrar entrevista.' });
    }
  };

  // Derivar formalmente a Empresa
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
        message: `El candidato ${targetPostulacion.postulante?.nombre} fue formalmente derivado a ${oferta.empresa?.nombre_fantasia || 'la empresa'}. Ya tiene acceso a sus datos de contacto y CV.`,
      });
      void loadData();
      onUpdated?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al derivar candidato.' });
    }
  };

  // No Derivar / Cierre con aviso exclusivo para el postulante
  const handleInitiateReject = (post: PostulacionAdminItem) => {
    setTargetPostulacion(post);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = async (motivo?: string) => {
    if (!targetPostulacion) return;
    if (!motivo || !motivo.trim()) {
      setFeedback({
        type: 'error',
        message: 'Debe ingresar una observación o aviso obligatorio para el postulante.',
      });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    const res = await cambiarEstadoPostulacionAdmin(targetPostulacion.id, 'no_seleccionado', {
      notasOficina: motivo,
    });
    setActionLoading(false);
    setIsRejectDialogOpen(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Se finalizó la postulación de ${targetPostulacion.postulante?.nombre} ("No Derivado"). El aviso quedó registrado para el postulante y la empresa no tendrá acceso.`,
      });
      void loadData();
      onUpdated?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al registrar la no derivación.' });
    }
  };

  // Abrir Legajo Completo
  const handleOpenApplicantModal = (post: PostulacionAdminItem) => {
    if (!post.postulante) return;
    setSelectedPostulanteModal({
      ...post.postulante,
      rol: 'postulante',
      activo: true,
      deleted_at: null,
      created_at: post.created_at,
      updated_at: post.updated_at,
      curriculums: post.cv ? [post.cv] : [],
    });
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Botón de retorno y Encabezado de la Oferta */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="w-fit gap-1.5 text-xs text-zinc-700 hover:text-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Catálogo de Ofertas
          </Button>

          <Badge variant="emerald" className="w-fit text-xs">
            {postulaciones.length} postulaciones recibidas
          </Badge>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">{oferta.titulo}</h1>
              {oferta.destacada && (
                <Badge variant="amber" className="text-[10px] py-0 px-1.5">
                  Destacada
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
              <span className="flex items-center gap-1 font-semibold text-zinc-800">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                {oferta.empresa?.nombre_fantasia || oferta.empresa?.razon_social || 'Empresa'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                {oferta.rubro?.nombre || 'General'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                {oferta.vacantes} vacante(s)
              </span>
            </div>
          </div>

          <div className="text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 shrink-0">
            <span>Ubicación de la oferta:</span>
            <p className="font-bold text-zinc-900">{oferta.ubicacion || 'Funes'}</p>
          </div>
        </div>
      </div>

      {/* Banner de Feedback */}
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
          <button onClick={() => setFeedback(null)} className="text-xs underline hover:opacity-80">
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Filtros y Etapas del Embudo */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        {/* Pestañas de Etapas del Proceso */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'todos'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Todos ({counts.todos})
          </button>

          <button
            onClick={() => setActiveTab('postulado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'postulado'
                ? 'bg-blue-100/80 text-blue-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Nuevos Postulados ({counts.postulado})
          </button>

          <button
            onClick={() => setActiveTab('en_revision')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'en_revision'
                ? 'bg-amber-100/80 text-amber-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            En Revisión Técnica ({counts.en_revision})
          </button>

          <button
            onClick={() => setActiveTab('entrevista')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'entrevista'
                ? 'bg-purple-100/80 text-purple-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            Con Entrevista Previa ({counts.entrevista})
          </button>

          <button
            onClick={() => setActiveTab('presentado_a_empresa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'presentado_a_empresa'
                ? 'bg-brand-100/80 text-brand-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-brand-800" />
            Derivados a Empresa ({counts.presentado_a_empresa})
          </button>

          <button
            onClick={() => setActiveTab('no_seleccionado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'no_seleccionado'
                ? 'bg-zinc-200 text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-zinc-600" />
            No Derivados ({counts.no_seleccionado})
          </button>

          <button
            onClick={() => setActiveTab('resueltos_empresa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'resueltos_empresa'
                ? 'bg-emerald-100/80 text-emerald-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Resueltos por Empresa ({counts.resueltos_empresa})
          </button>
        </div>

        {/* Buscador y Filtro por Localidad */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar postulante por nombre o DNI..."
              className="pl-9 h-10 text-xs w-full bg-zinc-50 border-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500 font-medium">Localidad:</span>
              <select
                value={selectedLocalidad}
                onChange={(e) => setSelectedLocalidad(e.target.value)}
                className="bg-transparent text-zinc-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="todas">Todas las localidades</option>
                {localidadesDisponibles.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {(selectedLocalidad !== 'todas' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedLocalidad('todas');
                  setSearchTerm('');
                }}
                className="text-xs text-brand-800 hover:underline px-2 py-1 font-semibold"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla del Embudo de Postulantes */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm space-y-3">
            <div className="w-8 h-8 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Cargando postulaciones de la oferta...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No hay postulaciones para este filtro"
              description={
                searchTerm || selectedLocalidad !== 'todas'
                  ? 'No se encontraron postulantes que coincidan con la búsqueda o localidad seleccionada.'
                  : 'Aún no hay postulaciones en esta etapa del proceso.'
              }
              action={
                searchTerm || selectedLocalidad !== 'todas'
                  ? {
                      label: 'Limpiar filtros',
                      onClick: () => {
                        setSelectedLocalidad('todas');
                        setSearchTerm('');
                      },
                      variant: 'outline',
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Postulante</th>
                  <th className="py-3.5 px-4">Localidad & Contacto</th>
                  <th className="py-3.5 px-4">CV Utilizado</th>
                  <th className="py-3.5 px-4">Estado Actual</th>
                  <th className="py-3.5 px-4">Fecha Postulación</th>
                  <th className="py-3.5 px-4 text-right">Intermediación / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredList.map((post) => {
                  const estado = post.estado;
                  const isPostulado = estado === 'postulado';
                  const isEnRevision = estado === 'en_revision' || estado === 'preseleccionado';
                  const isEntrevista = estado === 'entrevista';
                  const isDerivado = estado === 'presentado_a_empresa';
                  const isNoDerivado = estado === 'no_seleccionado';
                  const isResueltoEmpresa = estado === 'contratado' || estado === 'rechazado_por_empresa';

                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-zinc-50/60 transition-colors group"
                    >
                      {/* Postulante */}
                      <td className="py-3.5 px-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-900 flex items-center justify-center font-bold text-xs shrink-0">
                            {post.postulante?.nombre.charAt(0)}
                            {post.postulante?.apellido ? post.postulante.apellido.charAt(0) : ''}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block leading-tight">
                              {post.postulante?.nombre} {post.postulante?.apellido || ''}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono block">
                              DNI: {post.postulante?.dni || 'Sin DNI'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Localidad & Contacto */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1 font-semibold text-zinc-800">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{post.postulante?.localidad || 'Funes'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{post.postulante?.telefono || 'Sin teléfono'}</span>
                        </div>
                      </td>

                      {/* CV Utilizado */}
                      <td className="py-3.5 px-4">
                        {post.cv ? (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-800 font-medium truncate max-w-[120px]">
                              {post.cv.nombre_cv}
                            </span>
                            <button
                              onClick={() => handleOpenCv(post.cv!.archivo_url, post.cv!.id)}
                              disabled={downloadingCvId === post.cv.id}
                              className="text-brand-800 hover:text-brand-900 p-1 hover:bg-brand-50 rounded-md transition-colors"
                              title="Ver CV"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : post.cv_url_snapshot ? (
                          <span className="text-zinc-500 text-[11px]">Snapshot histórico</span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Sin CV</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 space-y-1">
                        <ApplicationStatusBadge status={post.estado} size="sm" />
                        {post.fecha_derivacion && isDerivado && (
                          <span className="text-[10px] text-zinc-400 block">
                            Derivado: {new Date(post.fecha_derivacion).toLocaleDateString('es-AR')}
                          </span>
                        )}
                        {post.motivo_rechazo_empresa && estado === 'rechazado_por_empresa' && (
                          <span className="text-[10px] text-rose-700 block truncate max-w-[150px]" title={post.motivo_rechazo_empresa}>
                            Motivo: {post.motivo_rechazo_empresa}
                          </span>
                        )}
                        {post.notas_oficina_empleo && isNoDerivado && (
                          <span className="text-[10px] text-zinc-600 block truncate max-w-[150px]" title={post.notas_oficina_empleo}>
                            Aviso: {post.notas_oficina_empleo}
                          </span>
                        )}
                      </td>

                      {/* Fecha de Postulación */}
                      <td className="py-3.5 px-4 text-zinc-500 text-[11px] whitespace-nowrap">
                        {new Date(post.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Acciones de Intermediación */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Ver Legajo */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenApplicantModal(post)}
                            className="h-8 px-2 text-zinc-600 hover:text-zinc-900 gap-1 text-xs"
                            title="Ver legajo completo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Legajo</span>
                          </Button>

                          {/* 1. Paso a En Revisión si está en Postulado */}
                          {isPostulado && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarcarRevision(post)}
                              disabled={actionLoading}
                              className="h-8 px-2.5 text-xs text-amber-800 hover:bg-amber-50 gap-1 border-amber-200"
                              title="Marcar como recibido y en revisión técnica"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Revisar</span>
                            </Button>
                          )}

                          {/* 2. Registrar Entrevista Previa (Opcional, si está en revisión) */}
                          {(isEnRevision || isPostulado) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenInterviewModal(post)}
                              className="h-8 px-2 text-purple-700 hover:bg-purple-50 gap-1 text-xs"
                              title="Registrar entrevista de orientación previa (opcional)"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Entrevista</span>
                            </Button>
                          )}

                          {/* 3. Derivar formalmente a la Empresa si está en revisión o entrevista */}
                          {(isEnRevision || isEntrevista || isPostulado) && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleInitiateDerive(post)}
                              className="h-8 px-2.5 bg-brand-800 hover:bg-brand-900 text-xs gap-1"
                              title="Derivar formalmente a la empresa"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Derivar</span>
                            </Button>
                          )}

                          {/* 4. No Derivar (Cierre con aviso exclusivo para el postulante) */}
                          {!isNoDerivado && !isResueltoEmpresa && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleInitiateReject(post)}
                              className="h-8 px-2 text-xs gap-1"
                              title="No derivar a empresa y cerrar postulación con aviso al postulante"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">No Derivar</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ConfirmDialog: Derivación a la Empresa */}
      <ConfirmDialog
        isOpen={isDeriveDialogOpen}
        onClose={() => setIsDeriveDialogOpen(false)}
        onConfirm={handleConfirmDerive}
        title="¿Derivar candidato formalmente a la empresa?"
        description={
          targetPostulacion
            ? `El postulante "${targetPostulacion.postulante?.nombre} ${targetPostulacion.postulante?.apellido || ''}" pasará al estado "Derivado a la empresa". A partir de este momento, la empresa "${oferta.empresa?.nombre_fantasia || 'solicitante'}" podrá acceder a sus datos de contacto y CV para coordinar la evaluación o entrevista.`
            : ''
        }
        confirmText="Confirmar Derivación"
        variant="primary"
        isLoading={actionLoading}
      />

      {/* ConfirmDialog: No Derivar con Aviso Obligatorio para el Postulante */}
      <ConfirmDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        title="No derivar postulación a la empresa"
        description={
          targetPostulacion
            ? `Indique el motivo u observación de la no derivación para ${targetPostulacion.postulante?.nombre}. Este aviso será visible exclusivamente para el postulante en su portal de seguimiento, finalizando esta postulación. La empresa nunca tendrá acceso a este registro.`
            : ''
        }
        confirmText="Confirmar Cierre"
        variant="destructive"
        requireReason={true}
        reasonLabel="Aviso u Observación para el Postulante (Obligatorio)"
        reasonPlaceholder="Ej: El perfil no cumple con los requisitos técnicos exigidos para el puesto / Se priorizaron candidatos con experiencia previa..."
        isLoading={actionLoading}
      />

      {/* Modal Auxiliar: Registro de Entrevista Previa (Opcional) */}
      {isInterviewDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900">
                Registrar Entrevista Previa (Opcional)
              </h2>
              <p className="text-xs text-zinc-500">
                Pase a la instancia de evaluación preliminar para {targetPostulacion?.postulante?.nombre}. Puede asentar notas internas confidenciales de la Oficina de Empleo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Notas Confidenciales de la Oficina de Empleo
              </label>
              <textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Ej: Se coordinó entrevista telefónica para el día martes. Perfil con buena predisposición y disponibilidad inmediata..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInterviewDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmInterview}
                disabled={actionLoading}
                className="bg-brand-800 hover:bg-brand-900"
              >
                {actionLoading ? 'Registrando...' : 'Confirmar Entrevista'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Legajo del Postulante */}
      <AdminApplicantDetailModal
        postulante={selectedPostulanteModal}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}
