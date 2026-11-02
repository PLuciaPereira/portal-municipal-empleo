'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
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
import { ArrowLeft, Calendar, ShieldCheck, Check, Building2, Laptop, Layers } from 'lucide-react';
import { RichTextToolbar } from '@/components/ui/RichTextToolbar';
import Link from 'next/link';

interface CompanyJobFormProps {
  ofertaToEdit?: Oferta | null;
  onSuccess?: () => void;
}

interface FormState {
  titulo: string;
  descripcion: string;
  requisitos: string;
  experienciaRequerida: string;
  tipoJornada: string;
  tipoContrato: string;
  modalidadTrabajo: string;
  ubicacion: string;
  rangoSalarial: string;
  vacantes: number;
  fechaLimite: string;
  rubroId: number | '';
}

export function CompanyJobForm({ ofertaToEdit, onSuccess }: CompanyJobFormProps) {
  const router = useRouter();
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [loadingRubros, setLoadingRubros] = useState(false);
  const [submittingBorrador, setSubmittingBorrador] = useState(false);
  const [submittingPublicar, setSubmittingPublicar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modo de selección de vigencia: 'preset' o 'custom' (fecha fija)
  const [vigenciaMode, setVigenciaMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetDays, setSelectedPresetDays] = useState<number | null>(30);

  const [formState, setFormState] = useState<FormState>(() => ({
    titulo: ofertaToEdit?.titulo || '',
    descripcion: ofertaToEdit?.descripcion || '',
    requisitos: ofertaToEdit?.requisitos || '',
    experienciaRequerida: ofertaToEdit?.experiencia_requerida || '',
    tipoJornada: ofertaToEdit?.tipo_jornada || 'Jornada completa',
    tipoContrato: ofertaToEdit?.tipo_contrato || 'Relación de dependencia',
    modalidadTrabajo: ofertaToEdit?.modalidad_trabajo || 'Presencial',
    ubicacion: ofertaToEdit?.ubicacion || 'Funes, Santa Fe',
    rangoSalarial: ofertaToEdit?.rango_salarial || '',
    vacantes: ofertaToEdit?.vacantes || 1,
    fechaLimite: ofertaToEdit?.fecha_limite || '',
    rubroId: ofertaToEdit?.rubro_id || '',
  }));

  // Sincronizar fecha al montar si tiene fecha limite previa
  useEffect(() => {
    if (ofertaToEdit?.fecha_limite) {
      setVigenciaMode('custom');
      setSelectedPresetDays(null);
    }
  }, [ofertaToEdit]);

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
    loadRubros();
    return () => {
      isMounted = false;
    };
  }, []);

  // Calcular fecha sumando días
  const handleSelectDaysPreset = (days: number) => {
    setSelectedPresetDays(days);
    setVigenciaMode('preset');
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    setFormState((prev) => ({ ...prev, fechaLimite: dateStr }));
  };

  const handleCustomDateMode = () => {
    setVigenciaMode('custom');
    setSelectedPresetDays(null);
  };

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

  const handleSaveBorrador = async () => {
    if (!validateForm()) return;

    setSubmittingBorrador(true);
    setError(null);
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
          setError(res.error || 'No se pudo registrar el borrador.');
          return;
        }
      }

      setSuccessMsg('Borrador guardado correctamente.');
      if (onSuccess) onSuccess();
      router.push('/empresa?tab=ofertas');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el borrador.');
    } finally {
      setSubmittingBorrador(false);
    }
  };

  const handleCrearOfertaYEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmittingPublicar(true);
    setError(null);
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

      if (onSuccess) onSuccess();
      router.push('/empresa?tab=ofertas');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setSubmittingPublicar(false);
    }
  };

  const isBusy = submittingBorrador || submittingPublicar;

  return (
    <div className="w-full">
      {/* Barra de cabecera */}
      <div className="border-b border-border bg-white px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/empresa?tab=ofertas"
              className="p-2 rounded-xl border border-border hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a mis ofertas</span>
            </Link>
            <div className="h-4 w-px bg-zinc-200" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {ofertaToEdit ? 'Editar Oferta Laboral' : 'Nueva Búsqueda Laboral'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Completá los datos del puesto para que la Municipalidad revise y apruebe tu oferta antes de iniciar la búsqueda y derivación de postulantes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario principal a 2 columnas */}
      <form onSubmit={handleCrearOfertaYEnviar} className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-start gap-2.5">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda (70%): Contenido del Puesto */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-5 shadow-xs">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/80 pb-3">
                1. Información Principal del Puesto
              </h2>

              {/* Título del puesto */}
              <div>
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

              {/* Descripción de tareas con RichTextToolbar */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Descripción de tareas y responsabilidades <span className="text-rose-600">*</span>
                </label>
                <RichTextToolbar
                  textareaId="job-descripcion"
                  value={formState.descripcion}
                  onChange={(val: string) => setFormState((prev) => ({ ...prev, descripcion: val }))}
                  disabled={isBusy}
                />
                <textarea
                  id="job-descripcion"
                  rows={4}
                  value={formState.descripcion}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  placeholder="Detallá las principales tareas del cargo. Podés usar negrita y listas..."
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-b-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-surface transition-colors font-sans"
                  required
                  disabled={isBusy}
                />
              </div>

              {/* Requisitos con RichTextToolbar */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Requisitos excluyentes y deseables <span className="text-rose-600">*</span>
                </label>
                <RichTextToolbar
                  textareaId="job-requisitos"
                  value={formState.requisitos}
                  onChange={(val: string) => setFormState((prev) => ({ ...prev, requisitos: val }))}
                  disabled={isBusy}
                />
                <textarea
                  id="job-requisitos"
                  rows={4}
                  value={formState.requisitos}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, requisitos: e.target.value }))
                  }
                  placeholder="Ej: Secundario completo, experiencia en el rubro, manejo de herramientas..."
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-b-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-surface transition-colors font-sans"
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
            </div>
          </div>

          {/* Columna Derecha (30%): Condiciones y Vigencia */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4 shadow-xs">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/80 pb-3">
                2. Condiciones del Empleo
              </h2>

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

              {/* Modalidad de trabajo */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Modalidad de trabajo <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'Presencial', icon: Building2 },
                    { id: 'Remoto', icon: Laptop },
                    { id: 'Híbrido', icon: Layers },
                  ].map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = formState.modalidadTrabajo === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, modalidadTrabajo: item.id }))}
                        className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-brand-900 text-white border-brand-900 shadow-2xs'
                            : 'bg-surface border-border text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{item.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de contrato y Vacantes en 2 columnas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Vacantes
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

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Contrato
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
              </div>

              {/* Ubicación del puesto */}
              <div>
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

              {/* Rango salarial opcional */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Rango salarial <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  value={formState.rangoSalarial}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, rangoSalarial: e.target.value }))
                  }
                  placeholder="Ej: A convenir / Según convenio"
                  disabled={isBusy}
                />
              </div>

              {/* Selector de Vigencia Simplificado y Preciso */}
              <div className="pt-3 border-t border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    Duración de la publicación
                  </label>
                  <span className="text-[11px] text-brand-800 font-bold">Oficial Funes</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                  {[
                    { days: 7, label: '7 días' },
                    { days: 15, label: '15 días' },
                    { days: 30, label: '30 días' },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => handleSelectDaysPreset(p.days)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        vigenciaMode === 'preset' && selectedPresetDays === p.days
                          ? 'bg-brand-800 text-white border-brand-800 shadow-2xs'
                          : 'bg-surface border-border text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleCustomDateMode}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      vigenciaMode === 'custom'
                        ? 'bg-brand-800 text-white border-brand-800 shadow-2xs'
                        : 'bg-surface border-border text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Fecha</span>
                  </button>
                </div>

                {vigenciaMode === 'custom' && (
                  <div className="pt-1.5">
                    <Input
                      type="date"
                      value={formState.fechaLimite}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, fechaLimite: e.target.value }))
                      }
                      min={new Date().toISOString().split('T')[0]}
                      disabled={isBusy}
                    />
                  </div>
                )}

                {/* Cartel explicativo de fecha de vencimiento clara */}
                <div className="p-3 bg-brand-50/70 border border-brand-200/80 rounded-xl text-xs text-brand-950 flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-brand-800 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold block text-brand-900">Fecha de vencimiento:</span>
                    <span>
                      {formState.fechaLimite
                        ? `Esta oferta finalizará el ${new Date(formState.fechaLimite + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`
                        : 'Vigencia predeterminada de 30 días a partir de la aprobación municipal.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso de revisión municipal oficial */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Intermediación municipal de Funes
              </span>
              <p className="text-[11.5px] text-emerald-900/90 leading-relaxed">
                Al enviar la oferta, la Oficina de Empleo de Funes verificará las condiciones y comenzará la preselección y derivación de candidatos idóneos.
              </p>
            </div>
          </div>
        </div>

        {/* Botonera de Acciones (Flujo natural al pie del formulario, sin barra flotante) */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 w-full sm:w-auto">
            <AlertTriangleIcon className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Revisá los datos antes de enviar. Una vez enviada para revisión municipal, no podrás modificarla.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/empresa?tab=ofertas')}
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
              Guardar borrador
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={submittingPublicar}
              disabled={isBusy}
            >
              <SendIcon className="w-4 h-4 mr-1.5" />
              {ofertaToEdit ? 'Guardar y Enviar' : 'Crear oferta'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
