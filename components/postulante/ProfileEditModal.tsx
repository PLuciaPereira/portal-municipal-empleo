'use client';

import React, { useState } from 'react';
import { Rubro } from '@/types/database';
import {
  PostulanteProfileFull,
  updatePostulanteProfile,
  uploadAvatarPostulante,
  removeAvatarPostulante,
} from '@/lib/postulante';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { XMarkIcon } from '@/components/ui/Icons';
import { Camera, Trash2, User } from 'lucide-react';

export interface ProfileEditModalProps {
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

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  profile,
  availableRubros,
  onClose,
  onSaved,
}) => {
  const [nombre, setNombre] = useState(profile.nombre || '');
  const [apellido, setApellido] = useState(profile.apellido || '');
  const [dni, setDni] = useState(profile.dni || '');
  const [telefono, setTelefono] = useState(profile.telefono || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState(
    profile.fecha_nacimiento ? profile.fecha_nacimiento.slice(0, 10) : ''
  );
  const [direccion, setDireccion] = useState(profile.direccion || '');
  const [localidad, setLocalidad] = useState(
    profile.localidad || (profile.es_residente_funes ? 'Funes' : '')
  );
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

  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('La foto de perfil no debe superar los 2MB.');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (confirm('¿Querés eliminar tu foto de perfil?')) {
      setUploadingAvatar(true);
      await removeAvatarPostulante(profile.id);
      setAvatarUrl(null);
      setAvatarFile(null);
      setAvatarPreview(null);
      setUploadingAvatar(false);
    }
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

      // Subir foto de perfil si fue seleccionada
      if (avatarFile) {
        setUploadingAvatar(true);
        const upRes = await uploadAvatarPostulante(profile.id, avatarFile);
        if (upRes.error) {
          setErrorMsg(upRes.error);
          setIsSaving(false);
          setUploadingAvatar(false);
          return;
        }
        setUploadingAvatar(false);
      }

      const res = await updatePostulanteProfile({
        nombre,
        apellido,
        dni,
        telefono,
        fecha_nacimiento: fechaNacimiento || null,
        direccion: direccion || null,
        localidad,
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
      setErrorMsg('Ocurrió un error al guardar los cambios. Intentá nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Cerrar ventana de edición"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="mb-5">
          <h3 id="edit-profile-modal-title" className="text-xl font-bold text-zinc-900">
            Editar Perfil Personal y Laboral
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Mantené tus datos actualizados para que la Oficina de Empleo pueda evaluar mejor tu perfil en las búsquedas de Funes.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-5">
            {/* Foto de Perfil */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={nombre || 'Postulante'}
                    className="w-20 h-20 rounded-full object-cover border-2 border-emerald-300 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl border-2 border-emerald-200 shadow-sm">
                    {nombre ? nombre.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <h4 className="text-xs font-bold text-zinc-900">Foto de Perfil</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Subí una foto clara y profesional (JPG, PNG o WebP, máx. 2MB). Esta imagen se compartirá cuando seas presentado a una oferta.
                </p>
                <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{avatarPreview ? 'Cambiar foto' : 'Subir foto'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={isSaving || uploadingAvatar}
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
                      disabled={isSaving || uploadingAvatar}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sección 1: Datos Personales y Contacto */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-zinc-100 pb-1.5">
                1. Datos Personales y Contacto
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Nombre *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
                <Input
                  label="Apellido *"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Tu apellido"
                  required
                />
                <Input
                  label="DNI (sin puntos) *"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej: 38123456"
                  required
                />
                <Input
                  label="Teléfono / WhatsApp *"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 341 555-1234"
                  required
                />
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                />
                <Input
                  label="Localidad de residencia *"
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  placeholder="Ej: Funes"
                  required
                />
              </div>

              <Input
                label="Dirección / Domicilio"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle y altura, barrio"
              />
            </div>

            {/* Sección 2: Formación, Experiencia y Disponibilidad */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-zinc-100 pb-1.5">
                2. Formación, Experiencia y Disponibilidad
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Nivel educativo alcanzado
                  </label>
                  <select
                    value={nivelEducativo}
                    onChange={(e) => setNivelEducativo(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus:outline-none focus:border-brand-800 focus:ring-3 focus:ring-brand-800/15"
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
                  <label className="block text-sm font-medium text-foreground">
                    Situación laboral actual
                  </label>
                  <select
                    value={situacionLaboral}
                    onChange={(e) => setSituacionLaboral(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus:outline-none focus:border-brand-800 focus:ring-3 focus:ring-brand-800/15"
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
                  <label className="block text-sm font-medium text-foreground">
                    Disponibilidad horaria
                  </label>
                  <select
                    value={disponibilidadHoraria}
                    onChange={(e) => setDisponibilidadHoraria(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus:outline-none focus:border-brand-800 focus:ring-3 focus:ring-brand-800/15"
                  >
                    <option value="">Seleccionar disponibilidad...</option>
                    {DISPONIBILIDADES_HORARIAS.map((disp) => (
                      <option key={disp} value={disp}>
                        {disp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <Checkbox
                    label="Cuento con movilidad propia (auto, moto o bicicleta)"
                    checked={movilidadPropia}
                    onChange={(e) => setMovilidadPropia(e.target.checked)}
                  />
                </div>
              </div>

              <Input
                label="Habilidades, oficios o herramientas (separadas por coma)"
                value={habilidadesTexto}
                onChange={(e) => setHabilidadesTexto(e.target.value)}
                placeholder="Ej: Atención al cliente, Excel, Facturación, Manejo de caja, Inglés básico"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Resumen de experiencia laboral
                </label>
                <textarea
                  rows={3}
                  value={experienciaResumen}
                  onChange={(e) => setExperienciaResumen(e.target.value)}
                  placeholder="Describí brevemente tus principales experiencias laborales, puestos anteriores o tareas que sabés realizar..."
                  className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground focus:outline-none focus:border-brand-800 focus:ring-3 focus:ring-brand-800/15 resize-none"
                />
              </div>
            </div>

            {/* Sección 3: Rubros de interés */}
            {availableRubros.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-zinc-100 pb-1.5">
                  3. Rubros Laborales de Interés
                </h4>
                <p className="text-xs text-zinc-500">
                  Seleccioná las áreas en las que te interesa postularte o ser tenido en cuenta por la Oficina de Empleo:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {availableRubros.map((rubro) => {
                    const isChecked = selectedRubroIds.includes(rubro.id);
                    return (
                      <label
                        key={rubro.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-zinc-50/60 border-zinc-200 text-zinc-700 hover:bg-zinc-100/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRubro(rubro.id)}
                          className="w-4 h-4 rounded border-zinc-300 text-brand-800 accent-brand-800"
                        />
                        <span className="truncate">{rubro.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
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
              Guardar Perfil
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
