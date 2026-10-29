'use client';

import React, { useState } from 'react';
import { Send, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OfertaAdminItem } from '@/lib/admin';

export interface InviteToJobModalProps {
  isOpen: boolean;
  postulanteId: string;
  postulanteNombre: string;
  ofertasDisponibles: OfertaAdminItem[];
  onClose: () => void;
  onConfirm: (ofertaId: string, mensaje: string) => Promise<void>;
}

export function InviteToJobModal({
  isOpen,
  postulanteNombre,
  ofertasDisponibles,
  onClose,
  onConfirm,
}: InviteToJobModalProps) {
  const [selectedOfertaId, setSelectedOfertaId] = useState('');
  const [mensaje, setMensaje] = useState(
    'Estimado/a, desde la Oficina de Empleo consideramos que tu perfil se adapta muy bien a esta búsqueda laboral. Te sugerimos postularte para iniciar el proceso de selección.'
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Filtrar solo ofertas publicadas activas
  const ofertasActivas = ofertasDisponibles.filter((o) => o.estado === 'publicada');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfertaId) return;

    setLoading(true);
    try {
      await onConfirm(selectedOfertaId, mensaje);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de invitación"
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Send className="w-3.5 h-3.5" />
            Vincular y Sugerir Empleo
          </div>
          <h3 id="invite-modal-title" className="text-lg font-bold text-slate-900">
            Invitar Postulante a Oferta Laboral
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sugerir una vacante activa al postulante <strong className="text-slate-800">{postulanteNombre}</strong>.
          </p>
        </div>

        {ofertasActivas.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>No hay ofertas laborales actualmente en estado <strong>Publicada</strong> para invitar postulantes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seleccionar Oferta Laboral Activa *
              </label>
              <select
                required
                value={selectedOfertaId}
                onChange={(e) => setSelectedOfertaId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
              >
                <option value="">-- Elija una oferta publicada --</option>
                {ofertasActivas.map((of) => (
                  <option key={of.id} value={of.id}>
                    {of.titulo} ({('empresa' in of && of.empresa?.nombre_fantasia) || 'Empresa confidencial'}) - {('rubro' in of && of.rubro?.nombre) || 'Sin rubro'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mensaje de recomendación para el postulante *
              </label>
              <textarea
                required
                rows={3}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loading || !selectedOfertaId}
                className="gap-1.5"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
