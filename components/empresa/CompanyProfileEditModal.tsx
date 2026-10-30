'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState } from 'react';
import { Empresa } from '@/types/database';
import { updateEmpresaProfile, subirLogoEmpresa, reenviarSolicitudEmpresa } from '@/lib/empresa';
import { Camera, Trash2, Upload, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { XMarkIcon, BuildingIcon } from '@/components/ui/Icons';
import { Lock } from 'lucide-react';

export interface CompanyProfileEditModalProps {
  isOpen: boolean;
  empresa: Empresa;
  isReenvio?: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export const CompanyProfileEditModal: React.FC<CompanyProfileEditModalProps> = ({
  isOpen,
  empresa,
  isReenvio = false,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(Boolean(isOpen));
  const [nombreFantasia, setNombreFantasia] = useState(empresa.nombre_fantasia || '');
  const [personaContacto, setPersonaContacto] = useState(empresa.persona_contacto || '');
  const [telefono, setTelefono] = useState(empresa.telefono || '');
  const [emailContacto, setEmailContacto] = useState(empresa.email_contacto || '');
  const [direccion, setDireccion] = useState(empresa.direccion || '');
  const [localidad, setLocalidad] = useState(empresa.localidad || 'Funes');
  const [rubro, setRubro] = useState(empresa.rubro || '');
  const [sitioWeb, setSitioWeb] = useState(empresa.sitio_web || '');
  const [descripcion, setDescripcion] = useState(empresa.descripcion || '');
  const [logoUrl, setLogoUrl] = useState<string | null>(empresa.logo_url || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(empresa.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('El logo no debe superar los 2MB.');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombreFantasia.trim()) {
      setErrorMsg('El nombre de fantasía o comercial es obligatorio.');
      return;
    }

    if (!personaContacto.trim()) {
      setErrorMsg('El nombre de la persona de contacto es obligatorio.');
      return;
    }

    if (!telefono.trim()) {
      setErrorMsg('El teléfono de contacto es obligatorio para coordinar derivaciones.');
      return;
    }

    if (!emailContacto.trim()) {
      setErrorMsg('El correo electrónico de contacto es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      if (logoFile) {
        setUploadingLogo(true);
        const upRes = await subirLogoEmpresa(empresa.id, logoFile);
        if (upRes.error) {
          setErrorMsg(upRes.error);
          setIsSaving(false);
          setUploadingLogo(false);
          return;
        }
        setUploadingLogo(false);
      }

      const datosActualizados = {
        nombre_fantasia: nombreFantasia.trim(),
        persona_contacto: personaContacto.trim(),
        telefono: telefono.trim(),
        email_contacto: emailContacto.trim(),
        direccion: direccion.trim() || 'Funes',
        localidad: localidad.trim() || 'Funes',
        rubro: rubro.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        descripcion: descripcion.trim() || null,
      };

      const res = isReenvio
        ? await reenviarSolicitudEmpresa(empresa.id, datosActualizados)
        : await updateEmpresaProfile(datosActualizados);

      if (!res.success) {
        setErrorMsg(res.error || 'Ocurrió un error al guardar los cambios.');
        setIsSaving(false);
        return;
      }

      await onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado.';
      setErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-profile-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-[#F8FAF8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DDEFE3] text-[#0A3D2A] flex items-center justify-center font-bold">
              <BuildingIcon className="w-5 h-5 text-[#0A3D2A]" />
            </div>
            <div>
              <h2
                id="company-profile-modal-title"
                className="text-lg font-extrabold text-[#10231B] font-display"
              >
                {isReenvio ? 'Corregir Datos y Reenviar Solicitud' : 'Editar Perfil de la Empresa'}
              </h2>
              <p className="text-xs text-[#4B6256]">
                {isReenvio ? 'Modificá los datos observados por la Oficina de Empleo para volver a solicitar la habilitación municipal.' : 'Actualizá tus datos comerciales y vías de contacto directo.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Bloque informativo de datos de validez fiscal y municipal protegidos */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-zinc-900 block">
                  Datos de validez legal y fiscal registrados ante el Municipio
                </span>
                <span className="text-[11px] text-zinc-600 leading-relaxed block mt-0.5">
                  El CUIT y la Razón Social están validados por la Oficina de Empleo de Funes. Si necesitás rectificarlos, contactá al equipo municipal de intermediación.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200/80">
              <div className="bg-white px-3.5 py-2.5 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">
                  CUIT Registrado
                </span>
                <span className="text-xs font-bold text-zinc-800 font-mono">
                  {empresa.cuit || 'Sin especificar'}
                </span>
              </div>
              <div className="bg-white px-3.5 py-2.5 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">
                  Razón Social Legal
                </span>
                <span className="text-xs font-bold text-zinc-800 truncate block">
                  {empresa.razon_social || 'Sin especificar'}
                </span>
              </div>
            </div>
          </div>

          {/* Logotipo de la Empresa */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt={nombreFantasia || 'Logo de la empresa'}
                  className="w-20 h-20 rounded-2xl object-contain bg-white border-2 border-emerald-300 p-1 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-emerald-200 flex flex-col items-center justify-center text-emerald-800 shadow-sm">
                  <Building2 className="w-8 h-8" />
                  <span className="text-[10px] font-semibold mt-1">Sin Logo</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <h4 className="text-xs font-bold text-zinc-900">Logotipo Institucional</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Aparecerá en el encabezado de tu panel y en tus publicaciones laborales en el portal. Formatos JPG o PNG hasta 2MB.
              </p>
              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{logoPreview ? 'Cambiar logo' : 'Subir logo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={isSaving || uploadingLogo}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Formulario editable */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">
              Información Comercial y de Difusión
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Nombre de Fantasía / Comercial *
                </label>
                <Input
                  value={nombreFantasia}
                  onChange={(e) => setNombreFantasia(e.target.value)}
                  placeholder="Ej: Panadería La Espiga"
                  required
                />
                <span className="text-[11px] text-zinc-600 mt-1 block">
                  Nombre visible para los postulantes en las ofertas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Rubro / Actividad Principal
                </label>
                <Input
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  placeholder="Ej: Gastronomía, Construcción, Comercio..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Persona de Contacto (RRHH / Referente) *
                </label>
                <Input
                  value={personaContacto}
                  onChange={(e) => setPersonaContacto(e.target.value)}
                  placeholder="Ej: Laura Gómez (Encargada)"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Teléfono / WhatsApp de Contacto *
                </label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 3415551234"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Correo Electrónico de Contacto *
                </label>
                <Input
                  type="email"
                  value={emailContacto}
                  onChange={(e) => setEmailContacto(e.target.value)}
                  placeholder="contacto@empresa.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Sitio Web o Red Social
                </label>
                <Input
                  type="url"
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                  placeholder="https://miempresa.com o Instagram"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Dirección en Funes / Zona
                </label>
                <Input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Av. Santa Fe 1500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Localidad
                </label>
                <Input
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  placeholder="Funes"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Descripción Institucional de la Empresa
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Breve reseña sobre la actividad de la empresa, su equipo y trayectoria en la región..."
                className="w-full text-xs rounded-xl border border-zinc-300 p-3 focus:outline-hidden focus:ring-2 focus:ring-[#0E4D36] focus:border-transparent text-zinc-900 bg-white"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
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
              disabled={isSaving}
              className="bg-[#0E4D36] hover:bg-[#06402B] text-white"
            >
              {isSaving ? 'Enviando...' : isReenvio ? 'Reenviar Solicitud de Habilitación' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
