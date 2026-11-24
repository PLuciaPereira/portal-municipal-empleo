'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PostulacionConDetalle,
  withdrawApplication,
  getCurriculumSignedUrl,
} from '@/lib/postulante';
import { getApplicationStatusConfig } from '@/components/applications/ApplicationStatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
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
  ArrowUpDown,
} from 'lucide-react';

import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';

export type FilterEstadoPostulacion = 'todas' | 'postulado' | 'en_revision' | 'contratado' | 'rechazado';

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
  const searchParams = useSearchParams();
  const highlightedPostulacionId = searchParams.get('postulacionId');
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    return highlightedPostulacionId || null;
  });

  useEffect(() => {
    if (highlightedPostulacionId) {
      setExpandedId(highlightedPostulacionId);
      // Desplazar suavemente hacia la tarjeta correspondiente
      setTimeout(() => {
        const el = document.getElementById(`postulacion-${highlightedPostulacionId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [highlightedPostulacionId]);
  const [appToWithdraw, setAppToWithdraw] = useState<PostulacionConDetalle | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [openingCvId, setOpeningCvId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [sortOrder, setSortOrder] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');
  const [filterEstado, setFilterEstado] = useState<FilterEstadoPostulacion>('todas');
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const activeCount = applications.filter(
    (app) => app.estado !== 'retirado_por_postulante'
  ).length;

  // Conteo de postulaciones por estado para los chips de filtro
  const counts = useMemo(() => {
    let postulado = 0;
    let enRevision = 0;
    let contratado = 0;
    let rechazado = 0;

    for (const app of applications) {
      if (app.estado === 'contratado' || app.estado === 'seleccionado') {
        contratado++;
      } else if (
        app.estado === 'rechazado_por_empresa' ||
        app.estado === 'no_seleccionado' ||
        (app.estado as string) === 'no_derivado'
      ) {
        rechazado++;
      } else if (app.estado === 'postulado') {
        postulado++;
      } else if (app.estado !== 'retirado_por_postulante') {
        enRevision++;
      }
    }

    return {
      todas: applications.length,
      postulado,
      en_revision: enRevision,
      contratado,
      rechazado,
    };
  }, [applications]);

  const sortedApplications = useMemo(() => {
    return [...applications]
      .filter((app) => {
        if (filterEstado === 'todas') return true;

        const isRechazado =
          app.estado === 'rechazado_por_empresa' ||
          app.estado === 'no_seleccionado' ||
          (app.estado as string) === 'no_derivado';
        const isContratado = app.estado === 'contratado' || app.estado === 'seleccionado';
        const isRetirado = app.estado === 'retirado_por_postulante';
        const isPostulado = app.estado === 'postulado';
        const isEnRevision = !isRechazado && !isContratado && !isRetirado && !isPostulado;

        if (filterEstado === 'postulado') return isPostulado;
        if (filterEstado === 'contratado') return isContratado;
        if (filterEstado === 'rechazado') return isRechazado;
        if (filterEstado === 'en_revision') return isEnRevision;

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'titulo') {
          const titA = a.oferta?.titulo || '';
          const titB = b.oferta?.titulo || '';
          return titA.localeCompare(titB, 'es', { sensitivity: 'base' });
        }
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return sortOrder === 'recientes' ? timeB - timeA : timeA - timeB;
      });
  }, [applications, sortOrder, filterEstado]);

  const totalPages = Math.ceil(sortedApplications.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedApplications = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return sortedApplications.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedApplications, safeCurrentPage]);

  // Si viene una postulación destacada por URL, posicionar en su página y expandir
  useEffect(() => {
    if (highlightedPostulacionId && sortedApplications.length > 0) {
      const targetIndex = sortedApplications.findIndex(
        (app) => app.id === highlightedPostulacionId
      );
      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / PAGE_SIZE) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [highlightedPostulacionId, sortedApplications]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
    <section className="space-y-4">
      {/* 1. Encabezado de la Sección */}
      <div className="pb-3 border-b border-zinc-200">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-sans">
            Mis Postulaciones e Historial de Seguimiento
          </h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E4F1E8] text-[#0A3D2A]">
            {activeCount} {activeCount === 1 ? 'activa' : 'activas'}
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[#5A7064]">
          Accedé a toda la información sobre tus postulaciones y el estado de cada proceso.
        </p>
      </div>

      {/* 2. Barra de Filtros por Estado y Selector de Orden */}
      {applications.length > 0 && (
        <div className="bg-zinc-50/80 rounded-xl p-2.5 sm:p-3 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Chips de Filtro por Estado (reutilizando el diseño canónico de CandidatesTable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setFilterEstado('todas');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterEstado === 'todas'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Todas</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                  filterEstado === 'todas' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {counts.todas}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterEstado('postulado');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterEstado === 'postulado'
                  ? 'bg-[#174F93] text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Postulado</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                  filterEstado === 'postulado' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {counts.postulado}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterEstado('en_revision');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterEstado === 'en_revision'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>En revisión</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                  filterEstado === 'en_revision' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {counts.en_revision}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterEstado('contratado');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterEstado === 'contratado'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Contratado</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                  filterEstado === 'contratado' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {counts.contratado}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterEstado('rechazado');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterEstado === 'rechazado'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Rechazado</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                  filterEstado === 'rechazado' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {counts.rechazado}
              </span>
            </button>
          </div>

          {/* Selector Compacto de Orden */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 h-8.5 rounded-xl border border-zinc-200 text-xs shrink-0 shadow-2xs self-start md:self-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-medium">Orden:</span>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'recientes' | 'antiguas' | 'titulo');
                setCurrentPage(1);
              }}
              aria-label="Ordenar postulaciones"
              className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="recientes">Más reciente primero</option>
              <option value="antiguas">Más antiguo primero</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
        </div>
      )}

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
        <div className="space-y-4 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`app-skel-${i}`}
              className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3 rounded-lg" />
                  <Skeleton className="h-4 w-1/4 rounded-md bg-zinc-100" />
                </div>
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
              <div className="pt-2 flex items-center gap-3">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </div>
          ))}
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
      ) : sortedApplications.length === 0 ? (
        <div className="mt-6 p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
          <BriefcaseIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700">
            {filterEstado === 'postulado' && 'No tenés postulaciones recientes en estado postulado.'}
            {filterEstado === 'en_revision' && 'No tenés postulaciones en revisión en este momento.'}
            {filterEstado === 'contratado' && 'Aún no contás con postulaciones en estado contratado.'}
            {filterEstado === 'rechazado' && 'No tenés postulaciones rechazadas o finalizadas.'}
            {filterEstado === 'todas' && 'No se encontraron postulaciones.'}
          </p>
          {filterEstado !== 'todas' && (
            <button
              type="button"
              onClick={() => {
                setFilterEstado('todas');
                setCurrentPage(1);
              }}
              className="mt-3 inline-flex items-center text-xs font-semibold text-[#0E4D36] hover:underline cursor-pointer"
            >
              Ver todas las postulaciones
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {paginatedApplications.map((app) => {
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

            // Clasificación canónica en los 4 estados principales del postulante
            const isRechazado =
              app.estado === 'rechazado_por_empresa' ||
              app.estado === 'no_seleccionado' ||
              (app.estado as string) === 'no_derivado';
            const isContratado = app.estado === 'contratado' || app.estado === 'seleccionado';
            const isRetirado = app.estado === 'retirado_por_postulante';
            const isPostulado = app.estado === 'postulado';
            const isEnRevision = !isRechazado && !isContratado && !isRetirado && !isPostulado;

            // Insignia canónica
            let badgeBg = 'bg-[#E6F0FB] text-[#174F93]';
            let badgeIcon = <CalendarIcon className="w-3.5 h-3.5" />;
            let badgeLabel = 'Postulado';

            if (isContratado) {
              badgeBg = 'bg-[#D9EEDF] text-[#064230]';
              badgeIcon = <Check className="w-3.5 h-3.5 stroke-[2.4]" />;
              badgeLabel = 'Contratado';
            } else if (isRechazado) {
              badgeBg = 'bg-[#FDECEF] text-[#A3193B]';
              badgeIcon = <X className="w-3.5 h-3.5 stroke-[2.4]" />;
              badgeLabel = 'Rechazado';
            } else if (isEnRevision) {
              badgeBg = 'bg-[#FEF3C7] text-[#92400E]';
              badgeIcon = <CalendarIcon className="w-3.5 h-3.5" />;
              badgeLabel = 'En revisión';
            } else if (isRetirado) {
              badgeBg = 'bg-zinc-100 text-zinc-600';
              badgeIcon = <XCircle className="w-3.5 h-3.5" />;
              badgeLabel = 'Retirado voluntariamente';
            }

            return (
              <article
                key={app.id}
                id={`postulacion-${app.id}`}
                className={`border border-zinc-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs transition-all hover:border-brand-300 ${
                  isRetirado ? 'bg-zinc-50/70 opacity-80' : 'bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {oferta?.rubro?.nombre && (
                        <span className="inline-block px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 text-[10.5px] font-bold">
                          {oferta.rubro.nombre}
                        </span>
                      )}
                      <span className="text-[11.5px] text-zinc-400">• Postulado el {formattedCreated}</span>
                    </div>

                    <h3 className="text-[15px] sm:text-base font-bold text-zinc-900 leading-snug">
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

                    <div className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-0.5 text-[11.5px] text-zinc-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-800">
                        <BuildingIcon className="w-3 h-3 text-zinc-400" />
                        {empresaNombre}
                      </span>
                      {oferta?.ubicacion && (
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3 text-zinc-400" />
                          {oferta.ubicacion}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeBg}`}
                    >
                      {badgeIcon}
                      {badgeLabel}
                    </span>
                  </div>
                </div>

                {/* Línea de etapas canónica: Postulado -> En revisión -> Resultado (Contratado / Rechazado) */}
                <div
                  className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-100 text-xs"
                  role="list"
                  aria-label="Etapas de la postulación"
                >
                  {/* Etapa 1: Postulado */}
                  <div role="listitem">
                    <div className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-[#0E4D36] text-white flex items-center justify-center text-[9px] shrink-0 font-bold">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                      <span
                        className={`flex-1 h-0.5 ${
                          !isPostulado ? 'bg-[#0E4D36]' : 'bg-zinc-200'
                        }`}
                      />
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-zinc-900">
                      Postulado
                    </div>
                    <div className="text-[9.5px] text-zinc-400">
                      {formattedCreated}
                    </div>
                  </div>

                  {/* Etapa 2: En revisión */}
                  <div role="listitem">
                    <div className="flex items-center">
                      {isEnRevision ? (
                        <span className="w-4 h-4 rounded-full bg-amber-50 border-2 border-[#E0A12B] text-amber-700 flex items-center justify-center text-[7px] shrink-0 font-bold">
                          ●
                        </span>
                      ) : isContratado || isRechazado ? (
                        <span className="w-4 h-4 rounded-full bg-[#0E4D36] text-white flex items-center justify-center text-[9px] shrink-0 font-bold">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-white border border-zinc-300 shrink-0" />
                      )}
                      <span
                        className={`flex-1 h-0.5 ${
                          isContratado || isRechazado ? 'bg-[#0E4D36]' : 'bg-zinc-200'
                        }`}
                      />
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] font-bold ${
                        isEnRevision
                          ? 'text-amber-800'
                          : isContratado || isRechazado
                          ? 'text-zinc-900'
                          : 'text-zinc-400'
                      }`}
                    >
                      En revisión
                    </div>
                    <div className="text-[9.5px] text-zinc-400">
                      {isEnRevision ? 'En evaluación' : 'Evaluación'}
                    </div>
                  </div>

                  {/* Etapa 3: Resultado (Contratado / Rechazado / Pendiente) */}
                  <div role="listitem">
                    <div className="flex items-center">
                      {isContratado ? (
                        <span className="w-4 h-4 rounded-full bg-[#0E4D36] text-white flex items-center justify-center text-[9px] shrink-0 font-bold">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      ) : isRechazado ? (
                        <span className="w-4 h-4 rounded-full bg-[#A3193B] text-white flex items-center justify-center text-[9px] shrink-0 font-bold">
                          <X className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-white border border-zinc-300 shrink-0" />
                      )}
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] font-bold ${
                        isContratado
                          ? 'text-[#0E4D36]'
                          : isRechazado
                          ? 'text-[#A3193B]'
                          : 'text-zinc-400'
                      }`}
                    >
                      {isContratado
                        ? 'Contratado'
                        : isRechazado
                        ? 'Rechazado'
                        : 'Resolución'}
                    </div>
                    <div className="text-[9.5px] text-zinc-400">
                      {isContratado
                        ? 'Incorporado'
                        : isRechazado
                        ? 'Finalizado'
                        : 'Pendiente'}
                    </div>
                  </div>
                </div>

                {/* Caja de estado informativa y confidencial */}
                <div className="mt-2 p-2 sm:p-2.5 rounded-lg bg-[#F4F7F4] text-xs text-[#33493D] border border-[#E0E8E1]/60">
                  {isRechazado ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-zinc-900 text-[11.5px]">
                        El proceso de selección para esta búsqueda ha finalizado en esta oportunidad.
                      </p>
                      {/* Si el rechazo provino de la empresa y posee motivo informado, mostrarlo con resguardo */}
                      {app.motivo_rechazo_empresa ? (
                        <p className="text-zinc-700 text-[11px]">
                          <strong>Motivo informado:</strong> {app.motivo_rechazo_empresa}
                        </p>
                      ) : (
                        <p className="text-zinc-500 text-[10.5px]">
                          Agradecemos tu postulación y te sugerimos continuar explorando nuevas oportunidades laborales activas en la ciudad.
                        </p>
                      )}
                    </div>
                  ) : isContratado ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-emerald-900 text-[11.5px]">
                        ¡Felicitaciones! Has sido seleccionado/a para el puesto.
                      </p>
                      <p className="text-emerald-800 text-[10.5px]">
                        Próximamente recibirás información sobre los próximos pasos para concretar tu incorporación.
                      </p>
                    </div>
                  ) : isEnRevision ? (
                    <p className="text-[11px]">
                      Tu postulación y antecedentes se encuentran actualmente en evaluación. Te notificaremos ante cualquier novedad o avance en el proceso.
                    </p>
                  ) : (
                    <p className="text-[11px]">{getApplicationStatusConfig(app.estado).description}</p>
                  )}
                </div>

                {/* Pie Compacto: CV adjunto y acciones */}
                <div className="mt-2 pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 text-zinc-600 text-[11.5px]">
                    <FileText className="w-3.5 h-3.5 text-[#0E4D36]" />
                    <span>CV:</span>
                    <strong className="text-zinc-800">
                      {app.cv?.nombre_cv || (hasCvLink ? 'Copia histórica' : 'Perfil registrado')}
                    </strong>
                    {hasCvLink && (
                      <button
                        type="button"
                        onClick={() => handleOpenCvSnapshot(app)}
                        disabled={openingCvId === app.id}
                        className="font-bold text-[#0E4D36] hover:text-[#08301F] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 text-[11px] ml-1"
                      >
                        Ver copia
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="h-7.5 px-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 font-semibold inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer shadow-2xs text-xs"
                    >
                      <History className="w-3.5 h-3.5 text-zinc-400" />
                      Historial ({app.historial.length})
                      <ChevronDownIcon
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {oferta && (
                      <Link
                        href={`/ofertas/${app.oferta_id}`}
                        className="h-7.5 px-3 rounded-lg border border-[#0E4D36] bg-white text-[#0E4D36] font-bold inline-flex items-center justify-center hover:bg-[#F1F8F3] transition-colors shadow-2xs text-xs"
                      >
                        {app.estado === 'retirado_por_postulante' &&
                        oferta.estado === 'publicada' &&
                        !oferta.deleted_at
                          ? 'Ver oferta / Re-postularme'
                          : 'Ver oferta'}
                      </Link>
                    )}

                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setAppToWithdraw(app)}
                        className="h-7.5 px-2 rounded-lg text-[#A3193B] font-semibold inline-flex items-center gap-1 hover:bg-rose-50 cursor-pointer text-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Retirar
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

        {sortedApplications.length > PAGE_SIZE && (
          <div className="pt-2">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={sortedApplications.length}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </>
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
