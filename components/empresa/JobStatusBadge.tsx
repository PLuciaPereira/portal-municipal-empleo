import React from 'react';
import { JobStatus } from '@/types/database';
import { Badge, BadgeProps } from '@/components/ui/Badge';

export interface JobStatusConfig {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

export const JOB_STATUS_CONFIG: Record<JobStatus, JobStatusConfig> = {
  borrador: {
    label: 'Borrador',
    variant: 'zinc',
  },
  pendiente_revision: {
    label: 'En Revisión Municipal',
    variant: 'amber',
  },
  publicada: {
    label: 'Publicada',
    variant: 'emerald',
  },
  pausada: {
    label: 'Pausada',
    variant: 'purple',
  },
  finalizada: {
    label: 'Finalizada',
    variant: 'zinc',
  },
  rechazada: {
    label: 'Observada / Rechazada',
    variant: 'rose',
  },
};

interface JobStatusBadgeProps {
  estado: JobStatus;
  isDeleted?: boolean;
}

export function JobStatusBadge({ estado, isDeleted }: JobStatusBadgeProps) {
  if (isDeleted) {
    return <Badge variant="rose">Dada de Baja</Badge>;
  }

  const config = JOB_STATUS_CONFIG[estado] || {
    label: estado,
    variant: 'zinc',
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
