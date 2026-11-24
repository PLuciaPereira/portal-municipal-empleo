'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getLocalidades, LOCALIDADES_CANONICAS_DEFAULT } from '@/lib/localidades';
import type { Localidad } from '@/types/database';
import { PostulanteAdminItem } from '@/lib/admin';
import { AdminApplicantDetailModal } from './AdminApplicantDetailModal';
import { AdminApplicantHistoryModal } from './AdminApplicantHistoryModal';
import { InviteToJobModal } from './InviteToJobModal';
import { OfertaAdminItem, invitarPostulanteAOferta } from '@/lib/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import {
  Search,
  Eye,
  MapPin,
  GraduationCap,
  FileText,
  Phone,
  Send,
  Clock,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';

interface ApplicantsTableProps {
  postulantes: PostulanteAdminItem[];
  loading?: boolean;
  ofertasDisponibles?: OfertaAdminItem[];
  onRefresh: () => void;
}

export function ApplicantsTable({
  postulantes,
  loading,
  ofertasDisponibles = [],
  onRefresh,
}: ApplicantsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>('todas');
  const [selectedNivelEducativo, setSelectedNivelEducativo] = useState<string>('todos');
  const [filterHabilidad, setFilterHabilidad] = useState('');
  const [sortOrder, setSortOrder] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 5;

  // Resetear paginación al cambiar filtros o criterio de ordenamiento
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLocalidad, selectedNivelEducativo, filterHabilidad, sortOrder]);

  // Modal de detalle
  // Modal de invitación
  const [postulanteToInvite, setPostulanteToInvite] = useState<PostulanteAdminItem | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedPostulante, setSelectedPostulante] = useState<PostulanteAdminItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [postulanteHistory, setPostulanteHistory] = useState<PostulanteAdminItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Obtener lista canónica de localidades
  const [localidadesMaestras, setLocalidadesMaestras] = useState<Localidad[]>(LOCALIDADES_CANONICAS_DEFAULT);

  useEffect(() => {
    let isMounted = true;
    void getLocalidades().then((data) => {
      if (isMounted && data && data.length > 0) {
        setLocalidadesMaestras(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const localidadesDisponibles = useMemo(() => {
    return localidadesMaestras.map((l) => l.nombre);
  }, [localidadesMaestras]);

  // Obtener lista dinámica de niveles educativos únicos
  const nivelesDisponibles = useMemo(() => {
    const set = new Set<string>();
    postulantes.forEach((p) => {
      if (p.nivel_educativo && p.nivel_educativo.trim()) {
        set.add(p.nivel_educativo.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [postulantes]);

  // Filtrado reactivo en cliente
  const filteredPostulantes = useMemo(() => {
    return postulantes.filter((p) => {
      // Filtro de localidad
      if (selectedLocalidad !== 'todas') {
        if (!p.localidad || p.localidad.toLowerCase() !== selectedLocalidad.toLowerCase()) {
          return false;
        }
      }

      // Filtro de nivel educativo
      if (selectedNivelEducativo !== 'todos') {
        if (
          !p.nivel_educativo ||
          p.nivel_educativo.toLowerCase() !== selectedNivelEducativo.toLowerCase()
        ) {
          return false;
        }
      }

      // Filtro de habilidad específica
      if (filterHabilidad.trim()) {
        const queryHab = filterHabilidad.toLowerCase().trim();
        const hasSkill = (p.habilidades || []).some((h) => h.toLowerCase().includes(queryHab));
        const inExp = (p.experiencia_resumen || '').toLowerCase().includes(queryHab);
        if (!hasSkill && !inExp) return false;
      }

      // Filtro de texto exhaustivo (nombre, apellido, DNI, nivel educativo, localidad, situación laboral, teléfono, email, habilidades o resumen laboral)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNombre = (p.nombre || '').toLowerCase().includes(q);
        const matchesApellido = (p.apellido || '').toLowerCase().includes(q);
        const matchesDni = (p.dni || '').toLowerCase().includes(q);
        const matchesNivelEducativo = (p.nivel_educativo || '').toLowerCase().includes(q);
        const matchesLocalidad = (p.localidad || '').toLowerCase().includes(q);
        const matchesSituacion = (p.situacion_laboral_actual || '').toLowerCase().includes(q);
        const matchesTelefono = (p.telefono || '').toLowerCase().includes(q);
                const matchesResumen = (p.experiencia_resumen || '').toLowerCase().includes(q);
        const matchesHabilidades = (p.habilidades || []).some((h) =>
          h.toLowerCase().includes(q)
        );
        return (
          matchesNombre ||
          matchesApellido ||
          matchesDni ||
          matchesNivelEducativo ||
          matchesLocalidad ||
          matchesSituacion ||
          matchesTelefono ||
                    matchesResumen ||
          matchesHabilidades
        );
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'titulo') {
        const nameA = `${a.apellido || ''} ${a.nombre || ''}`.trim();
        const nameB = `${b.apellido || ''} ${b.nombre || ''}`.trim();
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
  }, [postulantes, selectedLocalidad, selectedNivelEducativo, searchTerm, filterHabilidad, sortOrder]);

  const totalPages = Math.ceil(filteredPostulantes.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPostulantes = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredPostulantes.slice(start, start + PAGE_SIZE);
  }, [filteredPostulantes, safeCurrentPage, PAGE_SIZE]);

  const handleOpenDetail = (p: PostulanteAdminItem) => {
    setSelectedPostulante(p);
    setIsDetailModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterHabilidad('');
    setSelectedLocalidad('todas');
    setSelectedNivelEducativo('todos');
  };

  const hasActiveFilters =
    Boolean(searchTerm) || selectedLocalidad !== 'todas' || selectedNivelEducativo !== 'todos';

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-zinc-200 shadow-xs space-y-2 mb-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por DNI, nombre, nivel educativo, localidad, oficio..."
              className="pl-8 h-8 text-xs w-full bg-zinc-50 border-zinc-200"
            />
          </div>

          {/* Selectores de Filtro */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Localidad */}
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2 h-8 rounded-lg border border-zinc-200 text-xs">
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

            {/* Filtro por Nivel Educativo */}
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2 h-8 rounded-lg border border-zinc-200 text-xs">
              <GraduationCap className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500 font-medium">Estudios:</span>
              <select
                value={selectedNivelEducativo}
                onChange={(e) => setSelectedNivelEducativo(e.target.value)}
                className="bg-transparent text-zinc-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="todos">Todos los niveles</option>
                {nivelesDisponibles.map((niv) => (
                  <option key={niv} value={niv}>
                    {niv}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Orden */}
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2 h-8 rounded-lg border border-zinc-200 text-xs">
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

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-brand-800 hover:underline px-2 py-1 font-semibold"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Indicador de resultados */}
        <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-100">
          <span>
            Mostrando <strong>{filteredPostulantes.length}</strong> de{' '}
            <strong>{postulantes.length}</strong> postulantes registrados
          </span>
          {hasActiveFilters && (
            <span className="text-zinc-400">Filtros aplicados</span>
          )}
        </div>
      </div>

      {/* Tabla de Postulantes */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filteredPostulantes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No se encontraron postulantes"
              description={
                hasActiveFilters
                  ? 'No hay postulantes que coincidan con los criterios o la localidad seleccionada.'
                  : 'Aún no existen postulantes registrados en el sistema.'
              }
              action={
                hasActiveFilters
                  ? {
                      label: 'Limpiar filtros de búsqueda',
                      onClick: handleClearFilters,
                      variant: 'outline',
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto scroll-smooth">
            <table className="w-full min-w-[950px] text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Postulante</th>
                  <th className="py-3 px-3">Localidad y contacto</th>
                  <th className="py-3 px-3">Nivel educativo</th>
                  <th className="py-3 px-3">Situación laboral</th>
                  <th className="py-3 px-3">Postulaciones y rechazos</th>
                  <th className="py-3 px-3">Currículums</th>
                  {/* Columnas independientes sin título de encabezado */}
                  <th className="py-3 px-1.5 w-24 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                  <th className="py-3 px-1.5 w-24 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {paginatedPostulantes.map((postulante) => {
                  const cvCount = postulante.curriculums?.length || 0;

                  return (
                    <tr
                      key={postulante.id}
                      className="hover:bg-zinc-50/60 transition-colors group"
                    >
                      {/* Postulante */}
                      <td className="py-3 px-3.5 font-medium text-zinc-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-900 flex items-center justify-center font-bold text-xs shrink-0">
                            {postulante.nombre.charAt(0)}
                            {postulante.apellido ? postulante.apellido.charAt(0) : ''}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block leading-tight">
                              {postulante.nombre} {postulante.apellido || ''}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono block">
                              DNI: {postulante.dni || 'Sin DNI'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Localidad & Contacto */}
                      <td className="py-3 px-3 space-y-0.5">
                        <div className="flex items-center gap-1 font-semibold text-zinc-800">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{postulante.localidad || 'Funes'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{postulante.telefono || 'Sin teléfono'}</span>
                        </div>
                      </td>

                      {/* Nivel Educativo */}
                      <td className="py-3 px-3">
                        <span className="text-zinc-800 block font-medium">
                          {postulante.nivel_educativo || 'No especificado'}
                        </span>
                      </td>

                      {/* Situación Laboral */}
                      <td className="py-3 px-3">
                        <Badge variant="zinc" className="text-[11px]">
                          {postulante.situacion_laboral_actual || 'No informada'}
                        </Badge>
                      </td>

                      {/* Postulaciones y rechazos (Interactiva y con rechazos en rojo) */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPostulanteHistory(postulante);
                            setIsHistoryModalOpen(true);
                          }}
                          className="flex flex-col items-start gap-1 group/history text-left cursor-pointer transition-transform hover:scale-[1.02]"
                          title="Ver historial de postulaciones y motivos de rechazo"
                        >
                          <span className="text-xs font-semibold text-zinc-800 group-hover/history:text-brand-900 group-hover/history:underline flex items-center gap-1">
                            {postulante.total_postulaciones || 0} postulaci{(postulante.total_postulaciones || 0) === 1 ? 'ón' : 'ones'}
                          </span>
                          {(postulante.total_rechazos || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              {postulante.total_rechazos} rechazo{(postulante.total_rechazos || 0) === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400">0 rechazos</span>
                          )}
                        </button>
                      </td>

                      {/* Currículums */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-semibold text-zinc-800">
                            {cvCount} CV{cvCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>

                      {/* Columna Acción 1: Legajo */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(postulante)}
                          className="h-8 px-2.5 text-zinc-600 hover:text-zinc-900 gap-1 text-xs w-full justify-center"
                          title="Ver legajo completo del postulante"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Legajo</span>
                        </Button>
                      </td>

                      {/* Columna Acción 2: Historial */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPostulanteHistory(postulante);
                            setIsHistoryModalOpen(true);
                          }}
                          className="h-8 px-2.5 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 gap-1 text-xs w-full justify-center"
                          title="Ver historial de postulaciones y rechazos"
                        >
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Historial</span>
                        </Button>
                      </td>

                      {/* Columna Acción 3: Invitar */}
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setPostulanteToInvite(postulante);
                            setIsInviteModalOpen(true);
                          }}
                          className="h-8 px-2.5 bg-brand-800 hover:bg-brand-900 text-white gap-1 text-xs font-semibold shadow-2xs w-full justify-center"
                          title="Invitar a una búsqueda laboral activa"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Invitar</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {filteredPostulantes.length > PAGE_SIZE && (
          <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredPostulantes.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>


      {/* Modal de Invitación a Oferta */}
      {postulanteToInvite && (
        <InviteToJobModal
          isOpen={isInviteModalOpen}
          postulanteId={postulanteToInvite.id}
          postulanteNombre={`${postulanteToInvite.nombre} ${postulanteToInvite.apellido || ''}`}
          ofertasDisponibles={ofertasDisponibles}
          onClose={() => {
            setIsInviteModalOpen(false);
            setPostulanteToInvite(null);
          }}
          onConfirm={async (ofertaId, mensaje) => {
            await invitarPostulanteAOferta({
              postulanteId: postulanteToInvite.id,
              ofertaId,
              mensaje,
            });
            onRefresh();
          }}
        />
      )}

      {/* Modal de Legajo Completo del Postulante */}
      <AdminApplicantDetailModal
        postulante={selectedPostulante}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onOpenHistory={() => {
          setPostulanteHistory(selectedPostulante);
          setIsHistoryModalOpen(true);
        }}
      />

      {/* Modal Exclusivo de Historial y Derivaciones */}
      <AdminApplicantHistoryModal
        postulante={postulanteHistory}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setPostulanteHistory(null);
        }}
      />
    </div>
  );
}
