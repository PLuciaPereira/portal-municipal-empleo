'use client';

import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { darDeBajaOfertaEmpresa } from '@/lib/empresa';
import { Oferta } from '@/types/database';

interface DeactivateJobModalProps {
  oferta: Oferta;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeactivateJobModal({
  oferta,
  isOpen,
  onClose,
  onSuccess,
}: DeactivateJobModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (motivo?: string) => {
    if (!motivo || !motivo.trim()) return;

    setLoading(true);
    try {
      const res = await darDeBajaOfertaEmpresa(oferta.id, motivo.trim());
      if (!res.success) {
        alert(res.error || 'No se pudo registrar la baja de la oferta.');
        return;
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al dar de baja la oferta.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={loading}
      variant="destructive"
      title="Dar de baja oferta laboral"
      description={`¿Estás seguro de que deseás dar de baja la búsqueda laboral "${oferta.titulo}"? Esta acción finalizará la convocatoria activa.`}
      confirmText="Dar de baja oferta"
      cancelText="Volver"
      requireReason={true}
      reasonLabel="Motivo de la baja lógica *"
      reasonPlaceholder="Ej: Vacante cubierta con candidato contratado, cancelación del proceso, cambio de perfil..."
    />
  );
}
