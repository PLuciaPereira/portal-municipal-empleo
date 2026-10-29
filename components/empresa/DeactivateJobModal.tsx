'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircleIcon, XIcon } from '@/components/ui/Icons';
import { darDeBajaOfertaEmpresa } from '@/lib/empresa';
import { Oferta } from '@/types/database';

interface DeactivateJobModalProps {
  oferta: Oferta;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeactivateJobModal({
  oferta,
  isOpen,
  onClose,
  onSuccess,
}: DeactivateJobModalProps) {
    useBodyScrollLock(Boolean(isOpen));
const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!motivo.trim()) {
      setError('Por favor especificá el motivo por el cual das de baja la búsqueda.');
      return;
    }

    setLoading(true);

    try {
      const res = await darDeBajaOfertaEmpresa(oferta.id, motivo);
      if (!res.success) {
        setError(res.error || 'No se pudo registrar la baja de la oferta.');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al dar de baja.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-bold text-zinc-900">Dar de Baja Oferta</h3>
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

          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700">
            <strong>Oferta:</strong> {oferta.titulo}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="motivo-baja"
              className="block text-xs font-semibold text-zinc-700"
            >
              Motivo de baja lógica <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="motivo-baja"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Vacante cubierta con candidato contratado, cancelación del proyecto, redefinición del perfil..."
              className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              disabled={loading}
              required
            />
            <p className="text-[11px] text-zinc-500">
              La oferta ya no aparecerá en el portal público ni podrá recibir nuevas postulaciones. Se conservará el registro histórico y la trazabilidad de los candidatos vinculados.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" isLoading={loading}>
              Confirmar Baja
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
