'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState } from 'react';
import {
  PostulanteProfileFull,
  updatePostulanteProfile,
  uploadAvatarPostulante,
  removeAvatarPostulante,
} from '@/lib/postulante';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { XMarkIcon } from '@/components/ui/Icons';
import { Camera, Trash2, User } from 'lucide-react';

export interface ProfilePersonalModalProps {
  isOpen: boolean;
  profile: PostulanteProfileFull;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export const ProfilePersonalModal: React.FC<ProfilePersonalModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(Boolean(isOpen));

  const [nombre, setNombre] = useState(profile.nombre || '');
  const [apellido, setApellido] = useState(profile.apellido || '');
  const [dni, setDni] = useState(profile.dni || '');
  const [telefono, setTelefono] = useState(profile.telefono || '');
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

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
      try {
        setUploadingAvatar(true);
        await removeAvatarPostulante(profile.id);
        setAvatarFile(null);
        setAvatarPreview(null);
        await onSaved();
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setIsSaving(true);

      // Subir foto si fue seleccionada
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
      });

      if (res.success) {
        await onSaved();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Ocurrió un error al guardar los datos personales. Intentá nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-personal-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Cerrar ventana de edición"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="mb-5">
          <h3 id="edit-personal-modal-title" className="text-xl font-bold text-zinc-900 font-sans">
            Datos Personales y Contacto
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Información de identidad y vías de contacto directo resguardadas por la Oficina de Empleo.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto de Perfil */}
          <div className="p-3.5 bg-brand-50/60 rounded-xl border border-brand-100 flex flex-col sm:flex-row items-center gap-3.5">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={nombre || 'Postulante'}
                  className="w-16 h-16 rounded-2xl object-cover border border-brand-300 shadow-2xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xl border border-brand-200 shadow-2xs">
                  {nombre ? nombre.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                </div>
              )}
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <span className="text-xs font-bold text-zinc-900 block">Foto de Perfil</span>
              <p className="text-[11px] text-zinc-500 leading-tight">
                JPG, PNG o WebP (máx. 2MB).
              </p>
              <div className="flex items-center gap-2 pt-0.5 justify-center sm:justify-start">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-brand-800 text-white rounded-lg text-xs font-semibold hover:bg-brand-900 transition-colors shadow-2xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{avatarPreview ? 'Cambiar' : 'Subir foto'}</span>
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                    disabled={isSaving || uploadingAvatar}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

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
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Ej: 38123456"
              required
            />
            <Input
              label="Teléfono / WhatsApp *"
              type="tel"
              inputMode="numeric"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 3415551234"
              required
            />
            <Input
              label="Localidad de residencia *"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Ej: Funes"
              required
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />
          </div>

          <Input
            label="Dirección / Domicilio"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Calle y altura, barrio"
          />

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
              Guardar Datos Personales
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
