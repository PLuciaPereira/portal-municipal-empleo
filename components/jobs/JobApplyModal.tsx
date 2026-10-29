'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import React, { useState, useEffect, useRef } from 'react';
import { Curriculum, Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  XMarkIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { submitJobApplication } from '@/lib/jobs';
import {
  MAX_ACTIVE_CVS,
  getActiveCurriculums,
  uploadCurriculum,
  validateCurriculumFile,
} from '@/lib/postulante';
import { FileText, Upload, Star, Plus } from 'lucide-react';

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
  useBodyScrollLock(Boolean(isOpen));
  const { user, hasAppliedTo, recordApplication, refreshUser } = useAuth();

  const [formData, setFormData] = useState<{
    nombre?: string;
    apellido?: string;
    dni?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    localidad?: string;
    mensaje: string;
    aceptaTerminos: boolean;
  }>({
    mensaje: '',
    aceptaTerminos: true,
  });

  // Estado de CVs del postulante
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [isLoadingCvs, setIsLoadingCvs] = useState<boolean>(true);
  const [selectedCvId, setSelectedCvId] = useState<string>('');

  // Subida en línea de CV dentro del modal (Decisión 1)
  const [showInlineUpload, setShowInlineUpload] = useState<boolean>(false);
  const [newCvName, setNewCvName] = useState<string>('');
  const [newCvFile, setNewCvFile] = useState<File | null>(null);
  const [isUploadingCv, setIsUploadingCv] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  // Cargar los CVs activos del postulante al abrir el modal
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    let isMounted = true;

    const fetchCvs = async () => {
      setIsLoadingCvs(true);
      const cvs = await getActiveCurriculums(user.id);
      if (!isMounted) return;
      setCurriculums(cvs);
      const principal = cvs.find((c) => c.es_principal) || cvs[0];
      setSelectedCvId(principal ? principal.id : '');
      setShowInlineUpload(cvs.length === 0);
      if (cvs.length === 0) {
        setNewCvName('Currículum Principal');
      }
      setIsLoadingCvs(false);
    };

    fetchCvs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const currentNombre = formData.nombre ?? user?.nombre ?? '';
  const currentApellido = formData.apellido ?? user?.apellido ?? '';
  const currentDni = formData.dni ?? user?.dni ?? '';
  const currentTelefono = formData.telefono ?? user?.telefono ?? '';
  const currentEmail = formData.email ?? user?.email ?? '';
  const currentDireccion = formData.direccion ?? user?.direccion ?? '';
  const currentLocalidad =
    formData.localidad ?? user?.localidad ?? (user?.es_residente_funes ? 'Funes' : '');

  const alreadyApplied = hasAppliedTo(job.id);
  const needsIdentityCompletion =
    !user?.nombre?.trim() || !user?.apellido?.trim() || !user?.dni?.trim();

  const handleInlineFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setNewCvFile(null);
      return;
    }

    const validation = validateCurriculumFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Archivo de CV inválido.');
      setNewCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMessage(null);
    setNewCvFile(file);
    if (!newCvName.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setNewCvName(baseName.slice(0, 60));
    }
  };

  const handleInlineUploadCv = async () => {
    setErrorMessage(null);
    if (!newCvFile) {
      setErrorMessage('Seleccioná un archivo PDF, Word o imagen para tu currículum.');
      return;
    }
    if (!newCvName.trim()) {
      setErrorMessage('Ingresá un nombre descriptivo para tu currículum.');
      return;
    }

    try {
      setIsUploadingCv(true);
      const res = await uploadCurriculum({
        file: newCvFile,
        nombreCv: newCvName.trim(),
        esPrincipal: curriculums.length === 0,
      });

      if (res.success && res.cv) {
        const updatedCvs = await getActiveCurriculums(user?.id);
        setCurriculums(updatedCvs);
        setSelectedCvId(res.cv.id);
        setShowInlineUpload(false);
        setNewCvFile(null);
        setNewCvName('');
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsUploadingCv(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (alreadyApplied) {
      setErrorMessage('Ya te has postulado a esta oferta previamente.');
      return;
    }

    const effectiveNombre = currentNombre.trim();
    const effectiveApellido = currentApellido.trim();
    const effectiveDni = currentDni.trim();
    const effectiveTelefono = currentTelefono.trim();
    const effectiveEmail = currentEmail.trim();
    const effectiveLocalidad = currentLocalidad.trim();

    if (!effectiveNombre || !effectiveApellido) {
      setErrorMessage('Por favor completá tu nombre y apellido.');
      return;
    }
    if (!effectiveDni) {
      setErrorMessage('Por favor ingresá tu número de DNI.');
      return;
    }
    if (!effectiveTelefono) {
      setErrorMessage('Por favor ingresá un número de teléfono o WhatsApp de contacto.');
      return;
    }
    if (!effectiveLocalidad) {
      setErrorMessage('Por favor ingresá tu localidad de residencia.');
      return;
    }
    if (!effectiveEmail || !effectiveEmail.includes('@')) {
      setErrorMessage('Por favor ingresá un correo electrónico válido.');
      return;
    }

    let finalCvId = selectedCvId;

    // Si el usuario tiene el formulario de subida rápida con un archivo cargado y aún no hizo clic en "Subir CV", subirlo en el acto
    if (!finalCvId && newCvFile) {
      setIsUploadingCv(true);
      const uploadRes = await uploadCurriculum({
        file: newCvFile,
        nombreCv: newCvName.trim() || 'Currículum Principal',
        esPrincipal: curriculums.length === 0,
      });
      setIsUploadingCv(false);

      if (!uploadRes.success || !uploadRes.cv) {
        setErrorMessage(
          uploadRes.message || 'No se pudo cargar tu currículum. Intentá nuevamente.'
        );
        return;
      }

      finalCvId = uploadRes.cv.id;
      const updatedCvs = await getActiveCurriculums(user?.id);
      setCurriculums(updatedCvs);
      setSelectedCvId(finalCvId);
      setShowInlineUpload(false);
      setNewCvFile(null);
    }

    if (!finalCvId) {
      setErrorMessage(
        'Debés seleccionar o subir un Currículum Vitae para poder postularte a esta búsqueda.'
      );
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
        postulanteId: user?.id,
        cvId: finalCvId,
        nombre: effectiveNombre,
        apellido: effectiveApellido,
        dni: effectiveDni,
        telefono: effectiveTelefono,
        email: effectiveEmail,
        esResidenteFunes: effectiveLocalidad.toLowerCase() === 'funes',
        direccion: currentDireccion,
        localidad: effectiveLocalidad,
        mensaje: formData.mensaje,
      });

      if (res.success && res.applicationId) {
        setSubmittedAppId(res.applicationId);
        recordApplication(job.id, res.applicationId);
        await refreshUser();
        onApplicationSuccess(res.applicationId);
      } else {
        if (res.alreadyApplied) {
          recordApplication(job.id, res.applicationId || job.id);
          await refreshUser();
        }
        setErrorMessage(res.message || 'Ocurrió un error al procesar la postulación.');
      }
    } catch {
      setErrorMessage('Hubo un problema de conexión. Intentá nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
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
                Tu postulación para el puesto de{' '}
                <strong className="text-zinc-800">{job.titulo}</strong> fue vinculada a tu perfil y recibida por la Oficina de Empleo de Funes.
              </p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-left text-xs text-zinc-700 space-y-2">
              <p className="font-semibold text-zinc-900">Próximos pasos de intermediación:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-600">
                <li>El equipo municipal evaluará tu información laboral y el CV adjunto.</li>
                <li>Si tu perfil se ajusta a los requisitos solicitados por la empresa, te convocaremos para avanzar en la entrevista preliminar.</li>
                <li>Podés consultar el estado en tiempo real desde la sección &ldquo;Mi Perfil&rdquo;.</li>
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
              variant="outline"
              size="md"
              className="w-full justify-center"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          /* Formulario de Postulación de Usuario Autenticado */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-4">
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
                  {currentNombre} {currentApellido} (DNI {currentDni || 'Pendiente'})
                </span>
                <span className="text-zinc-500 truncate block">
                  {currentEmail} &bull; {currentTelefono || 'Sin teléfono'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              {needsIdentityCompletion && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Nombre *"
                    placeholder="Tu nombre"
                    value={currentNombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                  <Input
                    label="Apellido *"
                    placeholder="Tu apellido"
                    value={currentApellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    required
                  />
                  <Input
                    label="DNI (sin puntos) *"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 35123456"
                    maxLength={8}
                    value={currentDni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teléfono / WhatsApp *"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ej: 3415550123"
                  value={currentTelefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, '') })}
                  required
                />
                <Input
                  label="Localidad de residencia *"
                  placeholder="Ej: Funes, Rosario, Roldán"
                  value={currentLocalidad}
                  onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                  required
                />
              </div>

              {/* Selección de Currículum Vitae o Subida en línea (Decisión 1) */}
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    Currículum Vitae para esta postulación *
                  </label>
                  {curriculums.length > 0 &&
                    curriculums.length < MAX_ACTIVE_CVS &&
                    !showInlineUpload && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowInlineUpload(true);
                          setNewCvName('');
                          setNewCvFile(null);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Subir otro CV
                      </button>
                    )}
                </div>

                {isLoadingCvs ? (
                  <div className="h-10 rounded-lg bg-zinc-200/70 animate-pulse" />
                ) : (
                  <>
                    {curriculums.length > 0 && !showInlineUpload && (
                      <div className="space-y-2">
                        {curriculums.map((cv) => {
                          const isSelected = selectedCvId === cv.id;
                          return (
                            <label
                              key={cv.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold'
                                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100/70'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="radio"
                                  name="selectedCv"
                                  value={cv.id}
                                  checked={isSelected}
                                  onChange={() => setSelectedCvId(cv.id)}
                                  className="text-emerald-700 focus:ring-emerald-600 accent-emerald-700"
                                />
                                <span className="truncate">{cv.nombre_cv}</span>
                              </div>
                              {cv.es_principal && (
                                <Badge variant="emerald" size="sm" className="gap-1 shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  Principal
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {(showInlineUpload || curriculums.length === 0) && (
                      <div className="p-3 bg-white border border-zinc-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-emerald-700" />
                            {curriculums.length === 0
                              ? 'Subí tu CV para completar la postulación'
                              : 'Subir un nuevo CV desde aquí'}
                          </span>
                          {curriculums.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowInlineUpload(false)}
                              className="text-[11px] text-zinc-500 hover:text-zinc-800 underline"
                            >
                              Usar un CV ya cargado
                            </button>
                          )}
                        </div>

                        <Input
                          label="Nombre del CV *"
                          placeholder="Ej: CV Comercial / Ventas"
                          value={newCvName}
                          onChange={(e) => setNewCvName(e.target.value)}
                        />

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-zinc-700">
                            Archivo (PDF, Word o Imagen máx. 10 MB) *
                          </label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                            onChange={handleInlineFileChange}
                            className="block w-full text-xs text-zinc-700 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-900 hover:file:bg-emerald-200 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50 p-1"
                          />
                        </div>

                        {curriculums.length > 0 && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              isLoading={isUploadingCv}
                              onClick={handleInlineUploadCv}
                            >
                              Guardar y seleccionar este CV
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Mensaje o experiencia */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Mensaje opcional para la Oficina de Empleo sobre este puesto:
                </label>
                <textarea
                  rows={2}
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
                Intermediación pública y gratuita. Se guardará una copia inmutable del CV seleccionado.
              </span>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
                disabled={isLoading || isUploadingCv}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading || isUploadingCv}
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
