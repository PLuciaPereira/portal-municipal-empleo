'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState } from 'react';
import {
  PostulanteAdminItem,
  getCurriculumSignedUrlAdmin,
} from '@/lib/admin';
import { Button } from '@/components/ui/Button';
import { Perfil, Oferta, Empresa } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  MapPin,
  Phone,
  Briefcase,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  ExternalLink,
  GraduationCap,
  Clock,
} from 'lucide-react';

interface AdminApplicantDetailModalProps {
  postulante: (Partial<PostulanteAdminItem> & Pick<Perfil, 'id' | 'nombre'>) | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory?: () => void;
  ofertaComparativa?: (Partial<Oferta> & {
    empresa?: Partial<Empresa> | null;
  }) | null;
}

export function AdminApplicantDetailModal({
  postulante,
  isOpen,
  onClose,
  onOpenHistory,
  ofertaComparativa,
}: AdminApplicantDetailModalProps) {
  useBodyScrollLock(Boolean(isOpen));
  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  if (!isOpen || !postulante) return null;

  const handleOpenCv = async (cvId: string, archivoUrl: string) => {
    setCvError(null);
    setDownloadingCvId(cvId);
    try {
      const res = await getCurriculumSignedUrlAdmin(archivoUrl);
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setCvError(res.error || 'No se pudo generar el enlace de descarga del currículum.');
      }
    } catch {
      setCvError('Error al intentar abrir el currículum.');
    } finally {
      setDownloadingCvId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-postulante-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div className="relative w-full max-w-4xl max-h-[92dvh] flex flex-col bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-900 border border-brand-200/50 flex items-center justify-center font-bold text-base shrink-0">
              {postulante.nombre.charAt(0)}
              {postulante.apellido ? postulante.apellido.charAt(0) : ''}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-postulante-title" className="text-lg font-bold text-zinc-900 leading-tight">
                  {postulante.nombre} {postulante.apellido || ''}
                </h2>
                {postulante.es_residente_funes && (
                  <Badge variant="emerald" className="text-[10px]">
                    Residente de Funes
                  </Badge>
                )}
                {postulante.registro_asistido && (
                  <Badge variant="zinc" className="text-[10px]">
                    Registro asistido
                  </Badge>
                )}
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                DNI: <strong className="text-zinc-800">{postulante.dni || 'No registrado'}</strong> · Registrado el{' '}
                {postulante.created_at ? new Date(postulante.created_at).toLocaleDateString('es-AR') : 'Reciente'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Cerrar legajo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 scroll-smooth">
          {/* Mensaje de error al abrir CV si ocurre */}
          {cvError && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{cvError}</span>
            </div>
          )}

          {/* Panel Comparativo: Búsqueda Laboral vs Perfil del Postulante */}
          {ofertaComparativa && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 overflow-hidden text-xs">
              {/* Cabecera de la Comparativa */}
              <div className="px-4 py-3 bg-zinc-100/80 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-brand-900 text-white flex items-center justify-center shrink-0">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block leading-tight">
                      Comparativa con la oferta postulada
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 leading-tight">
                      {ofertaComparativa.titulo}
                    </h3>
                  </div>
                </div>

                <div className="text-left sm:text-right text-[11px] text-zinc-600">
                  <span className="font-semibold text-zinc-800 block">
                    {ofertaComparativa.empresa?.nombre_fantasia || ofertaComparativa.empresa?.razon_social || 'Empresa'}
                  </span>
                  <span>
                    {ofertaComparativa.tipo_jornada || 'Jornada no informada'}
                    {ofertaComparativa.ubicacion && ` · ${ofertaComparativa.ubicacion}`}
                  </span>
                </div>
              </div>

              {/* Grilla Comparativa en Dos Columnas Paralelas y Simétricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 bg-white">
                {/* Columna Izquierda: Requerimientos fijados por la Empresa */}
                <div className="p-4 space-y-3">
                  <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block">
                    Requisitos solicitados por la empresa
                  </span>

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[11px] font-medium text-zinc-500 block">Requisitos del puesto:</span>
                      <p className="text-zinc-800 whitespace-pre-line leading-relaxed text-xs mt-0.5">
                        {ofertaComparativa.requisitos || 'No se registraron requisitos específicos.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-500">Experiencia requerida:</span>
                      <span className="font-semibold text-zinc-900">
                        {ofertaComparativa.experiencia_requerida || 'No especificada'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-500">Localidad de la vacante:</span>
                      <span className="font-semibold text-zinc-900">
                        {ofertaComparativa.ubicacion || 'Funes'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Antecedentes del Postulante */}
                <div className="p-4 space-y-3">
                  <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block">
                    Perfil del postulante registrado
                  </span>

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[11px] font-medium text-zinc-500 block">Nivel educativo:</span>
                      <span className="font-semibold text-zinc-900 block text-xs mt-0.5">
                        {postulante.nivel_educativo || 'Sin nivel educativo informado'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-zinc-100">
                      <span className="text-[11px] font-medium text-zinc-500 block">Habilidades declaradas:</span>
                      {postulante.habilidades && postulante.habilidades.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {postulante.habilidades.map((hab, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200"
                            >
                              {hab}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs italic block mt-0.5">
                          Sin habilidades detalladas
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-500">Residencia del postulante:</span>
                      <span className="font-semibold text-zinc-900">
                        {postulante.es_residente_funes
                          ? 'Residente en Funes'
                          : postulante.localidad || 'Otra localidad'}
                      </span>
                    </div>

                    {postulante.experiencia_resumen && (
                      <div className="pt-2 border-t border-zinc-100">
                        <span className="text-[11px] font-medium text-zinc-500 block">Resumen de experiencia:</span>
                        <p className="text-zinc-700 leading-relaxed text-xs mt-0.5 line-clamp-3" title={postulante.experiencia_resumen}>
                          {postulante.experiencia_resumen}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Datos Personales y Contacto */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
              Datos Personales y de Residencia
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-400 block text-[11px] font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  Localidad y Dirección:
                </span>
                <span className="font-semibold text-zinc-800 block">
                  {postulante.localidad || 'Funes'}
                  {postulante.direccion && ` · ${postulante.direccion}`}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-400 block text-[11px] font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  Teléfono de Contacto:
                </span>
                <span className="font-semibold text-zinc-800 block">
                  {postulante.telefono || 'Sin teléfono informado'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-400 block text-[11px] font-medium">
                  Fecha de Nacimiento:
                </span>
                <span className="font-semibold text-zinc-800 block">
                  {postulante.fecha_nacimiento
                    ? new Date(postulante.fecha_nacimiento).toLocaleDateString('es-AR')
                    : 'No informado'}
                </span>
              </div>
            </div>
          </div>

          {/* Formación y Situación Laboral */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Nivel educativo
              </span>
              <p className="font-bold text-zinc-900 truncate">
                {postulante.nivel_educativo || 'No especificado'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Situación laboral
              </span>
              <p className="font-bold text-zinc-900 truncate">
                {postulante.situacion_laboral_actual || 'No informada'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Disponibilidad
              </span>
              <p className="font-bold text-zinc-900 truncate">
                {postulante.disponibilidad_horaria || 'A convenir'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Movilidad propia
              </span>
              <p className="font-bold text-zinc-900">
                {postulante.movilidad_propia ? 'Posee movilidad' : 'No'}
              </p>
            </div>
          </div>

          {/* Resumen de experiencia laboral */}
          {postulante.experiencia_resumen && (
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-brand-800" />
                Resumen de experiencia laboral
              </h3>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {postulante.experiencia_resumen}
              </p>
            </div>
          )}

          {/* Habilidades y Competencias */}
          {postulante.habilidades && postulante.habilidades.length > 0 && (
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-800" />
                Habilidades y competencias declaradas
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {postulante.habilidades.map((hab, idx) => (
                  <Badge key={idx} variant="zinc" className="text-xs">
                    {hab}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Currículums Adjuntos */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-800" />
              Currículums Cargados en el Legajo
            </h3>

            {postulante.curriculums && postulante.curriculums.length > 0 ? (
              <div className="space-y-2 pt-1">
                {postulante.curriculums.map((cv) => (
                  <div
                    key={cv.id}
                    className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-900 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 truncate">
                            {cv.nombre_cv}
                          </span>
                          {cv.es_principal && (
                            <Badge variant="emerald" className="text-[10px] py-0 px-1.5">
                              Principal
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500 block">
                          Actualizado el {new Date(cv.updated_at).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCv(cv.id, cv.archivo_url)}
                      disabled={downloadingCvId === cv.id}
                      className="gap-1.5 text-xs shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {downloadingCvId === cv.id ? 'Generando...' : 'Ver / Descargar'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                El postulante aún no ha cargado currículums en formato digital.
              </p>
            )}
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className="px-4 sm:px-6 py-3.5 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between shrink-0">
          <div>
            {onOpenHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenHistory();
                }}
                className="text-xs text-brand-900 hover:bg-brand-50 border-brand-200"
              >
                Ver historial de postulaciones
              </Button>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={onClose} className="bg-brand-800 hover:bg-brand-900 text-xs">
            Cerrar legajo
          </Button>
        </div>
      </div>
    </div>
  );
}
