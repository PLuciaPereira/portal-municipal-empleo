'use client';

import React, { useState, useMemo } from 'react';
import { PostulanteAdminItem } from '@/lib/admin';
import { AdminApplicantDetailModal } from './AdminApplicantDetailModal';
import { InviteToJobModal } from './InviteToJobModal';
import { OfertaAdminItem, invitarPostulanteAOferta } from '@/lib/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Search,
  Eye,
  MapPin,
  GraduationCap,
  FileText,
  Phone,
  Send,
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

  // Modal de detalle
  // Modal de invitación
  const [postulanteToInvite, setPostulanteToInvite] = useState<PostulanteAdminItem | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [filterHabilidad, setFilterHabilidad] = useState('');
  const [selectedPostulante, setSelectedPostulante] = useState<PostulanteAdminItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Obtener lista dinámica de localidades únicas registradas
  const localidadesDisponibles = useMemo(() => {
    const locSet = new Set<string>();
    postulantes.forEach((p) => {
      if (p.localidad && p.localidad.trim()) {
        locSet.add(p.localidad.trim());
      }
    });
    return Array.from(locSet).sort((a, b) => a.localeCompare(b));
  }, [postulantes]);

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

      // Filtro de texto (nombre, apellido, DNI, habilidades o resumen laboral)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNombre = (p.nombre || '').toLowerCase().includes(q);
        const matchesApellido = (p.apellido || '').toLowerCase().includes(q);
        const matchesDni = (p.dni || '').toLowerCase().includes(q);
        const matchesResumen = (p.experiencia_resumen || '').toLowerCase().includes(q);
        const matchesHabilidades = (p.habilidades || []).some((h) =>
          h.toLowerCase().includes(q)
        );
        return (
          matchesNombre ||
          matchesApellido ||
          matchesDni ||
          matchesResumen ||
          matchesHabilidades
        );
      }

      return true;
    });
  }, [postulantes, selectedLocalidad, selectedNivelEducativo, searchTerm, filterHabilidad]);

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
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apellido, DNI o habilidad..."
              className="pl-9 h-10 text-xs w-full bg-zinc-50 border-zinc-200"
            />
          </div>

          {/* Selectores de Filtro */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Localidad */}
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-xl border border-zinc-200 text-xs">
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
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-xl border border-zinc-200 text-xs">
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
          <div className="p-12 text-center text-zinc-500 text-sm space-y-3">
            <div className="w-8 h-8 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Cargando padrón de postulantes...</p>
          </div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Postulante</th>
                  <th className="py-3.5 px-4">Localidad y Contacto</th>
                  <th className="py-3.5 px-4">Nivel Educativo</th>
                  <th className="py-3.5 px-4">Situación Laboral</th>
                  <th className="py-3.5 px-4">Currículums</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredPostulantes.map((postulante) => {
                  const cvCount = postulante.curriculums?.length || 0;

                  return (
                    <tr
                      key={postulante.id}
                      className="hover:bg-zinc-50/60 transition-colors group"
                    >
                      {/* Postulante */}
                      <td className="py-3.5 px-4 font-medium text-zinc-900">
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
                      <td className="py-3.5 px-4 space-y-0.5">
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
                      <td className="py-3.5 px-4">
                        <span className="text-zinc-800 block font-medium">
                          {postulante.nivel_educativo || 'No especificado'}
                        </span>
                      </td>

                      {/* Situación Laboral */}
                      <td className="py-3.5 px-4">
                        <Badge variant="zinc" className="text-[11px]">
                          {postulante.situacion_laboral_actual || 'No informada'}
                        </Badge>
                      </td>

                      {/* Currículums */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-semibold text-zinc-800">
                            {cvCount} CV{cvCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(postulante)}
                          className="h-8 px-2 text-zinc-600 hover:text-zinc-900 gap-1 text-xs"
                          title="Ver legajo completo del postulante"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Legajo</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
      />
    </div>
  );
}
