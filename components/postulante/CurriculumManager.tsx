'use client';

import React, { useState, useRef } from 'react';
import { Curriculum } from '@/types/database';
import {
  MAX_ACTIVE_CVS,
  uploadCurriculum,
  updateCurriculumFile,
  setPrincipalCurriculum,
  archiveCurriculum,
  getCurriculumSignedUrl,
  isCurriculumStale,
  validateCurriculumFile,
} from '@/lib/postulante';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FileText,
  Upload,
  Star,
  ExternalLink,
  Archive,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';

export interface CurriculumManagerProps {
  curriculums: Curriculum[];
  isLoading?: boolean;
  onChanged: () => void | Promise<void>;
}

export const CurriculumManager: React.FC<CurriculumManagerProps> = ({
  curriculums,
  isLoading = false,
  onChanged,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [nombreCv, setNombreCv] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Estado para edición / reemplazo de CV
  const [editingCv, setEditingCv] = useState<Curriculum | null>(null);
  const [editNombreCv, setEditNombreCv] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);

  // Estado para confirmación de archivado lógico
  const [cvToArchive, setCvToArchive] = useState<Curriculum | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Estado de carga por ítem (previsualización o cambio de principal)
  const [busyCvId, setBusyCvId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeCount = curriculums.length;
  const canAddMore = activeCount < MAX_ACTIVE_CVS;
  const freeSpaces = Math.max(0, MAX_ACTIVE_CVS - activeCount);
  const hasStalePrincipal = curriculums.some(
    (cv) => cv.es_principal && isCurriculumStale(cv)
  );

  const handleOpenUpload = () => {
    setFeedback(null);
    setEditingCv(null);
    setNombreCv(activeCount === 0 ? 'Currículum Principal' : '');
    setSelectedFile(null);
    setEsPrincipal(activeCount === 0);
    setIsUploadOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = validateCurriculumFile(file);
    if (!validation.valid) {
      setFeedback({ type: 'error', text: validation.error || 'Archivo inválido.' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedFile) {
      setFeedback({ type: 'error', text: 'Por favor seleccioná un archivo de CV.' });
      return;
    }

    if (!nombreCv.trim()) {
      setFeedback({
        type: 'error',
        text: 'Por favor asignale un nombre descriptivo a tu CV.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await uploadCurriculum({
        nombreCv: nombreCv.trim(),
        file: selectedFile,
        esPrincipal: activeCount === 0 ? true : esPrincipal,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setIsUploadOpen(false);
        setSelectedFile(null);
        setNombreCv('');
        await onChanged();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cv: Curriculum) => {
    setFeedback(null);
    setIsUploadOpen(false);
    setEditingCv(cv);
    setEditNombreCv(cv.nombre_cv);
    setEditFile(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCv) return;
    setFeedback(null);

    if (!editNombreCv.trim()) {
      setFeedback({
        type: 'error',
        text: 'El nombre del currículum no puede estar vacío.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updateCurriculumFile({
        cvId: editingCv.id,
        nombreCv: editNombreCv.trim(),
        file: editFile,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setEditingCv(null);
        setEditFile(null);
        await onChanged();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPrincipal = async (cv: Curriculum) => {
    if (cv.es_principal) return;
    setFeedback(null);
    try {
      setBusyCvId(cv.id);
      const res = await setPrincipalCurriculum(cv.id);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `"${cv.nombre_cv}" es ahora tu CV principal predeterminado.`,
        });
        await onChanged();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setBusyCvId(null);
    }
  };

  const handlePreviewCv = async (cv: Curriculum) => {
    setFeedback(null);
    try {
      setBusyCvId(cv.id);
      const res = await getCurriculumSignedUrl(cv.archivo_url);
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'No se pudo abrir el archivo del currículum.',
        });
      }
    } finally {
      setBusyCvId(null);
    }
  };

  const handleConfirmArchive = async () => {
    if (!cvToArchive) return;
    setFeedback(null);
    try {
      setIsArchiving(true);
      const res = await archiveCurriculum(cvToArchive.id);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setCvToArchive(null);
        await onChanged();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <section className="bg-white border border-[#E0E8E1] rounded-[24px] p-7 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[280px]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-zinc-900 font-display">
              Mis Currículums Vitae
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-[13px] font-bold bg-[#E4F1E8] text-[#0A3D2A]">
              {activeCount} / {MAX_ACTIVE_CVS} activos
            </span>
          </div>
          <p className="mt-1.5 text-sm sm:text-[15px] text-[#4B6256]">
            Podés almacenar hasta {MAX_ACTIVE_CVS} versiones de tu CV orientadas a distintos rubros o puestos y elegir cuál adjuntar al postularte.
          </p>
        </div>

        {canAddMore && !isUploadOpen && (
          <button
            type="button"
            onClick={handleOpenUpload}
            className="min-h-[48px] px-5 sm:px-6 rounded-full bg-[#06402B] text-white font-bold text-sm sm:text-[15px] inline-flex items-center gap-2 hover:bg-[#08301F] transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.4]" />
            Subir nuevo CV
          </button>
        )}
      </div>

      {/* Alerta de desactualización (> 180 días) */}
      {hasStalePrincipal && (
        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-amber-900">
              Tu CV principal lleva más de 6 meses sin actualizarse
            </span>
            <span>
              Te recomendamos subir una versión actualizada para mejorar tus posibilidades en las preselecciones de la Oficina de Empleo.
            </span>
          </div>
        </div>
      )}

      {/* Feedback contextual */}
      {feedback && (
        <div
          className={`mt-4 p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 text-current cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Formulario de subida rápida */}
      {isUploadOpen && (
        <form
          onSubmit={handleUploadSubmit}
          className="mt-5 p-5 bg-[#F1F8F3] border border-[#C7D6CB] rounded-2xl space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2 font-display">
              <Upload className="w-4 h-4 text-[#06402B]" />
              Cargar nuevo Currículum Vitae
            </h3>
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="text-zinc-500 hover:text-zinc-800 p-1 cursor-pointer"
              aria-label="Cancelar subida"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre identificatorio del CV *"
              placeholder="Ej: CV Atención al Cliente / Ventas"
              value={nombreCv}
              onChange={(e) => setNombreCv(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-800">
                Archivo (PDF, Word o Imagen máx. 10 MB) *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="block w-full text-xs text-zinc-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#DDEFE3] file:text-[#064230] hover:file:bg-[#BFE0CB] cursor-pointer border border-[#C7D6CB] rounded-xl bg-white p-1.5"
                required
              />
              {selectedFile && (
                <p className="text-[11px] text-emerald-800 font-medium truncate">
                  Seleccionado: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          {activeCount > 0 && (
            <Checkbox
              label="Establecer este archivo como mi CV Principal predeterminado al postularme"
              checked={esPrincipal}
              onChange={(e) => setEsPrincipal(e.target.checked)}
            />
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#C7D6CB]/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Guardar Currículum
            </Button>
          </div>
        </form>
      )}

      {/* Formulario de actualización / reemplazo de archivo */}
      {editingCv && (
        <form
          onSubmit={handleEditSubmit}
          className="mt-5 p-5 bg-[#EBF3FF] border border-[#BFDBFE] rounded-2xl space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2 font-display">
              <RefreshCw className="w-4 h-4 text-blue-700" />
              Actualizar CV: {editingCv.nombre_cv}
            </h3>
            <button
              type="button"
              onClick={() => setEditingCv(null)}
              className="text-zinc-500 hover:text-zinc-800 p-1 cursor-pointer"
              aria-label="Cancelar actualización"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre del CV *"
              value={editNombreCv}
              onChange={(e) => setEditNombreCv(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-800">
                Reemplazar archivo (opcional, máx. 10 MB)
              </label>
              <input
                ref={editFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) {
                    const v = validateCurriculumFile(f);
                    if (!v.valid) {
                      setFeedback({ type: 'error', text: v.error || 'Archivo inválido.' });
                      if (editFileInputRef.current) editFileInputRef.current.value = '';
                      return;
                    }
                  }
                  setEditFile(f);
                }}
                className="block w-full text-xs text-zinc-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-900 hover:file:bg-blue-200 cursor-pointer border border-[#BFDBFE] rounded-xl bg-white p-1.5"
              />
              <p className="text-[11px] text-zinc-500">
                Las postulaciones que ya enviaste conservarán su copia histórica inmutable.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#BFDBFE]/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingCv(null)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      )}

      {/* Lista de CVs */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          <div className="h-20 rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="h-20 rounded-2xl bg-zinc-100 animate-pulse" />
        </div>
      ) : curriculums.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={<FileText className="w-8 h-8 text-brand-800" />}
            title="Aún no cargaste ningún Currículum Vitae"
            description="Subí tu CV en formato PDF, Word o imagen legible para poder adjuntarlo cuando te postules a las búsquedas laborales de Funes."
            action={
              !isUploadOpen
                ? {
                    label: 'Subir mi primer CV',
                    onClick: handleOpenUpload,
                    variant: 'primary',
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {curriculums.map((cv) => {
            const isBusy = busyCvId === cv.id;
            const formattedDate = new Date(
              cv.updated_at || cv.created_at
            ).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={cv.id}
                className="p-4 sm:p-5 rounded-[18px] bg-[#F1F8F3] border border-[#E0E8E1] flex flex-wrap items-center justify-between gap-3.5"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-[14px] bg-[#DDEFE3] text-[#0E4D36] flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base sm:text-lg font-bold text-zinc-900 truncate font-display">
                        {cv.nombre_cv}
                      </strong>
                      {cv.es_principal && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FCEBC4] text-[#5C3D00] text-xs font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-[#4B6256] mt-0.5">
                      Última actualización: {formattedDate}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!cv.es_principal && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetPrincipal(cv)}
                      className="min-h-[44px] px-3.5 rounded-full border border-[#C7D6CB] bg-white text-[#10231B] font-semibold text-sm inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Hacer principal
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handlePreviewCv(cv)}
                    className="min-h-[44px] px-4 rounded-full border border-[#C7D6CB] bg-white text-[#10231B] font-semibold text-sm inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver archivo
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleStartEdit(cv)}
                    className="min-h-[44px] px-4 rounded-full border border-[#C7D6CB] bg-white text-[#10231B] font-semibold text-sm inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualizar
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setCvToArchive(cv)}
                    className="min-h-[44px] px-3.5 rounded-full text-[#A3193B] font-bold text-sm inline-flex items-center gap-1.5 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archivar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de 5 segmentos */}
      <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
        <div
          className="flex gap-1.5 flex-1 min-w-[180px] max-w-[320px]"
          aria-hidden="true"
        >
          {Array.from({ length: MAX_ACTIVE_CVS }).map((_, i) => (
            <span
              key={i}
              className={`flex-1 h-2 rounded-full transition-colors ${
                i < activeCount ? 'bg-[#0E4D36]' : 'bg-[#DCE6DE]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs sm:text-[13px] text-[#5A7064] font-medium">
          {freeSpaces > 0
            ? `Te ${freeSpaces === 1 ? 'queda' : 'quedan'} ${freeSpaces} ${
                freeSpaces === 1 ? 'espacio libre' : 'espacios libres'
              } para otras versiones de tu CV`
            : 'Alcanzaste el cupo máximo de 5 currículums activos'}
        </span>
      </div>

      <ConfirmDialog
        isOpen={Boolean(cvToArchive)}
        title="¿Archivar este Currículum Vitae?"
        description={
          cvToArchive
            ? `El archivo "${cvToArchive.nombre_cv}" dejará de estar en tu lista de CVs activos. Si ya lo utilizaste en postulaciones anteriores, esas postulaciones conservarán su copia histórica sin verse afectadas.`
            : undefined
        }
        confirmText="Sí, archivar CV"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={isArchiving}
        onConfirm={handleConfirmArchive}
        onClose={() => setCvToArchive(null)}
      />
    </section>
  );
};
