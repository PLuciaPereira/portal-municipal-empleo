'use client';

import React, { useState, useMemo } from 'react';
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
  ArrowUpDown,
  Search,
  ShieldCheck,
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

  const [sortOrder, setSortOrder] = useState<'recientes' | 'antiguas'>('recientes');
  const [searchTerm, setSearchTerm] = useState('');

  const activeCount = applications.filter(
    (app) => app.estado !== 'retirado_por_postulante'
  ).length;

  const sortedApplications = useMemo(() => {
    return [...applications]
      .filter((app) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const titulo = app.oferta?.titulo?.toLowerCase() || '';
        const empresa = (app.oferta?.empresa?.nombre_fantasia || app.oferta?.empresa?.razon_social || '').toLowerCase();
        const rubro = app.oferta?.rubro?.nombre?.toLowerCase() || '';
        return titulo.includes(q) || empresa.includes(q) || rubro.includes(q);
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return sortOrder === 'recientes' ? timeB - timeA : timeA - timeB;
      });
  }, [applications, sortOrder, searchTerm]);

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
      {/* 1. Encabezado de la Sección con Buscador y Orden Integrados al Lienzo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-sans">
              Mis Postulaciones e Historial de Seguimiento
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E4F1E8] text-[#0A3D2A]">
              {activeCount} {activeCount === 1 ? 'activa' : 'activas'}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#5A7064]">
            Consultá el estado de intermediación municipal de cada postulación y su trazabilidad cronológica.
          </p>
        </div>

        {applications.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {applications.length > 2 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por puesto o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-8 pr-7 py-1.5 rounded-xl border border-zinc-200 bg-white w-48 sm:w-56 focus:outline-brand-800 shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-white px-2.5 h-8.5 rounded-xl border border-zinc-200 text-xs shrink-0 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500 font-medium hidden sm:inline">Orden:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'recientes' | 'antiguas')}
                aria-label="Ordenar postulaciones por fecha"
                className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="recientes">Más recientes</option>
                <option value="antiguas">Más antiguas</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. Tira Informativa Compacta de Intermediación Municipal (No invasiva) */}
      <div className="px-3.5 py-2 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3 text-xs text-blue-950 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <div className="leading-snug">
            <span className="font-bold text-blue-900">Intermediación Municipal de Funes:</span>
            <span className="text-blue-800/90 ml-1.5 hidden sm:inline">
              Cada postulación es analizada técnicamente antes de su derivación a la empresa solicitante.
            </span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-blue-800/80 bg-white/60 px-2 py-0.5 rounded-md border border-blue-200/60 shrink-0">
          Oficina de Empleo
        </span>
      </div>

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
      ) : sortedApplications.length === 0 ? (
        <div className="mt-6 p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
          <BriefcaseIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700">
            No se encontraron postulaciones para el criterio de búsqueda ingresado.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4 sm:space-y-5">
          {sortedApplications.map((app) => {
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
                className={`border border-zinc-200/90 rounded-xl p-4 sm:p-4.5 shadow-2xs transition-all hover:border-brand-300 ${
                  isRetirado ? 'bg-zinc-50/70 opacity-80' : 'bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {oferta?.rubro?.nombre && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-bold">
                          {oferta.rubro.nombre}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">• Postulado el {formattedCreated}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
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

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-800">
                        <BuildingIcon className="w-3.5 h-3.5 text-zinc-400" />
                        {empresaNombre}
                      </span>
                      {oferta?.ubicacion && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 text-zinc-400" />
                          {oferta.ubicacion}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg}`}
                    >
                      {badgeIcon}
                      {badgeLabel}
                    </span>
                  </div>
                </div>

                {/* Línea de etapas visual Compacta (Stepper) */}
                <div
                  className="grid grid-cols-4 gap-2 py-3 border-b border-zinc-100 text-xs"
                  role="list"
                  aria-label="Etapas de la postulación"
                >
                  {/* Etapa 1: Postulado */}
                  <div role="listitem">
                    <div className="flex items-center">
                      <span className="w-5 h-5 rounded-full bg-[#0E4D36] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span className="flex-1 h-0.5 bg-[#0E4D36]" />
                    </div>
                    <div className="mt-1 text-[11.5px] font-bold text-zinc-900">
                      Postulado
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {formattedCreated}
                    </div>
                  </div>

                  {/* Etapa 2: Recibido */}
                  <div role="listitem">
                    <div className="flex items-center">
                      <span className="w-5 h-5 rounded-full bg-[#0E4D36] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span
                        className={`flex-1 h-0.5 ${
                          isRechazadoEmpresa || isSeleccionado || app.estado === 'presentado_a_empresa'
                            ? 'bg-[#0E4D36]'
                            : 'bg-zinc-200'
                        }`}
                      />
                    </div>
                    <div className="mt-1 text-[11.5px] font-bold text-zinc-900">
                      Recibido
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Oficina de Empleo
                    </div>
                  </div>

                  {/* Etapa 3: Revisión técnica / Derivado */}
                  {isRechazadoEmpresa || isSeleccionado || app.estado === 'presentado_a_empresa' ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-[#0E4D36] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        <span
                          className={`flex-1 h-0.5 ${
                            isRechazadoEmpresa || isSeleccionado ? 'bg-[#0E4D36]' : 'bg-zinc-200'
                          }`}
                        />
                      </div>
                      <div className="mt-1 text-[11.5px] font-bold text-zinc-900">
                        Derivado
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        A la empresa
                      </div>
                    </div>
                  ) : isNoDerivado ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-[#71717A] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                          <X className="w-3 h-3 stroke-[2.4]" />
                        </span>
                        <span className="flex-1 h-0.5 bg-zinc-200" />
                      </div>
                      <div className="mt-1 text-[11.5px] font-bold text-[#52525B]">
                        Revisión técnica
                      </div>
                      <div className="text-[10px] text-[#71717A]">
                        No derivado
                      </div>
                    </div>
                  ) : (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-amber-50 border-2 border-[#E0A12B] text-amber-700 flex items-center justify-center text-[8px] shrink-0 font-bold">
                          ●
                        </span>
                        <span className="flex-1 h-0.5 bg-zinc-200" />
                      </div>
                      <div className="mt-1 text-[11.5px] font-bold text-amber-800">
                        Revisión técnica
                      </div>
                      <div className="text-[10px] text-amber-600 font-medium">
                        En curso
                      </div>
                    </div>
                  )}

                  {/* Etapa 4: Resultado final o Derivación pendiente */}
                  {isRechazadoEmpresa ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-[#A3193B] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                          <X className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                      <div className="mt-1 text-[11.5px] font-bold text-[#A3193B]">
                        Resultado
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        No seleccionado
                      </div>
                    </div>
                  ) : isSeleccionado ? (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-[#0E4D36] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                      <div className="mt-1 text-[11.5px] font-bold text-[#0E4D36]">
                        Resultado
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {app.estado === 'contratado' ? 'Contratado' : 'Seleccionado'}
                      </div>
                    </div>
                  ) : (
                    <div role="listitem">
                      <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-white border border-zinc-300 shrink-0" />
                      </div>
                      <div className="mt-1 text-[11.5px] font-semibold text-zinc-400">
                        {isNoDerivado ? 'Derivación' : 'Derivado'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {isNoDerivado ? 'Cancelada' : 'A la empresa'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Caja de mensaje de estado actual compacta */}
                <div className="mt-2.5 p-2.5 sm:p-3 rounded-lg bg-[#F4F7F4] text-xs text-[#33493D] border border-[#E0E8E1]/60">
                  {isNoDerivado ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-zinc-900">
                        La Oficina de Empleo no derivó esta postulación a la empresa.
                      </p>
                      {motivoNoDerivacion ? (
                        <p className="text-zinc-700 text-[11.5px]">
                          <strong>Motivo informado:</strong> {motivoNoDerivacion}
                        </p>
                      ) : (
                        <p className="text-zinc-500 italic text-[11px]">
                          Motivo: Criterio de perfil o requisitos excluyentes de la vacante según evaluación técnica municipal.
                        </p>
                      )}
                    </div>
                  ) : isRechazadoEmpresa ? (
                    <div className="space-y-1">
                      <p>La empresa finalizó la revisión de candidatos derivados para esta búsqueda.</p>
                      {app.motivo_rechazo_empresa && (
                        <p className="text-zinc-600 text-[11.5px]">
                          <strong>Motivo de la empresa:</strong> {app.motivo_rechazo_empresa}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11.5px]">{getApplicationStatusConfig(app.estado).description}</p>
                  )}
                </div>

                {/* Pie Compacto: CV adjunto y acciones */}
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 text-zinc-600">
                    <FileText className="w-3.5 h-3.5 text-[#0E4D36]" />
                    <span>CV presentado:</span>
                    <strong className="text-zinc-800">
                      {app.cv?.nombre_cv || (hasCvLink ? 'Copia histórica adjunta' : 'Perfil registrado')}
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="h-8 px-3 rounded-lg border border-zinc-200 bg-white text-zinc-700 font-semibold inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer shadow-2xs"
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
                        className="h-8 px-3.5 rounded-lg border border-[#0E4D36] bg-white text-[#0E4D36] font-bold inline-flex items-center justify-center hover:bg-[#F1F8F3] transition-colors shadow-2xs"
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
                        className="h-8 px-2.5 rounded-lg text-[#A3193B] font-semibold inline-flex items-center gap-1 hover:bg-rose-50 cursor-pointer"
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
