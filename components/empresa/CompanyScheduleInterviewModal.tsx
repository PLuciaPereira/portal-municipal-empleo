'use client';

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, Phone, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { agendarEntrevistaEmpresa, reprogramarEntrevistaEmpresa, cancelarEntrevistaEmpresa } from '@/lib/empresa';
import { VistaCandidatoEmpresa } from '@/types/database';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export interface CompanyScheduleInterviewModalProps {
  candidato: VistaCandidatoEmpresa;
  isReprogramar?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompanyScheduleInterviewModal({
  candidato,
  isReprogramar = false,
  isOpen,
  onClose,
  onSuccess,
}: CompanyScheduleInterviewModalProps) {
  useBodyScrollLock(Boolean(isOpen));
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual' | 'telefonica'>('presencial');
  const [lugar, setLugar] = useState('Sede de la empresa (Funes)');
  const [entrevistador, setEntrevistador] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelView, setIsCancelView] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fecha || !hora) {
      setError('Por favor seleccioná fecha y hora para la entrevista.');
      return;
    }

    if (!lugar.trim()) {
      setError('Por favor indicá el lugar o enlace de conexión.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        postulacionId: candidato.postulacion_id,
        fecha,
        hora,
        modalidad,
        lugar: lugar.trim(),
        entrevistador: entrevistador.trim() || undefined,
        notas: notas.trim() || undefined,
      };

      const res = isReprogramar
        ? await reprogramarEntrevistaEmpresa(payload)
        : await agendarEntrevistaEmpresa(payload);

      if (!res.success) {
        setError(res.error || 'No se pudo coordinar la entrevista.');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoCancelacion.trim()) {
      setError('Por favor indicá el motivo de la cancelación para informar al postulante.');
      return;
    }
    setLoading(true);
    try {
      const res = await cancelarEntrevistaEmpresa({
        postulacionId: candidato.postulacion_id,
        motivo: motivoCancelacion.trim(),
      });
      if (!res.success) {
        setError(res.error || 'No se pudo cancelar la entrevista.');
        setLoading(false);
        return;
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setLoading(false);
    }
  };

  const nombrePostulante =
    candidato.postulante_nombre || candidato.nombre
      ? `${candidato.postulante_nombre || candidato.nombre} ${candidato.postulante_apellido || candidato.apellido || ''}`.trim()
      : 'Candidato';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isCancelView ? 'Cancelar Entrevista Coordinada' : isReprogramar ? 'Reprogramar Entrevista' : 'Coordinar Entrevista Laboral'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Candidato derivado: <strong className="text-zinc-800">{nombrePostulante}</strong> ({candidato.oferta_titulo})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isCancelView ? (
          <form onSubmit={handleCancelInterview} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              Al cancelar la entrevista, el postulante recibirá una notificación y su postulación volverá al estado <strong>Presentado a Empresa</strong>.
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Motivo de la cancelación <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Explicá brevemente por qué se cancela o pospone el encuentro..."
                className="w-full text-xs p-2.5 border border-border rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-surface"
                disabled={loading}
              />
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setIsCancelView(false)} disabled={loading}>
                Volver
              </Button>
              <Button type="submit" variant="danger" isLoading={loading}>
                Confirmar Cancelación
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Fecha de la entrevista <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Hora de inicio <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Modalidad de entrevista <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalidad('presencial');
                    if (!lugar || lugar.includes('meet') || lugar.includes('zoom')) {
                      setLugar('Sede de la empresa (Funes)');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    modalidad === 'presencial'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-2xs font-bold'
                      : 'border-border text-muted-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Presencial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalidad('virtual');
                    setLugar('Google Meet / Zoom (link a coordinar)');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    modalidad === 'virtual'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-2xs font-bold'
                      : 'border-border text-muted-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Virtual
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalidad('telefonica');
                    setLugar('Llamada telefónica');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    modalidad === 'telefonica'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-2xs font-bold'
                      : 'border-border text-muted-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> Telefónica
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Dirección o enlace de reunión <span className="text-rose-600">*</span>
              </label>
              <Input
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Ej: Calle Santa Fe 1500, Funes o Enlace de Google Meet"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Nombre del entrevistador o referente <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                value={entrevistador}
                onChange={(e) => setEntrevistador(e.target.value)}
                placeholder="Ej: Lic. Martín Gómez (RRHH)"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Notas adicionales para el postulante <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Traer copia del CV y concurrir 5 minutos antes..."
                className="w-full text-xs p-2.5 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-surface"
                disabled={loading}
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              {isReprogramar ? (
                <button
                  type="button"
                  onClick={() => setIsCancelView(true)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 underline underline-offset-2"
                  disabled={loading}
                >
                  Cancelar entrevista definitivamente
                </button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                  Cerrar
                </Button>
                <Button type="submit" variant="primary" isLoading={loading}>
                  <Check className="w-4 h-4 mr-1.5" /> {isReprogramar ? 'Guardar Nueva Fecha' : 'Confirmar y Notificar'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
