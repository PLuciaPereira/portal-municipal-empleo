'use client';

import React, { useState } from 'react';
import { Building2, Phone, Video, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  postulacionId: string;
  postulanteNombre: string;
  ofertaTitulo: string;
  onClose: () => void;
  onConfirm: (data: {
    fecha: string;
    hora: string;
    modalidad: 'presencial' | 'virtual' | 'telefonica';
    lugar: string;
    entrevistador: string;
    notas: string;
  }) => Promise<void>;
}

export function ScheduleInterviewModal({
  isOpen,
  postulanteNombre,
  ofertaTitulo,
  onClose,
  onConfirm,
}: ScheduleInterviewModalProps) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual' | 'telefonica'>('presencial');
  const [lugar, setLugar] = useState('Oficina de Empleo Municipal - Funes');
  const [entrevistador, setEntrevistador] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm({
        fecha,
        hora,
        modalidad,
        lugar,
        entrevistador,
        notas,
      });
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
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de coordinación"
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
            Entrevista Preliminar Municipal
          </div>
          <h3 id="schedule-modal-title" className="text-lg font-bold text-slate-900">
            Coordinar Cita con el Postulante
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Postulante: <strong className="text-slate-800">{postulanteNombre}</strong> | Puesto: <strong className="text-slate-800">{ofertaTitulo}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
              <Input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hora *</label>
              <Input
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Modalidad de entrevista *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalidad('presencial');
                  setLugar('Oficina de Empleo Municipal - Funes');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  modalidad === 'presencial'
                    ? 'border-[var(--color-brand-800)] bg-emerald-50 text-[var(--color-brand-800)]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4 mb-1" />
                Presencial
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalidad('telefonica');
                  setLugar('Llamada telefónica al celular del postulante');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  modalidad === 'telefonica'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Phone className="w-4 h-4 mb-1" />
                Telefónica
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalidad('virtual');
                  setLugar('Google Meet / Zoom');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  modalidad === 'virtual'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Video className="w-4 h-4 mb-1" />
                Virtual
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lugar, enlace o detalle de conexión *
            </label>
            <Input
              required
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Ej: Dirección física, enlace de Meet o instrucciones"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Entrevistador / Orientador responsable
            </label>
            <Input
              value={entrevistador}
              onChange={(e) => setEntrevistador(e.target.value)}
              placeholder="Ej: Lic. María González (Oficina de Empleo)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas internas o consignas previas
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Requisitos para llevar a la entrevista, certificados requeridos, etc."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading} className="gap-1.5">
              <Check className="w-4 h-4" />
              {loading ? 'Agendando...' : 'Confirmar y Notificar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
