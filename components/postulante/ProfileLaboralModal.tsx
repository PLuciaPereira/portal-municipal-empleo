'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState } from 'react';
import { Rubro } from '@/types/database';
import {
  PostulanteProfileFull,
  updatePostulanteProfile,
} from '@/lib/postulante';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { XMarkIcon } from '@/components/ui/Icons';

export interface ProfileLaboralModalProps {
  isOpen: boolean;
  profile: PostulanteProfileFull;
  availableRubros: Rubro[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const NIVELES_EDUCATIVOS = [
  'Primario incompleto',
  'Primario completo',
  'Secundario incompleto',
  'Secundario en curso',
  'Secundario completo',
  'Terciario / Técnico en curso',
  'Terciario / Técnico completo',
  'Universitario en curso',
  'Universitario completo',
  'Posgrado',
];

const SITUACIONES_LABORALES = [
  'En búsqueda activa (desempleado/a)',
  'Trabajando (buscando mejorar o cambiar)',
  'Trabajador/a independiente o eventual',
  'Primer empleo / Estudiante',
];

const DISPONIBILIDADES_HORARIAS = [
  'Jornada completa (Full-time)',
  'Media jornada (Part-time - Mañana)',
  'Media jornada (Part-time - Tarde)',
  'Horarios rotativos / Fines de semana',
  'Flexible / A convenir',
];

export const ProfileLaboralModal: React.FC<ProfileLaboralModalProps> = ({
  isOpen,
  profile,
  availableRubros,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(Boolean(isOpen));

  const [nivelEducativo, setNivelEducativo] = useState(profile.nivel_educativo || '');
  const [situacionLaboral, setSituacionLaboral] = useState(
    profile.situacion_laboral_actual || ''
  );
  const [experienciaResumen, setExperienciaResumen] = useState(
    profile.experiencia_resumen || ''
  );
  const [habilidadesTexto, setHabilidadesTexto] = useState(
    (profile.habilidades || []).join(', ')
  );
  const [disponibilidadHoraria, setDisponibilidadHoraria] = useState(
    profile.disponibilidad_horaria || ''
  );
  const [movilidadPropia, setMovilidadPropia] = useState(
    Boolean(profile.movilidad_propia)
  );
  const [selectedRubroIds, setSelectedRubroIds] = useState<number[]>(
    (profile.rubros || []).map((r) => r.id)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleRubro = (rubroId: number) => {
    setSelectedRubroIds((prev) =>
      prev.includes(rubroId) ? prev.filter((id) => id !== rubroId) : [...prev, rubroId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedHabilidades = habilidadesTexto
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    try {
      setIsSaving(true);

      const res = await updatePostulanteProfile({
        nivel_educativo: nivelEducativo || null,
        situacion_laboral_actual: situacionLaboral || null,
        experiencia_resumen: experienciaResumen || null,
        habilidades: parsedHabilidades,
        disponibilidad_horaria: disponibilidadHoraria || null,
        movilidad_propia: movilidadPropia,
        rubroIds: selectedRubroIds,
      });

      if (res.success) {
        await onSaved();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Ocurrió un error al guardar tu perfil laboral. Intentá nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-laboral-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Cerrar ventana de edición laboral"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="mb-5">
          <h3 id="edit-laboral-modal-title" className="text-xl font-bold text-zinc-900 font-sans">
            Trayectoria, Formación y Competencias
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Definí tu experiencia, horarios y oficios para las preselecciones laborales de Funes.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[68vh] overflow-y-auto pr-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Nivel educativo alcanzado
                </label>
                <select
                  value={nivelEducativo}
                  onChange={(e) => setNivelEducativo(e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-brand-800 shadow-2xs cursor-pointer"
                >
                  <option value="">Seleccionar nivel educativo...</option>
                  {NIVELES_EDUCATIVOS.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Situación laboral actual
                </label>
                <select
                  value={situacionLaboral}
                  onChange={(e) => setSituacionLaboral(e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-brand-800 shadow-2xs cursor-pointer"
                >
                  <option value="">Seleccionar situación actual...</option>
                  {SITUACIONES_LABORALES.map((sit) => (
                    <option key={sit} value={sit}>
                      {sit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Disponibilidad horaria
                </label>
                <select
                  value={disponibilidadHoraria}
                  onChange={(e) => setDisponibilidadHoraria(e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-brand-800 shadow-2xs cursor-pointer"
                >
                  <option value="">Seleccionar disponibilidad...</option>
                  {DISPONIBILIDADES_HORARIAS.map((disp) => (
                    <option key={disp} value={disp}>
                      {disp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center pt-5">
                <Checkbox
                  label="Cuento con movilidad propia (auto, moto o bici)"
                  checked={movilidadPropia}
                  onChange={(e) => setMovilidadPropia(e.target.checked)}
                />
              </div>
            </div>

            <Input
              label="Habilidades, oficios o herramientas (separadas por coma)"
              value={habilidadesTexto}
              onChange={(e) => setHabilidadesTexto(e.target.value)}
              placeholder="Ej: Atención al cliente, Facturación, Manejo de caja, Excel, Electricidad"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Resumen de experiencia laboral
              </label>
              <textarea
                rows={3}
                value={experienciaResumen}
                onChange={(e) => setExperienciaResumen(e.target.value)}
                placeholder="Describí brevemente tus principales experiencias previas, puestos desempeñados o tareas que sabés realizar..."
                className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:outline-none focus:border-brand-800 resize-none shadow-2xs"
              />
            </div>

            {/* Rubros de Interés */}
            {availableRubros.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 block">
                    Rubros Laborales de Interés en Funes
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {selectedRubroIds.length} seleccionados
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  {availableRubros.map((rubro) => {
                    const isChecked = selectedRubroIds.includes(rubro.id);
                    return (
                      <label
                        key={rubro.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-brand-50 border-brand-300 text-brand-950 font-semibold'
                            : 'bg-zinc-50/70 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRubro(rubro.id)}
                          className="w-4 h-4 rounded border-zinc-300 text-brand-800 accent-brand-800 cursor-pointer"
                        />
                        <span className="truncate">{rubro.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
            >
              Guardar Perfil Laboral
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
