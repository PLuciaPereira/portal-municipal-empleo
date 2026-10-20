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
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

    setFeedback(null);
    setSelectedFile(file);
    if (!nombreCv.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setNombreCv(baseName.slice(0, 60));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedFile) {
      setFeedback({
        type: 'error',
        text: 'Seleccioná un archivo PDF, Word o imagen antes de guardar.',
      });
      return;
    }

    if (!nombreCv.trim()) {
      setFeedback({
        type: 'error',
        text: 'Ingresá un nombre identificatorio para tu currículum.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await uploadCurriculum({
        file: selectedFile,
        nombreCv: nombreCv.trim(),
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
    <Card className="border-zinc-200 shadow-sm">
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900">
                Mis Currículums Vitae
              </h3>
              <Badge variant={activeCount >= MAX_ACTIVE_CVS ? 'amber' : 'emerald'} size="sm">
                {activeCount} / {MAX_ACTIVE_CVS} activos
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Podés almacenar hasta {MAX_ACTIVE_CVS} versiones de tu CV orientadas a distintos rubros o puestos y elegir cuál adjuntar al postularte.
            </p>
          </div>

          {canAddMore && !isUploadOpen && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenUpload}
              className="shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Subir nuevo CV
            </Button>
          )}
        </div>

        {/* Alerta de desactualización (> 180 días) */}
        {hasStalePrincipal && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
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

        {/* Mensajes de confirmación o error */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
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
              className="p-1 rounded hover:bg-black/5 text-current"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Formulario para subir nuevo CV */}
        {isUploadOpen && (
          <form
            onSubmit={handleUploadSubmit}
            className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-800" />
                Cargar nuevo Currículum Vitae
              </h4>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1"
                aria-label="Cancelar subida"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Nombre identificatorio del CV *"
                placeholder="Ej: CV Atención al Cliente / Ventas"
                value={nombreCv}
                onChange={(e) => setNombreCv(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Archivo (PDF, Word o Imagen máx. 10 MB) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-zinc-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-100 file:text-brand-900 hover:file:bg-brand-200 cursor-pointer border border-zinc-200 rounded-xl bg-white p-1.5"
                  required
                />
                {selectedFile && (
                  <p className="text-[11px] text-emerald-700 font-medium truncate">
                    Seleccionado: {selectedFile.name} (
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/80">
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

        {/* Formulario para reemplazar archivo o renombrar un CV existente */}
        {editingCv && (
          <form
            onSubmit={handleEditSubmit}
            className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-sky-800" />
                Actualizar CV: {editingCv.nombre_cv}
              </h4>
              <button
                type="button"
                onClick={() => setEditingCv(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1"
                aria-label="Cancelar actualización"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Nombre del CV *"
                value={editNombreCv}
                onChange={(e) => setEditNombreCv(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
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
                  className="block w-full text-xs text-zinc-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-900 hover:file:bg-sky-200 cursor-pointer border border-zinc-200 rounded-xl bg-white p-1.5"
                />
                <p className="text-[11px] text-zinc-500">
                  Las postulaciones que ya enviaste conservarán una copia inmutable de la versión anterior.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-200/80">
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

        {/* Listado de CVs activos */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            <div className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
            <div className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
          </div>
        ) : curriculums.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-7 h-7 text-brand-800" />}
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
        ) : (
          <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white">
            {curriculums.map((cv) => {
              const stale = isCurriculumStale(cv);
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
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    cv.es_principal ? 'bg-emerald-50/30' : 'hover:bg-zinc-50/70'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        cv.es_principal
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 truncate">
                          {cv.nombre_cv}
                        </span>
                        {cv.es_principal && (
                          <Badge variant="emerald" size="sm" className="gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Principal
                          </Badge>
                        )}
                        {stale && (
                          <Badge variant="amber" size="sm">
                            Desactualizado (+6 meses)
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500">
                        Última actualización: {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end shrink-0">
                    {!cv.es_principal && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleSetPrincipal(cv)}
                        title="Marcar como CV predeterminado"
                        className="text-xs"
                      >
                        <Star className="w-3.5 h-3.5 mr-1" />
                        Hacer principal
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handlePreviewCv(cv)}
                      className="text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Ver archivo
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleStartEdit(cv)}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Actualizar
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => setCvToArchive(cv)}
                      className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                      title="Archivar este CV"
                    >
                      <Archive className="w-3.5 h-3.5 mr-1" />
                      Archivar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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
    </Card>
  );
};
