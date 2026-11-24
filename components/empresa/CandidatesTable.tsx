'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VistaCandidatoEmpresa } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MapPinIcon,
  GraduationCapIcon,
  ClockIcon,
  PhoneIcon,
  MailIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';
import { CandidateActionModal } from './CandidateActionModal';
import { CompanyScheduleInterviewModal } from './CompanyScheduleInterviewModal';
import { Calendar, Search, ArrowUpDown, X, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

interface CandidatesTableProps {
  candidatos: VistaCandidatoEmpresa[];
  loading?: boolean;
  error?: string | null;
  highlightCandidateId?: string | null;
  onRefresh: () => void;
}

type FilterEstado = 'todos' | 'pendientes' | 'contratados' | 'rechazados';
type SortOption = 'recientes' | 'antiguos' | 'titulo';

export function CandidatesTable({
  candidatos,
  loading,
  error,
  highlightCandidateId,
  onRefresh,
}: CandidatesTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<VistaCandidatoEmpresa | null>(null);
  const [actionType, setActionType] = useState<'contratar' | 'rechazar'>('contratar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [candidateToInterview, setCandidateToInterview] = useState<VistaCandidatoEmpresa | null>(null);
  const [isReprogramarMode, setIsReprogramarMode] = useState(false);
  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);

  // Estado para el resalte visual temporario
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const candidateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Estados de filtros y búsqueda (predeterminado en 'pendientes')
  const [estadoFilter, setEstadoFilter] = useState<FilterEstado>('pendientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recientes');

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  // Handlers con reset de página
  const handleEstadoFilterChange = (estado: FilterEstado) => {
    setEstadoFilter(estado);
    setCurrentPage(1);
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortByChange = (order: SortOption) => {
    setSortBy(order);
    setCurrentPage(1);
  };

  // Efecto para enfocar y resaltar candidato objetivo si viene por parámetro
  useEffect(() => {
    if (!highlightCandidateId || loading) return;

    // Buscar coincidencia flexible por postulacion_id, postulante_id o oferta_id
    const found = candidatos.find(
      (c) =>
        c.postulacion_id === highlightCandidateId ||
        c.postulante_id === highlightCandidateId ||
        c.oferta_id === highlightCandidateId
    );

    if (found) {
      // Si el candidato no está en el filtro actual, cambiar a 'todos' para que sea visible
      setEstadoFilter('todos');

      const targetId = found.postulacion_id;
      setActiveHighlightId(targetId);

      const timerScroll = setTimeout(() => {
        const el = candidateRefs.current[targetId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);

      const timerClear = setTimeout(() => {
        setActiveHighlightId(null);
      }, 5000);

      return () => {
        clearTimeout(timerScroll);
        clearTimeout(timerClear);
      };
    }
  }, [highlightCandidateId, candidatos, loading]);

  // Contadores para chips
  const counts = useMemo(() => {
    let pendientes = 0;
    let contratados = 0;
    let rechazados = 0;

    for (const c of candidatos) {
      if (c.estado_postulacion === 'presentado_a_empresa' || c.estado_postulacion === 'entrevista') {
        pendientes++;
      } else if (c.estado_postulacion === 'contratado') {
        contratados++;
      } else if (c.estado_postulacion === 'rechazado_por_empresa') {
        rechazados++;
      }
    }

    return {
      todos: candidatos.length,
      pendientes,
      contratados,
      rechazados,
    };
  }, [candidatos]);

  // Lista filtrada y ordenada
  const filteredCandidates = useMemo(() => {
    let result = [...candidatos];

    // 1. Filtro por chip de estado
    if (estadoFilter === 'pendientes') {
      result = result.filter(
        (c) => c.estado_postulacion === 'presentado_a_empresa' || c.estado_postulacion === 'entrevista'
      );
    } else if (estadoFilter === 'contratados') {
      result = result.filter((c) => c.estado_postulacion === 'contratado');
    } else if (estadoFilter === 'rechazados') {
      result = result.filter((c) => c.estado_postulacion === 'rechazado_por_empresa');
    }

    // 2. Filtro por texto de búsqueda (nombre, apellido, puesto)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const nombre = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
        const puesto = (c.oferta_titulo || '').toLowerCase();
        const localidad = (c.localidad || '').toLowerCase();
        return nombre.includes(q) || puesto.includes(q) || localidad.includes(q);
      });
    }

    // 3. Ordenamiento: Del más reciente al más antiguo por fecha de incorporación/derivación para la empresa
    const parseTime = (dateStr?: string | null) => {
      if (!dateStr) return 0;
      const t = new Date(dateStr).getTime();
      return isNaN(t) ? 0 : t;
    };

    result.sort((a, b) => {
      if (sortBy === 'recientes') {
        const timeA = parseTime(a.fecha_derivacion) || parseTime(a.fecha_postulacion);
        const timeB = parseTime(b.fecha_derivacion) || parseTime(b.fecha_postulacion);
        return timeB - timeA;
      }
      if (sortBy === 'antiguos') {
        const timeA = parseTime(a.fecha_derivacion) || parseTime(a.fecha_postulacion);
        const timeB = parseTime(b.fecha_derivacion) || parseTime(b.fecha_postulacion);
        return timeA - timeB;
      }
      if (sortBy === 'titulo') {
        const puestoA = (a.oferta_titulo || '').toLowerCase();
        const puestoB = (b.oferta_titulo || '').toLowerCase();
        const comp = puestoA.localeCompare(puestoB);
        if (comp !== 0) return comp;
        const nameA = `${a.nombre || ''} ${a.apellido || ''}`.trim().toLowerCase();
        const nameB = `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [candidatos, estadoFilter, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredCandidates.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Asegurar que si los filtros o el cambio de búsqueda reducen las páginas, no quede en página huérfana
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedCandidates = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredCandidates.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCandidates, safeCurrentPage]);

  // Si viene un candidato destacado por URL, posicionar en su página para garantizar que esté visible en el DOM
  useEffect(() => {
    if (highlightCandidateId && filteredCandidates.length > 0) {
      const targetIndex = filteredCandidates.findIndex(
        (c) =>
          c.postulacion_id === highlightCandidateId ||
          c.postulante_id === highlightCandidateId ||
          c.oferta_id === highlightCandidateId
      );
      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / PAGE_SIZE) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [highlightCandidateId, filteredCandidates]);

  const handleOpenAction = (candidato: VistaCandidatoEmpresa, type: 'contratar' | 'rechazar') => {
    setSelectedCandidate(candidato);
    setActionType(type);
    setIsModalOpen(true);
  };

  const handleDownloadCv = async (candidato: VistaCandidatoEmpresa) => {
    if (!candidato.cv_url) return;

    setDownloadingCvId(candidato.postulacion_id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('postulantes-cvs')
        .createSignedUrl(candidato.cv_url, 60);

      if (error || !data?.signedUrl) {
        alert('No se pudo generar el enlace seguro de descarga del CV.');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      alert('Error al acceder al currículum vitae: ' + msg);
    } finally {
      setDownloadingCvId(null);
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
        title="No se pudieron recuperar los candidatos derivados"
        description={error}
        onRetry={onRefresh}
      />
    );
  }

  if (candidatos.length === 0) {
    return (
      <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
        <UserIcon className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-800">
          No hay candidatos derivados actualmente
        </h4>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
          La Oficina de Empleo te presentará postulantes seleccionados que se ajusten a tus búsquedas laborales publicadas.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Barra de Filtros, Búsqueda y Ordenamiento Integrada (Plana como en Mockup) */}
        <div className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Chips de Estado: 1. Pendientes de revisión, 2. Contratados, 3. Rechazados, 4. Todos */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold">
            <button
              type="button"
              onClick={() => handleEstadoFilterChange('pendientes')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                estadoFilter === 'pendientes'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Pendientes de revisión</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                estadoFilter === 'pendientes' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {counts.pendientes}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleEstadoFilterChange('contratados')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                estadoFilter === 'contratados'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Contratados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                estadoFilter === 'contratados' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {counts.contratados}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleEstadoFilterChange('rechazados')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                estadoFilter === 'rechazados'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Rechazados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                estadoFilter === 'rechazados' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {counts.rechazados}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleEstadoFilterChange('todos')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                estadoFilter === 'todos'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Todos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                estadoFilter === 'todos' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {counts.todos}
              </span>
            </button>
          </div>

          {/* Fila con Buscador y Selector de Orden */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o puesto..."
                value={searchQuery}
                onChange={(e) => handleSearchQueryChange(e.target.value)}
                className="text-xs pl-8 pr-7 py-1.5 rounded-lg border border-zinc-200 bg-white w-60 focus:outline-brand-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchQueryChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 h-8.5 rounded-xl border border-zinc-200 text-xs shrink-0 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-medium hidden sm:inline">Orden:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortByChange(e.target.value as SortOption)}
              aria-label="Ordenar candidatos por"
              className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="recientes">Más reciente primero</option>
              <option value="antiguos">Más antiguo primero</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
          </div>
        </div>

        {/* Tabla estructurada con columnas independientes para cada acción */}
        {filteredCandidates.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
            <UserIcon className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-700">
              No se encontraron candidatos para los filtros aplicados.
            </p>
            {(estadoFilter !== 'todos' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setEstadoFilter('todos');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs font-bold text-brand-700 hover:underline cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto scroll-smooth">
                <table className="w-full min-w-[1050px] text-left text-xs">
                  <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Candidato y postulación</th>
                      <th className="py-2.5 px-3">Contacto y ubicación</th>
                      <th className="py-2.5 px-3">Perfil y experiencia</th>
                      {/* Columnas independientes para cada acción */}
                      <th className="py-2.5 px-1.5 w-24 text-center">Currículum</th>
                      <th className="py-2.5 px-1.5 w-36 text-center">Entrevista</th>
                      <th className="py-2.5 px-1.5 w-28 text-center">Contratar</th>
                      <th className="py-2.5 px-1.5 w-28 text-center">Rechazar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {paginatedCandidates.map((cand) => {
                      const isPresentado = cand.estado_postulacion === 'presentado_a_empresa';
                      const isEntrevista = cand.estado_postulacion === 'entrevista';
                      const isActivo = isPresentado || isEntrevista;
                      const isContratado = cand.estado_postulacion === 'contratado';
                      const isRechazado = cand.estado_postulacion === 'rechazado_por_empresa';
                      const nombreCompleto = `${cand.nombre} ${cand.apellido || ''}`.trim();
                      const isHighlighted = activeHighlightId === cand.postulacion_id;

                      return (
                        <tr
                          key={cand.postulacion_id}
                          ref={(el) => {
                            candidateRefs.current[cand.postulacion_id] = el as unknown as HTMLDivElement | null;
                          }}
                          className={`transition-all duration-300 ${
                            isHighlighted
                              ? 'ring-2 ring-emerald-500 bg-emerald-50/50'
                              : isActivo
                              ? 'hover:bg-zinc-50/60'
                              : 'bg-zinc-50/30 opacity-80 hover:opacity-100'
                          }`}
                        >
                          {/* Columna: Candidato y postulación */}
                          <td className="py-2 px-3 align-middle">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-zinc-900 text-xs sm:text-sm leading-tight">
                                  {nombreCompleto}
                                </span>
                                {isPresentado && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-700" />
                                    Nuevo
                                  </span>
                                )}
                                {isEntrevista && <Badge variant="brand">En entrevista</Badge>}
                                {isContratado && <Badge variant="emerald">Contratado</Badge>}
                                {isRechazado && <Badge variant="rose">Rechazado</Badge>}
                              </div>
                              <div className="text-[11px] text-zinc-500 leading-tight">
                                Puesto: <strong className="text-zinc-700">{cand.oferta_titulo}</strong>
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                Derivado: {cand.fecha_derivacion ? new Date(cand.fecha_derivacion).toLocaleDateString('es-AR') : 'Fecha no registrada'}
                              </div>
                              {isEntrevista && cand.fecha_entrevista && (
                                <div className="text-[10px] text-brand-900 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 mt-0.5 inline-flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5 text-brand-700 shrink-0" />
                                  <span>
                                    {new Date(cand.fecha_entrevista).toLocaleString('es-AR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })} hs ({cand.modalidad_entrevista || 'Presencial'})
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Columna: Contacto y ubicación */}
                          <td className="py-2 px-3 align-middle whitespace-nowrap">
                            <div className="space-y-0.5 text-[11px] text-zinc-600">
                              <div className="flex items-center gap-1.5">
                                <PhoneIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="font-medium">{cand.telefono || 'Sin teléfono'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MailIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="truncate max-w-[170px]" title={cand.email || ''}>{cand.email || 'Sin email'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-zinc-500">
                                <MapPinIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>{cand.localidad || 'Funes'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Columna: Perfil y experiencia */}
                          <td className="py-2 px-3 align-middle">
                            <div className="space-y-0.5 max-w-[280px]">
                              {cand.nivel_educativo && (
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-700">
                                  <GraduationCapIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span className="truncate">{cand.nivel_educativo}</span>
                                </div>
                              )}
                              {cand.resumen_laboral && (
                                <p className="text-[11px] text-zinc-600 line-clamp-2 leading-snug bg-zinc-50 p-1 rounded border border-zinc-150" title={cand.resumen_laboral}>
                                  {cand.resumen_laboral}
                                </p>
                              )}
                              {cand.habilidades && cand.habilidades.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  {cand.habilidades.slice(0, 3).map((hab, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.2 text-[10px] bg-zinc-100 text-zinc-700 rounded font-medium truncate max-w-[110px]"
                                      title={hab}
                                    >
                                      {hab}
                                    </span>
                                  ))}
                                  {cand.habilidades.length > 3 && (
                                    <span className="text-[10px] text-zinc-400">+{cand.habilidades.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Columna Acción 1: Currículum */}
                          <td className="py-2 px-1.5 text-center align-middle whitespace-nowrap">
                            {cand.cv_url && isActivo ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadCv(cand)}
                                isLoading={downloadingCvId === cand.postulacion_id}
                                className="h-7.5 px-2 text-xs w-full justify-center"
                                title="Descargar / Ver currículum vitae"
                              >
                                <FileTextIcon className="w-3.5 h-3.5 mr-1 text-zinc-600" />
                                <span>Ver CV</span>
                              </Button>
                            ) : (
                              <span className="text-zinc-300 select-none">-</span>
                            )}
                          </td>

                          {/* Columna Acción 2: Entrevista */}
                          <td className="py-2 px-1.5 text-center align-middle whitespace-nowrap">
                            {isActivo ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCandidateToInterview(cand);
                                  setIsReprogramarMode(isEntrevista);
                                  setIsInterviewModalOpen(true);
                                }}
                                className={`text-xs font-semibold h-7.5 px-2 w-full justify-center ${
                                  isEntrevista
                                    ? 'border-brand-300 bg-brand-50 text-brand-900 hover:bg-brand-100'
                                    : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                }`}
                                title={isEntrevista ? 'Reprogramar fecha u horario de entrevista' : 'Coordinar entrevista presencial o virtual'}
                              >
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                <span>{isEntrevista ? 'Reprogramar' : 'Entrevista'}</span>
                              </Button>
                            ) : (
                              <span className="text-zinc-300 select-none">-</span>
                            )}
                          </td>

                          {/* Columna Acción 3: Contratar */}
                          <td className="py-2 px-1.5 text-center align-middle whitespace-nowrap">
                            {isActivo ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAction(cand, 'contratar')}
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 h-7.5 px-2 text-xs w-full justify-center"
                                title="Confirmar contratación del postulante"
                              >
                                <CheckCircleIcon className="w-3.5 h-3.5 mr-1" />
                                <span>Contratar</span>
                              </Button>
                            ) : (
                              <span className="text-zinc-300 select-none">-</span>
                            )}
                          </td>

                          {/* Columna Acción 4: Rechazar */}
                          <td className="py-2 px-1.5 text-center align-middle whitespace-nowrap">
                            {isActivo ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAction(cand, 'rechazar')}
                                className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 h-7.5 px-2 text-xs w-full justify-center"
                                title="Registrar motivo de desestimación"
                              >
                                <XCircleIcon className="w-3.5 h-3.5 mr-1" />
                                <span>Rechazar</span>
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
            </div>

            {filteredCandidates.length > PAGE_SIZE && (
              <div className="pt-2">
                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={filteredCandidates.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => setCurrentPage(page)}
                />
          </div>
        )}
      </>
    )}
    </div>

      {isInterviewModalOpen && candidateToInterview && (
        <CompanyScheduleInterviewModal
          isOpen={isInterviewModalOpen}
          candidato={candidateToInterview}
          isReprogramar={isReprogramarMode}
          onClose={() => {
            setIsInterviewModalOpen(false);
            setCandidateToInterview(null);
            setIsReprogramarMode(false);
          }}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}

      {selectedCandidate && (
        <CandidateActionModal
          candidato={selectedCandidate}
          actionType={actionType}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCandidate(null);
          }}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </>
  );
}
