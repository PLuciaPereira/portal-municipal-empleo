'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState, useEffect } from 'react';
import { Empresa } from '@/types/database';
import { updateEmpresaAdmin } from '@/lib/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Building2,
  X,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  User,
  Globe,
  FileText,
} from 'lucide-react';

export interface AdminCompanyEditModalProps {
  isOpen: boolean;
  empresa: Empresa | null;
  onClose: () => void;
  onSuccess: (updatedEmpresa: Empresa) => void;
}

export function AdminCompanyEditModal({
  isOpen,
  empresa,
  onClose,
  onSuccess,
}: AdminCompanyEditModalProps) {
  useBodyScrollLock(Boolean(isOpen));

  const [cuit, setCuit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');
  const [personaContacto, setPersonaContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('Funes');
  const [rubro, setRubro] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar campos cuando se abre con una empresa
  useEffect(() => {
    if (empresa) {
      setCuit(empresa.cuit || '');
      setRazonSocial(empresa.razon_social || '');
      setNombreFantasia(empresa.nombre_fantasia || '');
      setPersonaContacto(empresa.persona_contacto || '');
      setTelefono(empresa.telefono || '');
      setEmailContacto(empresa.email_contacto || '');
      setDireccion(empresa.direccion || '');
      setLocalidad(empresa.localidad || 'Funes');
      setRubro(empresa.rubro || '');
      setSitioWeb(empresa.sitio_web || '');
      setDescripcion(empresa.descripcion || '');
      setErrorMsg(null);
    }
  }, [empresa, isOpen]);

  if (!isOpen || !empresa) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCuit = cuit.trim().replace(/[-\s]/g, '');
    if (!cleanCuit || !/^\d{11}$/.test(cleanCuit)) {
      setErrorMsg('El CUIT debe contener exactamente 11 dígitos numéricos.');
      return;
    }

    if (!razonSocial.trim()) {
      setErrorMsg('La Razón Social legal es obligatoria.');
      return;
    }

    if (!nombreFantasia.trim()) {
      setErrorMsg('El Nombre de Fantasía o Comercial es obligatorio.');
      return;
    }

    if (!personaContacto.trim()) {
      setErrorMsg('La persona o referente de contacto es obligatoria.');
      return;
    }

    if (!telefono.trim()) {
      setErrorMsg('El teléfono de contacto es obligatorio para las derivaciones.');
      return;
    }

    if (!emailContacto.trim() || !emailContacto.includes('@')) {
      setErrorMsg('El correo electrónico de contacto debe ser válido.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateEmpresaAdmin({
        id: empresa.id,
        cuit: cleanCuit,
        razon_social: razonSocial.trim(),
        nombre_fantasia: nombreFantasia.trim(),
        persona_contacto: personaContacto.trim(),
        telefono: telefono.trim(),
        email_contacto: emailContacto.trim(),
        direccion: direccion.trim() || 'Funes',
        localidad: localidad.trim() || 'Funes',
        rubro: rubro.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        descripcion: descripcion.trim() || null,
      });

      if (!result.success || !result.data) {
        setErrorMsg(result.error || 'Ocurrió un error al actualizar la empresa.');
        setSaving(false);
        return;
      }

      onSuccess(result.data);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-admin-company-edit-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-[#F8FAF8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="modal-admin-company-edit-title"
                className="text-lg font-extrabold text-[#10231B] font-display flex items-center gap-2"
              >
                Editar Perfil de Empresa (Admin)
              </h2>
              <p className="text-xs text-[#4B6256]">
                Podés corregir datos fiscales protegidos y la información comercial de la empresa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cartel / Banner: Actuación de Buena Fe */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-950 block">
                  Intervención Administrativa de Buena Fe
                </span>
                <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                  La rectificación de datos fiscales y comerciales se realiza bajo el principio de buena fe y confidencialidad. <strong>Solo debe procederse a solicitud expresa o conformidad directa de la empresa titular</strong> ante la Oficina de Empleo.
                </span>
              </div>
            </div>
          </div>

          {/* Bloque: Datos Fiscales y Legales */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">
              Datos Fiscales y Legales Registrados
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  CUIT <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  placeholder="Ej: 30712345678"
                  maxLength={13}
                  required
                  disabled={saving}
                  className="font-mono bg-white"
                />
                <span className="text-[10px] text-zinc-500 block mt-1">
                  11 dígitos sin guiones ni espacios.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Razón Social Legal <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: Agroservicios Funes S.R.L."
                  required
                  disabled={saving}
                  className="bg-white"
                />
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Denominación inscripta en AFIP.
                </span>
              </div>
            </div>
          </div>

          {/* Bloque: Datos Comerciales */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">
              Información Comercial y Pública
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Nombre Comercial o de Fantasía <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={nombreFantasia}
                  onChange={(e) => setNombreFantasia(e.target.value)}
                  placeholder="Ej: Supermercado El Ombú"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Rubro o Actividad Principal
                </label>
                <Input
                  type="text"
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  placeholder="Ej: Comercio, Logística, Gastronomía"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Sitio Web o Red Social
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <Input
                    type="text"
                    value={sitioWeb}
                    onChange={(e) => setSitioWeb(e.target.value)}
                    placeholder="https://empresa.com.ar"
                    disabled={saving}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Localidad
                </label>
                <Input
                  type="text"
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  placeholder="Funes"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                Dirección Comercial o Sede
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <Input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Ruta 9 y San José"
                  disabled={saving}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                Descripción Institucional
              </label>
              <textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve reseña sobre la actividad, trayectoria o propuesta de valor de la empresa..."
                disabled={saving}
                className="w-full text-xs rounded-xl border border-zinc-200 p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-colors"
              />
            </div>
          </div>

          {/* Bloque: Datos de Contacto Directo */}
          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">
              Vías de Contacto con la Oficina de Empleo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Referente de Contacto <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <Input
                    type="text"
                    value={personaContacto}
                    onChange={(e) => setPersonaContacto(e.target.value)}
                    placeholder="Ej: Lucía Rodríguez"
                    required
                    disabled={saving}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Teléfono de Contacto <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <Input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej: 341 555-1234"
                    required
                    disabled={saving}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 mb-1.5 block">
                  Email de Contacto <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <Input
                    type="email"
                    value={emailContacto}
                    onChange={(e) => setEmailContacto(e.target.value)}
                    placeholder="rrhh@empresa.com"
                    required
                    disabled={saving}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pie de acciones dentro del form */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-2 bg-emerald-800 hover:bg-emerald-900 font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando cambios...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Guardar Modificaciones
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
