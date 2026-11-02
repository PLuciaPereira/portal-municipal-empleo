'use client';

import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { rechazarCandidatoEmpresa, contratarCandidatoEmpresa } from '@/lib/empresa';
import { VistaCandidatoEmpresa } from '@/types/database';

interface CandidateActionModalProps {
  candidato: VistaCandidatoEmpresa;
  actionType: 'contratar' | 'rechazar';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CandidateActionModal({
  candidato,
  actionType,
  isOpen,
  onClose,
  onSuccess,
}: CandidateActionModalProps) {
  const [loading, setLoading] = useState(false);

  const nombreCompleto = `${candidato.nombre} ${candidato.apellido || ''}`.trim();

  const handleConfirm = async (motivo?: string) => {
    setLoading(true);

    try {
      if (actionType === 'rechazar') {
        if (!motivo || !motivo.trim()) return;
        const res = await rechazarCandidatoEmpresa(candidato.postulacion_id, motivo.trim());
        if (!res.success) {
          alert(res.error || 'No se pudo registrar el rechazo.');
          return;
        }
      } else {
        const res = await contratarCandidatoEmpresa(candidato.postulacion_id);
        if (!res.success) {
          alert(res.error || 'No se pudo registrar la contratación.');
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar la solicitud.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const isContratar = actionType === 'contratar';

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={loading}
      variant={isContratar ? 'primary' : 'destructive'}
      title={isContratar ? 'Registrar Contratación' : 'Rechazar Candidato Presentado'}
      description={
        isContratar
          ? `¿Confirmás la contratación de ${nombreCompleto}? Al confirmarlo, la vacante se considerará cubierta y los datos de contacto del postulante finalizarán su vigencia confidencial.`
          : `¿Confirmás el rechazo del candidato ${nombreCompleto}? Esta acción informará a la Oficina de Empleo para reasignar candidatos y finalizará el acceso a sus datos de contacto.`
      }
      confirmText={isContratar ? 'Confirmar Contratación' : 'Confirmar Rechazo'}
      cancelText="Volver"
      requireReason={!isContratar}
      reasonLabel="Motivo del rechazo *"
      reasonPlaceholder="Ej: El perfil no cumple con los requisitos técnicos requeridos, disponibilidad horaria incompatible..."
    />
  );
}
