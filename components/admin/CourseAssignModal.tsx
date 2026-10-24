'use client';

import { useState, useEffect } from 'react';
import { Curso, Perfil } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getPostulantesAdmin } from '@/lib/admin';
import {
  UserPlus,
  X,
  Search,
  MapPin,
  GraduationCap,
  AlertCircle,
  Loader2,
  Check,
  User,
} from 'lucide-react';

interface CourseAssignModalProps {
  cursoInicial?: Curso | null;
  cursosDisponibles: Curso[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (params: {
    postulante_id: string;
    curso_id: string;
    observaciones?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function CourseAssignModal({
  cursoInicial,
  cursosDisponibles,
  isOpen,
  onClose,
  onAssign,
}: CourseAssignModalProps) {
  const [cursoSeleccionadoId, setCursoSeleccionadoId] = useState<string>(
    cursoInicial?.id || cursosDisponibles[0]?.id || ''
  );

  // Búsqueda de postulante
  const [searchPostulante, setSearchPostulante] = useState('');
  const [localidadFiltro, setLocalidadFiltro] = useState<string>('todas');
  const [postulantes, setPostulantes] = useState<Perfil[]>([]);
  const [loadingPostulantes, setLoadingPostulantes] = useState(false);
  const [postulanteSeleccionado, setPostulanteSeleccionado] = useState<Perfil | null>(null);

  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar curso al abrir modal
  useEffect(() => {
    if (cursoInicial?.id) {
      setCursoSeleccionadoId(cursoInicial.id);
    } else if (cursosDisponibles.length > 0 && !cursoSeleccionadoId) {
      setCursoSeleccionadoId(cursosDisponibles[0].id);
    }
  }, [cursoInicial, cursosDisponibles, cursoSeleccionadoId]);

  // Cargar postulantes iniciales
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchPostulantes = async () => {
      setLoadingPostulantes(true);
      try {
        const res = await getPostulantesAdmin({
          localidad: localidadFiltro === 'todas' ? undefined : localidadFiltro,
          query: searchPostulante.trim() || undefined,
        });
        if (isMounted && res.data) {
          setPostulantes(res.data);
        }
      } catch (err) {
        console.error('Error cargando postulantes para asignación:', err);
      } finally {
        if (isMounted) setLoadingPostulantes(false);
      }
    };

    const timer = setTimeout(fetchPostulantes, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchPostulante, localidadFiltro]);

  if (!isOpen) return null;

  // Localidades únicas para el filtro estándar
  const localidadesDisponibles = Array.from(
    new Set(postulantes.map((p) => p.localidad).filter((loc): loc is string => Boolean(loc)))
  ).sort();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSeleccionadoId) {
      setError('Por favor seleccioná el curso al que querés derivar.');
      return;
    }
    if (!postulanteSeleccionado) {
      setError('Por favor seleccioná un postulante de la lista para derivar.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await onAssign({
      postulante_id: postulanteSeleccionado.id,
      curso_id: cursoSeleccionadoId,
      observaciones: observaciones.trim() || undefined,
    });

    setSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Ocurrió un error al registrar la derivación al curso.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-brand-800" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Derivar Postulante a Capacitación
              </h2>
              <p className="text-xs text-zinc-500">
                Asigná una vacante formativa para fortalecer las competencias laborales del candidato.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleConfirm} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Curso */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Curso / Capacitación a asignar <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={cursoSeleccionadoId}
                onChange={(e) => setCursoSeleccionadoId(e.target.value)}
                disabled={submitting}
                className="w-full text-xs rounded-xl border border-zinc-200 bg-white p-3 pr-8 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
              >
                {cursosDisponibles
                  .filter((c) => c.activo)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} {c.institucion ? `(${c.institucion})` : ''} - {c.duracion || 'Duración a convenir'}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Búsqueda y Selección de Postulante */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700">
              Seleccionar Postulante <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 relative">
                <Input
                  type="text"
                  placeholder="Buscar por apellido, nombre o DNI..."
                  value={searchPostulante}
                  onChange={(e) => setSearchPostulante(e.target.value)}
                  className="pl-8 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>

              <div>
                <select
                  value={localidadFiltro}
                  onChange={(e) => setLocalidadFiltro(e.target.value)}
                  className="w-full h-[38px] text-xs rounded-xl border border-zinc-200 bg-white px-2.5 text-zinc-700 focus:outline-hidden focus:border-brand-500"
                >
                  <option value="todas">Todas las localidades</option>
                  {localidadesDisponibles.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listado scrolleable de postulantes */}
            <div className="border border-zinc-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-zinc-100 bg-zinc-50/30">
              {loadingPostulantes ? (
                <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-800" />
                  Buscando postulantes...
                </div>
              ) : postulantes.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">
                  No se encontraron postulantes con los filtros ingresados.
                </div>
              ) : (
                postulantes.map((p) => {
                  const isSelected = postulanteSeleccionado?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPostulanteSeleccionado(p)}
                      className={`w-full text-left p-3 flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-brand-50/80 border-l-4 border-brand-800'
                          : 'hover:bg-zinc-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-brand-800 text-white'
                              : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">
                            {p.apellido}, {p.nombre}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            {p.dni && <span>DNI: {p.dni}</span>}
                            {p.localidad && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {p.localidad}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-brand-800 text-white flex items-center justify-center shrink-0 ml-2">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Postulante seleccionado badge */}
            {postulanteSeleccionado && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="font-semibold">
                  Candidato seleccionado: {postulanteSeleccionado.nombre}{' '}
                  {postulanteSeleccionado.apellido} (DNI: {postulanteSeleccionado.dni || 'Sin registrar'})
                </span>
                <button
                  type="button"
                  onClick={() => setPostulanteSeleccionado(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-[11px] underline font-bold cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* Observaciones de derivación */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Motivo u Observaciones de la Derivación (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Indicar competencias a reforzar, perfil de interés o notas internas para la Oficina de Empleo..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={submitting}
              className="w-full text-xs rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Esta información queda asentada en el legajo y es visible para el postulante en su panel.
            </p>
          </div>

          {/* Footer de Acciones */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !postulanteSeleccionado || !cursoSeleccionadoId}
              className="bg-brand-800 hover:bg-brand-900 text-white min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Asignando...
                </>
              ) : (
                'Confirmar Derivación'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
