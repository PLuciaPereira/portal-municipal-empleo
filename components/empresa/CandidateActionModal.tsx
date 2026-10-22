'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircleIcon, XIcon, CheckCircleIcon } from '@/components/ui/Icons';
import { rechazarCandidatoEmpresa, contratarCandidatoEmpresa } from '@/lib/empresa';
import { VistaCandidatoEmpresa } from '@/types/database';

interface CandidateActionModalProps {
  candidato: VistaCandidatoEmpresa;
  actionType: 'contratar' | 'rechazar';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CandidateActionModal({
  candidato,
  actionType,
  isOpen,
  onClose,
  onSuccess,
}: CandidateActionModalProps) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (actionType === 'rechazar' && !motivo.trim()) {
      setError('Por favor indicá el motivo del rechazo para la Oficina de Empleo.');
      return;
    }

    setLoading(true);

    try {
      if (actionType === 'rechazar') {
        const res = await rechazarCandidatoEmpresa(candidato.postulacion_id, motivo);
        if (!res.success) {
          setError(res.error || 'No se pudo registrar el rechazo.');
          setLoading(false);
          return;
        }
      } else {
        const res = await contratarCandidatoEmpresa(candidato.postulacion_id);
        if (!res.success) {
          setError(res.error || 'No se pudo registrar la contratación.');
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar la solicitud.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const nombreCompleto = `${candidato.nombre} ${candidato.apellido || ''}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            {actionType === 'contratar' ? (
              <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircleIcon className="w-5 h-5 text-rose-600" />
            )}
            <h3 className="text-base font-bold text-zinc-900">
              {actionType === 'contratar'
                ? 'Registrar Contratación'
                : 'Rechazar Candidato Presentado'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
            disabled={loading}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 text-xs text-zinc-700">
            <p>
              <strong>Candidato:</strong> {nombreCompleto}
            </p>
            <p>
              <strong>Puesto postulado:</strong> {candidato.oferta_titulo}
            </p>
          </div>

          {actionType === 'contratar' ? (
            <div className="space-y-2 text-sm text-zinc-600">
              <p>
                Al confirmar la contratación, el candidato pasará al estado final de{' '}
                <strong className="text-emerald-700">Contratado</strong>.
              </p>
              <p className="text-xs text-zinc-500">
                La Oficina de Empleo registrará la efectiva inserción laboral y se concluirá el proceso sobre esta postulación. Por normativa de privacidad, el currículum vitae dejará de estar disponible para descarga.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="motivo-rechazo"
                className="block text-xs font-semibold text-zinc-700"
              >
                Motivo del rechazo <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="motivo-rechazo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: No cumple con la experiencia requerida en el rubro, perfil sobrecalificado, se cubrió con otra persona..."
                className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                disabled={loading}
                required
              />
              <p className="text-[11px] text-zinc-500 leading-normal">
                Nota: El motivo es estrictamente confidencial y se remite a la Oficina de Empleo para orientar futuras búsquedas o capacitaciones del postulante. No será visible para el candidato.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={actionType === 'contratar' ? 'primary' : 'danger'}
              isLoading={loading}
            >
              {actionType === 'contratar'
                ? 'Confirmar Contratación'
                : 'Confirmar Rechazo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
