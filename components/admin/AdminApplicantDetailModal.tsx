'use client';

import React, { useState } from 'react';
import { PostulanteAdminItem, getCurriculumSignedUrlAdmin } from '@/lib/admin';
import { Button } from '@/components/ui/Button';
import { Perfil } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  MapPin,
  Phone,
  Briefcase,
  FileText,
  Download,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface AdminApplicantDetailModalProps {
  postulante: (Partial<PostulanteAdminItem> & Pick<Perfil, 'id' | 'nombre'>) | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminApplicantDetailModal({
  postulante,
  isOpen,
  onClose,
}: AdminApplicantDetailModalProps) {
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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center shrink-0 font-bold text-base">
              {postulante.nombre.charAt(0)}
              {postulante.apellido ? postulante.apellido.charAt(0) : ''}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-postulante-title" className="text-base font-bold text-zinc-900 leading-tight">
                  {postulante.nombre} {postulante.apellido || ''}
                </h2>
                {postulante.localidad && (
                  <Badge variant="zinc" className="text-[10px] py-0 px-1.5">
                    {postulante.localidad}
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
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Cerrar legajo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto">
          {/* Mensaje de error al abrir CV si ocurre */}
          {cvError && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{cvError}</span>
            </div>
          )}

          {/* Datos Personales y de Contacto */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
              Datos Personales y Contacto
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" /> Teléfono:
                </span>
                {postulante.telefono ? (
                  <a
                    href={`tel:${postulante.telefono}`}
                    className="font-semibold text-brand-800 hover:underline block truncate"
                  >
                    {postulante.telefono}
                  </a>
                ) : (
                  <span className="text-zinc-400">Sin teléfono</span>
                )}
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Domicilio y Localidad:
                </span>
                <span className="font-semibold text-zinc-800 block truncate">
                  {postulante.direccion ? `${postulante.direccion}, ` : ''}
                  {postulante.localidad || 'Funes'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Nacimiento:
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
                Nivel Educativo
              </span>
              <p className="font-bold text-zinc-900 truncate">
                {postulante.nivel_educativo || 'No especificado'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Situación Laboral
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
                Movilidad Propia
              </span>
              <p className="font-bold text-zinc-900">
                {postulante.movilidad_propia ? 'Posee movilidad' : 'No'}
              </p>
            </div>
          </div>

          {/* Resumen de Experiencia Laboral */}
          {postulante.experiencia_resumen && (
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-brand-800" />
                Resumen de Experiencia Laboral
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
                Habilidades y Competencias Declaradas
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
        <div className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-end">
          <Button variant="primary" size="sm" onClick={onClose} className="bg-brand-800 hover:bg-brand-900">
            Cerrar Legajo
          </Button>
        </div>
      </div>
    </div>
  );
}
