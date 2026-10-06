'use client';

import React, { useState } from 'react';
import { Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  XMarkIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { submitJobApplication } from '@/lib/jobs';

interface JobApplyModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onApplicationSuccess: (applicationId: string) => void;
}

export const JobApplyModal: React.FC<JobApplyModalProps> = ({
  job,
  isOpen,
  onClose,
  onApplicationSuccess,
}) => {
  const { user, hasAppliedTo, recordApplication } = useAuth();

  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    dni: user?.dni || '',
    telefono: user?.telefono || '',
    email: user?.email || '',
    esResidenteFunes: user?.es_residente_funes ?? true,
    barrio: user?.barrio || '',
    mensaje: '',
    aceptaTerminos: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  if (!isOpen) return null;

  const alreadyApplied = hasAppliedTo(job.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (alreadyApplied) {
      setErrorMessage('Ya te has postulado a esta oferta previamente.');
      return;
    }

    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setErrorMessage('Por favor completá tu nombre y apellido.');
      return;
    }
    if (!formData.dni.trim()) {
      setErrorMessage('Por favor ingresá tu número de DNI.');
      return;
    }
    if (!formData.telefono.trim()) {
      setErrorMessage('Por favor ingresá un número de teléfono o WhatsApp de contacto.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Por favor ingresá un correo electrónico válido.');
      return;
    }
    if (!formData.aceptaTerminos) {
      setErrorMessage('Debés aceptar la declaración jurada para continuar.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await submitJobApplication({
        jobId: job.id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni: formData.dni,
        telefono: formData.telefono,
        email: formData.email,
        esResidenteFunes: formData.esResidenteFunes,
        barrio: formData.barrio,
        mensaje: formData.mensaje,
      });

      if (res.success) {
        setSubmittedAppId(res.applicationId);
        recordApplication(job.id, res.applicationId);
        onApplicationSuccess(res.applicationId);
      } else {
        setErrorMessage(res.message || 'Ocurrió un error al procesar la postulación.');
      }
    } catch {
      setErrorMessage('Hubo un problema de conexión. Intentá nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {submittedAppId ? (
          /* Pantalla de confirmación de éxito */
          <div className="text-center py-4 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircleIcon className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-full">
                Trámite N° {submittedAppId}
              </span>
              <h3 className="text-2xl font-bold text-zinc-900">
                ¡Postulación Registrada!
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-sm mx-auto">
                Tu postulación para el puesto de <strong className="text-zinc-800">{job.titulo}</strong> fue vinculada a tu perfil y recibida por la Oficina de Empleo de Funes.
              </p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-left text-xs text-zinc-700 space-y-2">
              <p className="font-semibold text-zinc-900">Próximos pasos de intermediación:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-600">
                <li>El equipo municipal evaluará tu información laboral y antecedentes.</li>
                <li>Si tu perfil se ajusta a los requisitos solicitados por la empresa, te convocaremos para avanzar en la entrevista preliminar.</li>
                <li>No podés postularte más de una vez a la misma oferta para mantener el orden del registro.</li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={onClose}
            >
              Entendido, volver a la oferta
            </Button>
          </div>
        ) : alreadyApplied ? (
          /* Aviso de que ya se postuló previamente */
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-zinc-900">
                Ya te has postulado a este puesto
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Tu perfil para <strong>{job.titulo}</strong> ya se encuentra registrado en el sistema. Para garantizar la equidad del proceso, un candidato no puede duplicar su postulación a la misma búsqueda laboral.
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left">
              La Oficina de Empleo se pondrá en contacto contigo si tu perfil resulta preseleccionado.
            </div>
            <Button
              variant="secondary"
              size="md"
              className="w-full justify-center"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          /* Formulario de Postulación de Usuario Autenticado */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
                <BriefcaseIcon className="w-4 h-4" />
                <span>Postulación con Perfil Registrado</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 leading-tight">
                {job.titulo}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {job.company?.nombre_fantasia || 'Empresa local'} &bull; {job.ubicacion}
              </p>
            </div>

            {/* Datos precargados del postulante */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 truncate">
                <span className="font-semibold block text-zinc-900">
                  {user?.nombre} {user?.apellido} (DNI {user?.dni || 'Sin DNI'})
                </span>
                <span className="text-zinc-500 truncate block">
                  {user?.email} &bull; {user?.telefono || 'Sin teléfono'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMessage}
              </div>
            )}

            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teléfono / WhatsApp de contacto *"
                  placeholder="Ej: 341 555-0123"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  required
                />
                <Input
                  label="Barrio de Funes *"
                  placeholder="Ej: Centro, Cantegril, Don Mateo"
                  value={formData.barrio}
                  onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                  required
                />
              </div>

              {/* Mensaje o experiencia */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Mensaje opcional para la Oficina de Empleo sobre este puesto:
                </label>
                <textarea
                  rows={3}
                  placeholder="Contanos brevemente por qué te interesa este puesto o qué experiencia afín tenés..."
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-colors"
                />
              </div>

              {/* Declaración Jurada */}
              <label className="flex items-start gap-2.5 pt-1 text-xs text-zinc-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.aceptaTerminos}
                  onChange={(e) =>
                    setFormData({ ...formData, aceptaTerminos: e.target.checked })
                  }
                  className="mt-0.5 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>
                  Confirmo mi postulación a esta oferta laboral y autorizo a la Oficina de Empleo de Funes a intermediar con mis antecedentes ante la empresa.
                </span>
              </label>
            </div>

            {/* Aviso de Privacidad e Intermediación */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Intermediación pública y gratuita. Tus datos no se exponen públicamente.
              </span>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="min-w-[140px]"
              >
                Confirmar Postulación
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
