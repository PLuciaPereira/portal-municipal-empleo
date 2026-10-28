'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Curso, EstadoPostulanteCurso } from '@/types/database';
import {
  getCursosAdmin,
  crearCursoAdmin,
  actualizarCursoAdmin,
  toggleEstadoCursoAdmin,
  getAsignacionesCursosAdmin,
  asignarPostulanteACursoAdmin,
  actualizarEstadoAsignacionCursoAdmin,
  PostulanteCursoAdminItem,
} from '@/lib/admin';
import { CourseFormModal } from './CourseFormModal';
import { CourseAssignModal } from './CourseAssignModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  GraduationCap,
  Plus,
  Search,
  Building,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Edit2,
  UserPlus,
  RefreshCw,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';

const ESTADOS_ASIGNACION_CONFIG: Record<
  EstadoPostulanteCurso,
  { label: string; variant: 'blue' | 'amber' | 'emerald' | 'rose' | 'zinc' }
> = {
  asignado: { label: 'Asignado', variant: 'blue' },
  en_curso: { label: 'En curso', variant: 'amber' },
  completado: { label: 'Completado', variant: 'emerald' },
  abandonado: { label: 'Abandonado', variant: 'rose' },
  cancelado: { label: 'Cancelado', variant: 'zinc' },
};

