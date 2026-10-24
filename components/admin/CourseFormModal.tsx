'use client';

import { useState } from 'react';
import { Curso } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  GraduationCap,
  X,
  Building,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CourseFormModalProps {
  curso?: Curso | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (datos: {
    titulo: string;
    descripcion?: string | null;
    institucion?: string | null;
    duracion?: string | null;
    activo?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function CourseFormModal({
  curso,
  isOpen,
  onClose,
  onSave,
}: CourseFormModalProps) {
  const isEditing = Boolean(curso);

  const [titulo, setTitulo] = useState(curso?.titulo || '');
  const [institucion, setInstitucion] = useState(curso?.institucion || '');
  const [duracion, setDuracion] = useState(curso?.duracion || '');
  const [descripcion, setDescripcion] = useState(curso?.descripcion || '');
  const [activo, setActivo] = useState(curso ? curso.activo : true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError('El título de la capacitación o curso es obligatorio.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await onSave({
      titulo: titulo.trim(),
      institucion: institucion.trim() || null,
      duracion: duracion.trim() || null,
      descripcion: descripcion.trim() || null,
      activo,
    });

    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Ocurrió un error al guardar los datos del curso.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-brand-800" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {isEditing ? 'Editar Capacitación' : 'Nueva Capacitación / Curso'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isEditing
                  ? 'Modificá los detalles de la oferta formativa municipal.'
                  : 'Registrá un curso disponible para derivar postulantes.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Título del Curso / Capacitación <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="Ej. Taller de Soldadura y Herrería / Introducción a Programación"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Institución / Sede Formativa
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ej. Punto Digital Funes / UTN"
                  value={institucion}
                  onChange={(e) => setInstitucion(e.target.value)}
                  disabled={loading}
                  className="pl-8"
                />
                <Building className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Duración Estimada
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ej. 2 meses / 40 horas"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  disabled={loading}
                  className="pl-8"
                />
                <Clock className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Descripción y Contenidos
            </label>
            <div className="relative">
              <textarea
                rows={3}
                placeholder="Detalles sobre requisitos previos, temario y competencias que desarrolla la formación..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={loading}
                className="w-full text-xs rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
              />
              <FileText className="w-3.5 h-3.5 text-zinc-400 absolute right-3 bottom-3 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded text-brand-800 border-zinc-300 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-zinc-800">
                Curso activo (disponible para nuevas derivaciones)
              </span>
            </label>
          </div>

          {/* Footer de Acciones */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="bg-brand-800 hover:bg-brand-900 text-white min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Capacitación'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
