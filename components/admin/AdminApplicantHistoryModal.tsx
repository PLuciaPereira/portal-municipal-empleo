'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState, useEffect, useCallback } from 'react';
import {
  PostulanteAdminItem,
  PostulanteHistorialAdminItem,
  getHistorialPostulanteAdmin,
} from '@/lib/admin';
import { Button } from '@/components/ui/Button';
import { Perfil } from '@/types/database';
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge';
import {
  X,
  Briefcase,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface AdminApplicantHistoryModalProps {
  postulante: (Partial<PostulanteAdminItem> & Pick<Perfil, 'id' | 'nombre'>) | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminApplicantHistoryModal({
  postulante,
  isOpen,
  onClose,
}: AdminApplicantHistoryModalProps) {
  useBodyScrollLock(Boolean(isOpen));

  const [historial, setHistorial] = useState<PostulanteHistorialAdminItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistorial = useCallback(async (postulanteId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistorialPostulanteAdmin(postulanteId);
      if (res.error) {
        setError(res.error);
      } else {
        setHistorial(res.data || []);
      }
    } catch {
      setError('Error inesperado al cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && postulante?.id) {
      void loadHistorial(postulante.id);
    } else {
      setHistorial([]);
    }
  }, [isOpen, postulante?.id, loadHistorial]);

  if (!isOpen || !postulante) return null;

  const totalPostulaciones = historial.length;
  const rechazosEmpresa = historial.filter((h) => h.estado === 'rechazado_por_empresa').length;
  const contrataciones = historial.filter((h) => h.estado === 'contratado').length;
  const enDerivacion = historial.filter(
    (h) =>
      h.estado === 'presentado_a_empresa' ||
      h.estado === 'preseleccionado' ||
      h.estado === 'entrevista'
  ).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-history-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-brand-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-history-title" className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                  Historial de Postulaciones y Derivaciones
                </h2>
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                Postulante: <strong className="text-zinc-800">{postulante.nombre} {postulante.apellido || ''}</strong> · DNI: {postulante.dni || 'No informado'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Cerrar historial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-130px)] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tarjetas métricas de resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Postulaciones
              </span>
              <span className="text-lg font-extrabold text-zinc-900 block mt-0.5">
                {totalPostulaciones}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-blue-200/80 bg-blue-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                En Derivación
              </span>
              <span className="text-lg font-extrabold text-blue-900 block mt-0.5">
                {enDerivacion}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Contratados
              </span>
              <span className="text-lg font-extrabold text-emerald-900 block mt-0.5">
                {contrataciones}
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                rechazosEmpresa > 0
                  ? 'border-rose-300 bg-rose-50/70 text-rose-900'
                  : 'border-zinc-200 bg-zinc-50/60 text-zinc-600'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                Rechazos Empresa
              </span>
              <span
                className={`text-lg font-extrabold block mt-0.5 ${
                  rechazosEmpresa > 0 ? 'text-rose-700' : 'text-zinc-500'
                }`}
              >
                {rechazosEmpresa}
              </span>
            </div>
          </div>

          {/* Listado de postulaciones */}
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-50/50 rounded-2xl border border-zinc-200 space-y-2">
              <Clock className="w-5 h-5 text-brand-800 animate-spin mx-auto" />
              <p>Consultando historial de postulaciones del postulante...</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="p-10 text-center text-xs text-zinc-500 bg-zinc-50/50 rounded-2xl border border-zinc-200">
              <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="font-semibold text-zinc-700">Sin postulaciones registradas</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Este postulante aún no se ha postulado ni ha sido derivado a ofertas laborales.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map((item) => {
                const isRechazado = item.estado === 'rechazado_por_empresa';

                return (
                  <div
                    key={item.postulacion_id}
                    className={`p-4 rounded-xl border transition-all ${
                      isRechazado
                        ? 'border-rose-200 bg-rose-50/40 shadow-xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 leading-tight">
                          {item.oferta_titulo}
                        </h4>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <strong className="text-zinc-700">{item.empresa_nombre}</strong>
                          {item.empresa_localidad && ` · ${item.empresa_localidad}`}
                        </span>
                      </div>

                      <div className="shrink-0">
                        <ApplicationStatusBadge status={item.estado} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 text-[11px] text-zinc-500">
                      <span>
                        Fecha postulación:{' '}
                        <strong className="text-zinc-700">
                          {new Date(item.created_at).toLocaleDateString('es-AR')}
                        </strong>
                      </span>
                      {item.fecha_derivacion && (
                        <span>
                          Fecha derivación:{' '}
                          <strong className="text-zinc-700">
                            {new Date(item.fecha_derivacion).toLocaleDateString('es-AR')}
                          </strong>
                        </span>
                      )}
                      {item.fecha_entrevista && (
                        <span className="text-indigo-800 font-semibold">
                          Entrevista:{' '}
                          {new Date(item.fecha_entrevista).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>

                    {/* Alerta visible en rojo del motivo de rechazo informado por la empresa */}
                    {isRechazado && (
                      <div className="mt-3 p-3 rounded-lg bg-white border border-rose-200 text-xs text-rose-900 flex items-start gap-2 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold block text-[11px] uppercase tracking-wider text-rose-800">
                            Motivo de rechazo registrado por la empresa (Uso Oficina de Empleo):
                          </span>
                          <p className="text-rose-900 leading-relaxed whitespace-pre-wrap font-medium">
                            {item.motivo_rechazo_empresa || 'No se especificó detalle de motivo de rechazo.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-end">
          <Button variant="primary" size="sm" onClick={onClose} className="bg-brand-800 hover:bg-brand-900 text-xs">
            Cerrar Historial
          </Button>
        </div>
      </div>
    </div>
  );
}