export function CoursesManager() {
  const [subTab, setSubTab] = useState<'catalogo' | 'derivaciones'>('catalogo');

  // Estados de Cursos
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [searchCurso, setSearchCurso] = useState('');
  const [filtroEstadoCurso, setFiltroEstadoCurso] = useState<'activos' | 'inactivos' | 'todos'>('todos');

  // Estados de Asignaciones
  const [asignaciones, setAsignaciones] = useState<PostulanteCursoAdminItem[]>([]);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(true);
  const [searchAsignacion, setSearchAsignacion] = useState('');
  const [filtroCursoAsignacion, setFiltroCursoAsignacion] = useState<string>('todos');
  const [filtroEstadoAsignacion, setFiltroEstadoAsignacion] = useState<EstadoPostulanteCurso | 'todos'>('todos');

  // Modales
  const [modalCursoOpen, setModalCursoOpen] = useState(false);
  const [cursoAEditar, setCursoAEditar] = useState<Curso | null>(null);

  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [cursoParaAsignar, setCursoParaAsignar] = useState<Curso | null>(null);

  const [confirmToggleCurso, setConfirmToggleCurso] = useState<Curso | null>(null);

  // Alertas / Mensajes
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Cargar Cursos
  const loadCursos = useCallback(async () => {
    setLoadingCursos(true);
    try {
      const data = await getCursosAdmin({
        filtro: filtroEstadoCurso,
        query: searchCurso,
      });
      setCursos(data);
    } catch (err) {
      console.error('Error cargando cursos:', err);
      notify('error', 'No se pudieron cargar los cursos.');
    } finally {
      setLoadingCursos(false);
    }
  }, [filtroEstadoCurso, searchCurso]);

  // Cargar Asignaciones
  const loadAsignaciones = useCallback(async () => {
    setLoadingAsignaciones(true);
    try {
      const data = await getAsignacionesCursosAdmin({
        cursoId: filtroCursoAsignacion,
        estado: filtroEstadoAsignacion,
        query: searchAsignacion,
      });
      setAsignaciones(data);
    } catch (err) {
      console.error('Error cargando derivaciones de cursos:', err);
      notify('error', 'No se pudieron cargar las derivaciones.');
    } finally {
      setLoadingAsignaciones(false);
    }
  }, [filtroCursoAsignacion, filtroEstadoAsignacion, searchAsignacion]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isMounted) return;
      await Promise.all([loadCursos(), loadAsignaciones()]);
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [loadCursos, loadAsignaciones]);

  // Manejo de Creación / Edición
  const handleSaveCurso = async (datos: {
    titulo: string;
    descripcion?: string | null;
    institucion?: string | null;
    duracion?: string | null;
    activo?: boolean;
  }) => {
    if (cursoAEditar) {
      const res = await actualizarCursoAdmin(cursoAEditar.id, datos);
      if (res.success) {
        notify('success', 'Capacitación actualizada correctamente.');
        void loadCursos();
        return { success: true };
      }
      return { success: false, error: res.error };
    } else {
      const res = await crearCursoAdmin(datos);
      if (res.success) {
        notify('success', 'Nueva capacitación creada y dada de alta con éxito.');
        void loadCursos();
        return { success: true };
      }
      return { success: false, error: res.error };
    }
  };

  // Toggle Activo/Inactivo
  const handleToggleEstadoCurso = async () => {
    if (!confirmToggleCurso) return;
    const nuevoEstado = !confirmToggleCurso.activo;
    const res = await toggleEstadoCursoAdmin(confirmToggleCurso.id, nuevoEstado);
    if (res.success) {
      notify(
        'success',
        `El curso ahora se encuentra ${nuevoEstado ? 'activo para postulaciones' : 'inactivo'}.`
      );
      void loadCursos();
    } else {
      notify('error', res.error || 'No se pudo cambiar el estado del curso.');
    }
    setConfirmToggleCurso(null);
  };

  // Asignar Postulante
  const handleAssignPostulante = async (params: {
    postulante_id: string;
    curso_id: string;
    observaciones?: string;
  }) => {
    const res = await asignarPostulanteACursoAdmin(params);
    if (res.success) {
      notify('success', 'Postulante derivado a la capacitación con éxito.');
      void loadAsignaciones();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // Cambiar Estado de Asignación
  const handleChangeEstadoAsignacion = async (
    asignacionId: string,
    nuevoEstado: EstadoPostulanteCurso
  ) => {
    const res = await actualizarEstadoAsignacionCursoAdmin(asignacionId, nuevoEstado);
    if (res.success) {
      notify('success', `Estado actualizado a "${ESTADOS_ASIGNACION_CONFIG[nuevoEstado].label}".`);
      void loadAsignaciones();
    } else {
      notify('error', res.error || 'No se pudo actualizar el estado.');
    }
  };

  // Contadores
  const totalActivos = useMemo(() => cursos.filter((c) => c.activo).length, [cursos]);
  const totalDerivaciones = useMemo(() => asignaciones.length, [asignaciones]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Notificación de feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Subnavegación Interna */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('catalogo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'catalogo'
                ? 'bg-brand-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Catálogo de Cursos ({cursos.length})</span>
          </button>

          <button
            onClick={() => setSubTab('derivaciones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'derivaciones'
                ? 'bg-brand-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Postulantes Derivados ({totalDerivaciones})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'catalogo' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCursoAEditar(null);
                setModalCursoOpen(true);
              }}
              className="bg-brand-800 hover:bg-brand-900 text-white gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Curso</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCursoParaAsignar(null);
                setModalAsignarOpen(true);
              }}
              disabled={totalActivos === 0}
              className="bg-brand-800 hover:bg-brand-900 text-white gap-1.5 shadow-2xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Derivar Postulante</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadCursos();
              void loadAsignaciones();
            }}
            title="Recargar datos"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingCursos || loadingAsignaciones ? 'animate-spin' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: CATÁLOGO DE CURSOS Y CAPACITACIONES                              */}
      {/* ========================================================================= */}
      {subTab === 'catalogo' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Cursos */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
            <div className="sm:col-span-3 relative">
              <Input
                type="text"
                placeholder="Buscar por título, temática o institución formadora..."
                value={searchCurso}
                onChange={(e) => setSearchCurso(e.target.value)}
                className="pl-8 text-xs h-9"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
            </div>

            <div>
              <select
                value={filtroEstadoCurso}
                onChange={(e) =>
                  setFiltroEstadoCurso(e.target.value as 'activos' | 'inactivos' | 'todos')
                }
                className="w-full h-9 text-xs rounded-xl border border-zinc-200 bg-white px-2.5 text-zinc-700 focus:outline-hidden focus:border-brand-500 font-medium"
              >
                <option value="todos">Todos los cursos</option>
                <option value="activos">Sólo Activos ({totalActivos})</option>
                <option value="inactivos">Inactivos / Desactivados</option>
              </select>
            </div>
          </div>

          {/* Listado de Cursos */}
          {loadingCursos ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-800" />
              Cargando catálogo formativo...
            </div>
          ) : cursos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center space-y-3">
              <GraduationCap className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900">
                No hay cursos disponibles
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No se registraron capacitaciones que coincidan con los criterios de búsqueda ingresados.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchCurso('');
                  setFiltroEstadoCurso('todos');
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cursos.map((c) => (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between p-5 hover:shadow-xs ${
                    c.activo ? 'border-zinc-200' : 'border-zinc-200 bg-zinc-50/50 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={c.activo ? 'emerald' : 'zinc'} className="text-[10px]">
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(c.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 leading-snug">
                        {c.titulo}
                      </h4>
                      {c.descripcion && (
                        <p className="text-xs text-zinc-600 mt-1 line-clamp-3">
                          {c.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-zinc-500">
                      {c.institucion && (
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{c.institucion}</span>
                        </div>
                      )}
                      {c.duracion && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{c.duracion}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setCursoParaAsignar(c);
                        setModalAsignarOpen(true);
                      }}
                      disabled={!c.activo}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 hover:text-brand-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Derivar alumno</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setCursoAEditar(c);
                          setModalCursoOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                        title="Editar capacitación"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setConfirmToggleCurso(c)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          c.activo
                            ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                        }`}
                        title={c.activo ? 'Desactivar curso' : 'Reactivar curso'}
                      >
                        {c.activo ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: POSTULANTES DERIVADOS A CURSOS                                   */}
      {/* ========================================================================= */}
      {subTab === 'derivaciones' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Derivaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
            <div className="sm:col-span-2 relative">
              <Input
                type="text"
                placeholder="Buscar por alumno, DNI o curso..."
                value={searchAsignacion}
                onChange={(e) => setSearchAsignacion(e.target.value)}
                className="pl-8 text-xs h-9"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
            </div>

            <div>
              <select
                value={filtroCursoAsignacion}
                onChange={(e) => setFiltroCursoAsignacion(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-zinc-200 bg-white px-2.5 text-zinc-700 focus:outline-hidden focus:border-brand-500 font-medium"
              >
                <option value="todos">Todos los cursos</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtroEstadoAsignacion}
                onChange={(e) =>
                  setFiltroEstadoAsignacion(e.target.value as EstadoPostulanteCurso | 'todos')
                }
                className="w-full h-9 text-xs rounded-xl border border-zinc-200 bg-white px-2.5 text-zinc-700 focus:outline-hidden focus:border-brand-500 font-medium"
              >
                <option value="todos">Todos los estados</option>
                <option value="asignado">Asignados</option>
                <option value="en_curso">En curso</option>
                <option value="completado">Completados</option>
                <option value="abandonado">Abandonados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Tabla de Alumnos / Derivaciones */}
          {loadingAsignaciones ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-800" />
              Cargando historial de derivaciones formativas...
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900">
                No hay derivaciones registradas
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No se han realizado derivaciones que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Postulante / Residencia</th>
                      <th className="py-3 px-4">Curso Asignado</th>
                      <th className="py-3 px-4">Fecha Asignación</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Observaciones OE</th>
                      <th className="py-3 px-4 text-right">Actualizar Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {asignaciones.map((item) => {
                      const cfg =
                        ESTADOS_ASIGNACION_CONFIG[item.estado] || {
                          label: item.estado,
                          variant: 'zinc',
                        };

                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-zinc-900">
                              {item.postulante?.apellido}, {item.postulante?.nombre}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                              {item.postulante?.dni && <span>DNI: {item.postulante.dni}</span>}
                              {item.postulante?.localidad && (
                                <span>• {item.postulante.localidad}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-bold text-brand-900">
                              {item.curso?.titulo || 'Capacitación no disponible'}
                            </p>
                            {item.curso?.institucion && (
                              <p className="text-[11px] text-zinc-500">
                                {item.curso.institucion}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              <span>
                                {new Date(item.fecha_asignacion).toLocaleDateString('es-AR')}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge variant={cfg.variant} className="text-[10px] font-bold">
                              {cfg.label}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-zinc-600 max-w-xs">
                            {item.observaciones ? (
                              <div className="flex items-start gap-1.5">
                                <FileText className="w-3 h-3 text-zinc-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 text-[11px]">
                                  {item.observaciones}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic text-[11px]">- Sin notas -</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <select
                              value={item.estado}
                              onChange={(e) =>
                                handleChangeEstadoAsignacion(
                                  item.id,
                                  e.target.value as EstadoPostulanteCurso
                                )
                              }
                              className="text-xs rounded-xl border border-zinc-200 bg-white py-1 px-2.5 text-zinc-700 font-semibold focus:outline-hidden focus:border-brand-500 cursor-pointer"
                            >
                              <option value="asignado">Asignado</option>
                              <option value="en_curso">En curso</option>
                              <option value="completado">Completado</option>
                              <option value="abandonado">Abandonado</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Formulario Alta/Edición Curso */}
      <CourseFormModal
        isOpen={modalCursoOpen}
        curso={cursoAEditar}
        onClose={() => {
          setModalCursoOpen(false);
          setCursoAEditar(null);
        }}
        onSave={handleSaveCurso}
      />

      {/* Modal: Derivar Postulante a Curso */}
      <CourseAssignModal
        isOpen={modalAsignarOpen}
        cursoInicial={cursoParaAsignar}
        cursosDisponibles={cursos}
        onClose={() => {
          setModalAsignarOpen(false);
          setCursoParaAsignar(null);
        }}
        onAssign={handleAssignPostulante}
      />

      {/* ConfirmDialog: Activar / Desactivar Curso */}
      <ConfirmDialog
        isOpen={Boolean(confirmToggleCurso)}
        title={confirmToggleCurso?.activo ? '¿Desactivar capacitación?' : '¿Reactivar capacitación?'}
        description={
          confirmToggleCurso?.activo
            ? `El curso "${confirmToggleCurso?.titulo}" dejará de estar disponible para nuevas derivaciones de postulantes.`
            : `El curso "${confirmToggleCurso?.titulo}" volverá a estar habilitado para derivar candidatos.`
        }
        confirmText={confirmToggleCurso?.activo ? 'Sí, desactivar' : 'Sí, reactivar'}
        cancelText="Volver"
        variant={confirmToggleCurso?.activo ? 'destructive' : 'primary'}
        onConfirm={handleToggleEstadoCurso}
        onClose={() => setConfirmToggleCurso(null)}
      />
    </div>
  );
}
