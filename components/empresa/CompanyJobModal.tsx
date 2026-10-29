'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  XIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  SaveIcon,
  SendIcon,
} from '@/components/ui/Icons';
import { Rubro, Oferta } from '@/types/database';
import {
  crearOfertaBorrador,
  actualizarOfertaBorrador,
  enviarOfertaARevision,
} from '@/lib/empresa';
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
    useBodyScrollLock(Boolean(isOpen));
const [rubros, setRubros] = useState<Rubro[]>([]);
  const [loadingRubros, setLoadingRubros] = useState(false);
  const [submittingBorrador, setSubmittingBorrador] = useState(false);
  const [submittingPublicar, setSubmittingPublicar] = useState(false);
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

  const validateForm = () => {
    setError(null);
    if (!formState.titulo.trim()) {
      setError('El título de la vacante es obligatorio.');
      return false;
    }
    if (!formState.rubroId) {
      setError('Seleccioná un rubro o sector de actividad.');
      return false;
    }
    if (!formState.tipoJornada.trim()) {
      setError('El tipo de jornada es obligatorio.');
      return false;
    }
    if (!formState.descripcion.trim()) {
      setError('La descripción de tareas es obligatoria.');
      return false;
    }
    if (!formState.requisitos.trim()) {
      setError('Los requisitos del puesto son obligatorios.');
      return false;
    }
    return true;
  };

  /**
   * Guarda la oferta en estado 'borrador' (nueva o edición).
   */
  const handleSaveBorrador = async () => {
    if (!validateForm()) return;

    setSubmittingBorrador(true);
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
          setError(res.error || 'No se pudo guardar la oferta en borrador.');
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
      setError(msg);
    } finally {
      setSubmittingBorrador(false);
    }
  };

  /**
   * Guarda la oferta y la envía inmediatamente para revisión municipal ('pendiente_revision').
   */
  const handleCrearOfertaYEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setSubmittingPublicar(true);
    try {
      let ofertaId = ofertaToEdit?.id;

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
          setError(res.error || 'No se pudieron actualizar los datos de la oferta.');
          return;
        }
        ofertaId = res.data.id;
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
          setError(res.error || 'No se pudo registrar la oferta.');
          return;
        }
        ofertaId = res.data.id;
      }

      if (ofertaId) {
        const reviewRes = await enviarOfertaARevision(ofertaId);
        if (!reviewRes.success) {
          setError(
            reviewRes.error ||
              'La oferta se guardó, pero no pudo enviarse a revisión automáticamente.'
          );
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
      setError(msg);
    } finally {
      setSubmittingPublicar(false);
    }
  };

  const isBusy = submittingBorrador || submittingPublicar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-border max-h-[92vh] flex flex-col">
        {/* Encabezado */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border/80 shrink-0 gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
              {ofertaToEdit ? 'Editar Oferta Laboral' : 'Nueva Búsqueda Laboral'}
            </h2>
            <p className="text-xs text-muted-foreground leading-normal">
              Completá los datos del puesto para que la Municipalidad revise y apruebe tu oferta antes de iniciar la búsqueda y derivación de postulantes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer shrink-0 mt-0.5"
            disabled={isBusy}
            aria-label="Cerrar modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario con Scroll */}
        <form onSubmit={handleCrearOfertaYEnviar} className="overflow-y-auto p-6 space-y-4 grow">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
              <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Título del puesto */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Título del puesto o vacante <span className="text-rose-600">*</span>
              </label>
              <Input
                value={formState.titulo}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ej: Repositor de depósito"
                required
                disabled={isBusy}
              />
            </div>

            {/* Rubro principal / Categoría */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Categoría / Rubro principal <span className="text-rose-600">*</span>
              </label>
              <select
                value={formState.rubroId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    rubroId: e.target.value ? Number(e.target.value) : '',
                  }))
                }
                className="w-full text-xs sm:text-sm p-2.5 border border-border rounded-xl bg-surface focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
                required
                disabled={loadingRubros || isBusy}
              >
                <option value="">Seleccioná una categoría...</option>
                {rubros.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Jornada */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Tipo de jornada <span className="text-rose-600">*</span>
              </label>
              <select
                value={formState.tipoJornada}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, tipoJornada: e.target.value }))
                }
                className="w-full text-xs sm:text-sm p-2.5 border border-border rounded-xl bg-surface focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
                required
                disabled={isBusy}
              >
                <option value="Jornada completa">Jornada completa</option>
                <option value="Media jornada">Media jornada</option>
                <option value="Por turnos rotativos">Por turnos rotativos</option>
                <option value="Fines de semana">Fines de semana</option>
              </select>
            </div>

            {/* Tipo de contrato */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Tipo de contrato
              </label>
              <select
                value={formState.tipoContrato}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, tipoContrato: e.target.value }))
                }
                className="w-full text-xs sm:text-sm p-2.5 border border-border rounded-xl bg-surface focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
                disabled={isBusy}
              >
                <option value="Relación de dependencia">Relación de dependencia</option>
                <option value="Contrato temporal">Contrato temporal</option>
                <option value="Pasantía">Pasantía</option>
                <option value="A convenir">A convenir</option>
              </select>
            </div>

            {/* Cantidad de vacantes */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Cantidad de vacantes
              </label>
              <Input
                type="number"
                min="1"
                value={formState.vacantes}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setFormState((prev) => ({
                    ...prev,
                    vacantes: cleaned ? parseInt(cleaned, 10) : 1,
                  }));
                }}
                required
                disabled={isBusy}
              />
            </div>

            {/* Ubicación del puesto */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Ubicación del puesto
              </label>
              <Input
                value={formState.ubicacion}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, ubicacion: e.target.value }))
                }
                placeholder="Funes, Santa Fe"
                disabled={isBusy}
              />
            </div>

            {/* Descripción de tareas */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Descripción de tareas y responsabilidades <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={formState.descripcion}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Detallá las principales responsabilidades del cargo..."
                className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-surface transition-colors"
                required
                disabled={isBusy}
              />
            </div>

            {/* Requisitos */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Requisitos excluyentes y deseables <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={formState.requisitos}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, requisitos: e.target.value }))
                }
                placeholder="Ej: Secundario completo, carnet de conducir B1, manejo de Excel..."
                className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-surface transition-colors"
                required
                disabled={isBusy}
              />
            </div>

            {/* Experiencia requerida */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
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
                disabled={isBusy}
              />
            </div>

            {/* Fecha límite */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Fecha límite de postulación <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                type="date"
                value={formState.fechaLimite}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, fechaLimite: e.target.value }))
                }
                disabled={isBusy}
              />
              <p className="mt-1 text-[11px] text-zinc-500 leading-tight">
                Vigencia: Si no especificás una fecha límite, la oferta tendrá una validez estándar de 30 días corridos a partir de su publicación y luego se retirará automáticamente del portal.
              </p>
            </div>
          </div>

          {/* Pie: Aviso destacado + Botonera */}
          <div className="pt-4 mt-6 border-t border-border/80 space-y-4">
            {/* Aviso destacado arriba de los botones */}
            <div
              role="note"
              className="p-3 sm:p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs"
            >
              <AlertTriangleIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-normal">
                Revisá cuidadosamente los datos ingresados antes de enviar la oferta. Una vez enviada para revisión municipal, no podrás modificarla.
              </p>
            </div>

            {/* Tres botones de acción */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isBusy}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSaveBorrador}
                isLoading={submittingBorrador}
                disabled={isBusy}
              >
                <SaveIcon className="w-4 h-4 mr-1.5 text-foreground" />
                Borrador
              </Button>

              <Button
                type="submit"
                variant="primary"
                isLoading={submittingPublicar}
                disabled={isBusy}
              >
                <SendIcon className="w-4 h-4 mr-1.5" />
                Crear Oferta
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
