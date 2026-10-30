'use client';

import React, { useState, useMemo } from 'react';
import { Send, Check, X, AlertCircle, Search, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OfertaAdminItem, PostulanteAdminItem, invitarPostulanteAOferta } from '@/lib/admin';

export interface InviteCandidateToJobModalProps {
  isOpen: boolean;
  oferta: OfertaAdminItem | null;
  postulantesDisponibles: PostulanteAdminItem[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteCandidateToJobModal({
  isOpen,
  oferta,
  postulantesDisponibles,
  onClose,
  onSuccess,
}: InviteCandidateToJobModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPostulanteId, setSelectedPostulanteId] = useState('');
  const [mensaje, setMensaje] = useState(
    'Estimado/a, desde la Oficina de Empleo consideramos que tu perfil se adapta muy bien a esta búsqueda laboral. Te sugerimos postularte para iniciar el proceso de selección.'
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtrado de postulantes para invitar
  const filteredPostulantes = useMemo(() => {
    if (!searchTerm.trim()) return postulantesDisponibles.slice(0, 15);
    const q = searchTerm.toLowerCase();
    return postulantesDisponibles.filter((p) => {
      const matchName = `${p.nombre} ${p.apellido || ''}`.toLowerCase().includes(q);
      const matchDni = (p.dni || '').toLowerCase().includes(q);
      const matchNivel = (p.nivel_educativo || '').toLowerCase().includes(q);
      const matchLocalidad = (p.localidad || '').toLowerCase().includes(q);
      const matchHab = (p.habilidades || []).some((h) => h.toLowerCase().includes(q));
      return matchName || matchDni || matchNivel || matchLocalidad || matchHab;
    }).slice(0, 20);
  }, [postulantesDisponibles, searchTerm]);

  if (!isOpen || !oferta) return null;

  const selectedPostulante = postulantesDisponibles.find((p) => p.id === selectedPostulanteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostulanteId) return;

    setLoading(true);
    setFeedback(null);
    try {
      const res = await invitarPostulanteAOferta({
        postulanteId: selectedPostulanteId,
        ofertaId: oferta.id,
        mensaje,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error al enviar la invitación.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-candidate-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Send className="w-3.5 h-3.5 text-emerald-700" />
            Intermediación Municipal
          </div>
          <h3 id="invite-candidate-modal-title" className="text-lg font-bold text-zinc-900">
            Invitar Postulante a Oferta
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Oferta: <strong className="text-zinc-800">{oferta.titulo}</strong>
          </p>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Buscar postulante en el padrón *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, DNI, nivel o habilidad..."
                className="pl-9 h-9 text-xs w-full bg-zinc-50 border-zinc-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Seleccionar Postulante *
            </label>
            <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-zinc-50/50">
              {filteredPostulantes.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-500">
                  No se encontraron postulantes que coincidan.
                </div>
              ) : (
                filteredPostulantes.map((p) => {
                  const isSelected = selectedPostulanteId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPostulanteId(p.id)}
                      className={`w-full text-left p-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-semibold'
                          : 'hover:bg-zinc-100/70 text-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold">
                          {p.nombre} {p.apellido || ''}
                          <span className="text-[11px] font-normal text-zinc-500 ml-2">
                            DNI: {p.dni || 'Sin DNI'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {p.localidad || 'Funes'} · {p.nivel_educativo || 'Sin nivel'}
                        </div>
                      </div>
                      {isSelected && <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
            {selectedPostulante && (
              <p className="text-[11px] text-emerald-800 font-medium mt-1">
                Postulante seleccionado: <strong>{selectedPostulante.nombre} {selectedPostulante.apellido}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Mensaje institucional de sugerencia *
            </label>
            <textarea
              required
              rows={3}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="w-full text-xs p-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading} size="sm">
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !selectedPostulanteId}
              size="sm"
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
