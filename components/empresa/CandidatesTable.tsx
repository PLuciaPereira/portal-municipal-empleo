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
import { Calendar, User as UserIconLucide, Search, ArrowUpDown, X, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CandidatesTableProps {
  candidatos: VistaCandidatoEmpresa[];
  loading?: boolean;
  highlightCandidateId?: string | null;
  onRefresh: () => void;
}

type FilterEstado = 'todos' | 'pendientes' | 'contratados' | 'rechazados';
type SortOption = 'recientes' | 'antiguos' | 'nombre_asc' | 'puesto_asc';

export function CandidatesTable({
  candidatos,
  loading,
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

  // Estados de filtros y búsqueda
  const [estadoFilter, setEstadoFilter] = useState<FilterEstado>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recientes');

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

    // 3. Ordenamiento inteligente: Primero los nuevos derivados pendientes si ordenamos por 'recientes'
    result.sort((a, b) => {
      if (sortBy === 'recientes') {
        const isANuevo = a.estado_postulacion === 'presentado_a_empresa';
        const isBNuevo = b.estado_postulacion === 'presentado_a_empresa';

        // Dar prioridad en el tope a los candidatos nuevos derivados sin gestionar
        if (isANuevo && !isBNuevo) return -1;
        if (!isANuevo && isBNuevo) return 1;

        const dateA = a.fecha_derivacion ? new Date(a.fecha_derivacion).getTime() : 0;
        const dateB = b.fecha_derivacion ? new Date(b.fecha_derivacion).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'antiguos') {
        const dateA = a.fecha_derivacion ? new Date(a.fecha_derivacion).getTime() : 0;
        const dateB = b.fecha_derivacion ? new Date(b.fecha_derivacion).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === 'nombre_asc') {
        const nameA = `${a.nombre || ''} ${a.apellido || ''}`.trim().toLowerCase();
        const nameB = `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'puesto_asc') {
        const puestoA = (a.oferta_titulo || '').toLowerCase();
        const puestoB = (b.oferta_titulo || '').toLowerCase();
        return puestoA.localeCompare(puestoB);
      }
      return 0;
    });

    return result;
  }, [candidatos, estadoFilter, searchQuery, sortBy]);

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
      <div className="py-12 text-center text-zinc-500">
        <ClockIcon className="w-8 h-8 mx-auto animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Cargando candidatos derivados...</p>
      </div>
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
      <div className="space-y-4">
        {/* Barra de Filtros, Búsqueda y Ordenamiento Integrada (Plana como en Mockup) */}
        <div className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Chips de Estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold">
            <button
              type="button"
              onClick={() => setEstadoFilter('todos')}
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

            <button
              type="button"
              onClick={() => setEstadoFilter('pendientes')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                estadoFilter === 'pendientes'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>Pendientes / En proceso</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                estadoFilter === 'pendientes' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {counts.pendientes}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setEstadoFilter('contratados')}
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
              onClick={() => setEstadoFilter('rechazados')}
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
          </div>

          {/* Fila con Buscador y Selector de Orden */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o puesto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-7 py-1.5 rounded-lg border border-zinc-200 bg-white w-60 focus:outline-brand-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Ordenar candidatos por"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-700 cursor-pointer focus:outline-brand-800"
            >
              <option value="recientes">Más recientes</option>
              <option value="antiguos">Más antiguos</option>
              <option value="nombre_asc">Postulante (A-Z)</option>
              <option value="puesto_asc">Puesto (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Lista de candidatos en contenedor continuo sin tarjetas aisladas cortadas */}
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
          <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden shadow-xs">
            {filteredCandidates.map((cand) => {
              const isPresentado = cand.estado_postulacion === 'presentado_a_empresa';
              const isEntrevista = cand.estado_postulacion === 'entrevista';
              const isActivo = isPresentado || isEntrevista;
              const isContratado = cand.estado_postulacion === 'contratado';
              const isRechazado = cand.estado_postulacion === 'rechazado_por_empresa';
              const nombreCompleto = `${cand.nombre} ${cand.apellido || ''}`.trim();
              const isHighlighted = activeHighlightId === cand.postulacion_id;

              return (
                <div
                  key={cand.postulacion_id}
                  ref={(el) => {
                    candidateRefs.current[cand.postulacion_id] = el;
                  }}
                  className={`p-5 transition-all duration-500 space-y-3.5 ${
                    isHighlighted
                      ? 'ring-2 ring-emerald-500 bg-emerald-50/40'
                      : isActivo
                      ? 'hover:bg-zinc-50/60'
                      : 'bg-zinc-50/30 opacity-90'
                  }`}
                >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-zinc-900">
                        {nombreCompleto}
                      </h4>
                      {isPresentado && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <Sparkles className="w-3 h-3 text-emerald-700" />
                          Nuevo derivado
                        </span>
                      )}
                      {isEntrevista && <Badge variant="brand">En Entrevista</Badge>}
                      {isContratado && <Badge variant="emerald">Contratado</Badge>}
                      {isRechazado && <Badge variant="rose">Rechazado por Empresa</Badge>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Postulado a: <strong>{cand.oferta_titulo}</strong> • Derivado:{' '}
                      {cand.fecha_derivacion
                        ? new Date(cand.fecha_derivacion).toLocaleDateString('es-AR')
                        : 'Fecha no registrada'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {cand.cv_url && isActivo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadCv(cand)}
                        isLoading={downloadingCvId === cand.postulacion_id}
                      >
                        <FileTextIcon className="w-4 h-4 mr-1 text-zinc-600" />
                        Ver CV
                      </Button>
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic px-2 py-1 bg-zinc-100 rounded-lg">
                        CV no disponible (proceso cerrado)
                      </span>
                    )}

                    {isActivo && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCandidateToInterview(cand);
                            setIsReprogramarMode(isEntrevista);
                            setIsInterviewModalOpen(true);
                          }}
                          className={`text-xs font-semibold ${
                            isEntrevista
                              ? 'border-brand-300 bg-brand-50 text-brand-900 hover:bg-brand-100'
                              : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          {isEntrevista ? 'Reprogramar Entrevista' : 'Agendar Entrevista'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAction(cand, 'contratar')}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                        >
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Contratar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAction(cand, 'rechazar')}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400"
                        >
                          <XCircleIcon className="w-4 h-4 mr-1" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Banner de entrevista agendada si corresponde */}
                {isEntrevista && (
                  <div className="p-3 bg-brand-50/80 border border-brand-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-brand-950">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-brand-600 text-white rounded-lg">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold">Entrevista coordinada:</span>{' '}
                        {cand.fecha_entrevista ? new Date(cand.fecha_entrevista).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'Fecha a coordinar'} hs ({cand.modalidad_entrevista || 'Presencial'})
                        {cand.lugar_entrevista && (
                          <span className="text-brand-800 ml-1.5 block sm:inline">
                            • Lugar/Enlace: <strong>{cand.lugar_entrevista}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-brand-700 shrink-0">
                      Estado: Esperando entrevista
                    </span>
                  </div>
                )}

                {/* Datos de contacto y perfil */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{cand.telefono || 'Sin teléfono informado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MailIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="truncate">{cand.email || 'Sin email'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Residencia: {cand.localidad || 'Funes'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCapIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Nivel Educativo: {cand.nivel_educativo || 'No especificado'}</span>
                  </div>
                  {cand.resumen_laboral && (
                    <div className="sm:col-span-2 md:col-span-3 text-zinc-700 bg-zinc-50 p-2.5 rounded-xl border border-zinc-150">
                      <span className="font-semibold block text-zinc-800 mb-0.5">
                        Resumen de experiencia:
                      </span>
                      <p className="line-clamp-2">{cand.resumen_laboral}</p>
                    </div>
                  )}
                </div>

                {/* Habilidades destacadas */}
                {cand.habilidades && cand.habilidades.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-zinc-500">Habilidades:</span>
                    {cand.habilidades.map((hab, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[11px] bg-zinc-100 text-zinc-700 rounded-md font-medium"
                      >
                        {hab}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
