'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { XIcon, AlertCircleIcon } from '@/components/ui/Icons';
import { Rubro, Oferta } from '@/types/database';
import { crearOfertaBorrador, actualizarOfertaBorrador } from '@/lib/empresa';
import { createClient } from '@/lib/supabase/client';

interface CompanyJobModalProps {
  ofertaToEdit?: Oferta | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  titulo: string;
  descripcion: string;
  requisitos: string;
  experienciaRequerida: string;
  tipoJornada: string;
  tipoContrato: string;
  ubicacion: string;
  rangoSalarial: string;
  vacantes: number;
  fechaLimite: string;
  rubroId: number | '';
}

export function CompanyJobModal({
  ofertaToEdit,
  isOpen,
  onClose,
  onSuccess,
}: CompanyJobModalProps) {
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [loadingRubros, setLoadingRubros] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formState, setFormState] = useState<FormState>(() => ({
    titulo: ofertaToEdit?.titulo || '',
    descripcion: ofertaToEdit?.descripcion || '',
    requisitos: ofertaToEdit?.requisitos || '',
    experienciaRequerida: ofertaToEdit?.experiencia_requerida || '',
    tipoJornada: ofertaToEdit?.tipo_jornada || 'Jornada completa',
    tipoContrato: ofertaToEdit?.tipo_contrato || 'Relación de dependencia',
    ubicacion: ofertaToEdit?.ubicacion || 'Funes, Santa Fe',
    rangoSalarial: ofertaToEdit?.rango_salarial || '',
    vacantes: ofertaToEdit?.vacantes || 1,
    fechaLimite: ofertaToEdit?.fecha_limite || '',
    rubroId: ofertaToEdit?.rubro_id || '',
  }));

  useEffect(() => {
    let isMounted = true;
    async function loadRubros() {
      setLoadingRubros(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('rubros')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (isMounted) {
        if (data) setRubros(data);
        setLoadingRubros(false);
      }
    }

    if (isOpen) {
      loadRubros();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formState.titulo.trim()) return setError('El título de la vacante es obligatorio.');
    if (!formState.descripcion.trim()) return setError('La descripción de tareas es obligatoria.');
    if (!formState.requisitos.trim()) return setError('Los requisitos del puesto son obligatorios.');
    if (!formState.rubroId) return setError('Seleccioná un rubro o sector de actividad.');

    setSubmitting(true);

    try {
      if (ofertaToEdit) {
        const res = await actualizarOfertaBorrador({
          id: ofertaToEdit.id,
          titulo: formState.titulo,
          descripcion: formState.descripcion,
          requisitos: formState.requisitos,
          experiencia_requerida: formState.experienciaRequerida,
          tipo_jornada: formState.tipoJornada,
          tipo_contrato: formState.tipoContrato,
          ubicacion: formState.ubicacion,
          rango_salarial: formState.rangoSalarial,
          vacantes: formState.vacantes,
          fecha_limite: formState.fechaLimite || null,
          rubro_id: Number(formState.rubroId),
          rubroIds: [Number(formState.rubroId)],
        });

        if (!res.data) {
          setError(res.error || 'No se pudo actualizar el borrador de la oferta.');
          setSubmitting(false);
          return;
        }
      } else {
        const res = await crearOfertaBorrador({
          titulo: formState.titulo,
          descripcion: formState.descripcion,
          requisitos: formState.requisitos,
          experiencia_requerida: formState.experienciaRequerida,
          tipo_jornada: formState.tipoJornada,
          tipo_contrato: formState.tipoContrato,
          ubicacion: formState.ubicacion,
          rango_salarial: formState.rangoSalarial,
          vacantes: formState.vacantes,
          fecha_limite: formState.fechaLimite || null,
          rubro_id: Number(formState.rubroId),
          rubroIds: [Number(formState.rubroId)],
        });

        if (!res.data) {
          setError(res.error || 'No se pudo guardar la nueva oferta.');
          setSubmitting(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              {ofertaToEdit ? 'Editar Oferta en Borrador' : 'Nueva Búsqueda Laboral'}
            </h3>
            <p className="text-xs text-zinc-500">
              Se creará como borrador para tu revisión antes de enviarla a la Oficina de Empleo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
            disabled={submitting}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body con Scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 grow">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Título del puesto o vacante <span className="text-rose-600">*</span>
              </label>
              <Input
                value={formState.titulo}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ej: Empleado de Mostrador, Operario de Depósito, Administrativo/a"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Rubro principal <span className="text-rose-600">*</span>
              </label>
              <select
                value={formState.rubroId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    rubroId: e.target.value ? Number(e.target.value) : '',
                  }))
                }
                className="w-full text-xs p-2.5 border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
                disabled={loadingRubros}
              >
                <option value="">Seleccionar rubro...</option>
                {rubros.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Tipo de jornada <span className="text-rose-600">*</span>
              </label>
              <select
                value={formState.tipoJornada}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, tipoJornada: e.target.value }))
                }
                className="w-full text-xs p-2.5 border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
              >
                <option value="Jornada completa">Jornada completa</option>
                <option value="Media jornada">Media jornada</option>
                <option value="Por turnos rotativos">Por turnos rotativos</option>
                <option value="Fines de semana">Fines de semana</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Tipo de contrato
              </label>
              <select
                value={formState.tipoContrato}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, tipoContrato: e.target.value }))
                }
                className="w-full text-xs p-2.5 border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Relación de dependencia">Relación de dependencia</option>
                <option value="Contrato temporal">Contrato temporal</option>
                <option value="Pasantía">Pasantía</option>
                <option value="A convenir">A convenir</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Cantidad de vacantes
              </label>
              <Input
                type="number"
                min="1"
                value={formState.vacantes}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    vacantes: parseInt(e.target.value, 10) || 1,
                  }))
                }
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Ubicación del puesto
              </label>
              <Input
                value={formState.ubicacion}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, ubicacion: e.target.value }))
                }
                placeholder="Funes, Santa Fe"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Descripción de tareas y responsabilidades <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={formState.descripcion}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Detallá las principales responsabilidades del cargo..."
                className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Requisitos excluyentes y deseables <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={formState.requisitos}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, requisitos: e.target.value }))
                }
                placeholder="Ej: Secundario completo, carnet de conducir B1, manejo de Excel..."
                className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Experiencia requerida
              </label>
              <Input
                value={formState.experienciaRequerida}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    experienciaRequerida: e.target.value,
                  }))
                }
                placeholder="Ej: Mínimo 1 año en puestos similares"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Fecha límite de postulación (opcional)
              </label>
              <Input
                type="date"
                value={formState.fechaLimite}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, fechaLimite: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {ofertaToEdit ? 'Guardar Cambios' : 'Crear Borrador'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
