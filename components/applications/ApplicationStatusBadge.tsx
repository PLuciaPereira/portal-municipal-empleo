import React from 'react';
import { ApplicationStatus } from '@/types/database';
import { Badge, BadgeProps } from '@/components/ui/Badge';

export interface ApplicationStatusConfig {
  label: string;
  description: string;
  variant: NonNullable<BadgeProps['variant']>;
}

export const APPLICATION_STATUS_CONFIG: Record<ApplicationStatus, ApplicationStatusConfig> = {
  postulado: {
    label: 'Postulado',
    description: 'Tu postulación fue registrada exitosamente y se encuentra a la espera de evaluación.',
    variant: 'blue',
  },
  en_revision: {
    label: 'En revisión',
    description: 'Tu perfil laboral y antecedentes se encuentran actualmente en evaluación.',
    variant: 'amber',
  },
  preseleccionado: {
    label: 'En revisión',
    description: 'Tu postulación superó las etapas iniciales y continúa en evaluación técnica.',
    variant: 'amber',
  },
  entrevista: {
    label: 'En revisión',
    description: 'Tu postulación se encuentra en instancia de entrevista y evaluación.',
    variant: 'amber',
  },
  presentado_a_empresa: {
    label: 'En revisión',
    description: 'Tu perfil fue considerado apto y continúa en proceso de evaluación avanzada.',
    variant: 'amber',
  },
  seleccionado: {
    label: 'Contratado',
    description: 'Has sido seleccionado e incorporado para cubrir el puesto laboral.',
    variant: 'emerald',
  },
  contratado: {
    label: 'Contratado',
    description: 'Has sido incorporado exitosamente al puesto laboral.',
    variant: 'emerald',
  },
  no_seleccionado: {
    label: 'Rechazado',
    description: 'El proceso de selección para esta búsqueda ha finalizado en esta oportunidad.',
    variant: 'rose',
  },
  rechazado_por_empresa: {
    label: 'Rechazado',
    description: 'El proceso de selección para esta búsqueda ha finalizado en esta oportunidad.',
    variant: 'rose',
  },
  retirado_por_postulante: {
    label: 'Retirado voluntariamente',
    description: 'Retiraste tu postulación de esta oferta laboral.',
    variant: 'zinc',
  },
};

export function getApplicationStatusConfig(status: ApplicationStatus | string): ApplicationStatusConfig {
  if (status === 'no_derivado') {
    return {
      label: 'Rechazado',
      description: 'El proceso de selección para esta búsqueda ha finalizado en esta oportunidad.',
      variant: 'rose',
    };
  }
  return (
    APPLICATION_STATUS_CONFIG[status as ApplicationStatus] || {
      label: status,
      description: '',
      variant: 'zinc',
    }
  );
}

export interface ApplicationStatusBadgeProps {
  status: ApplicationStatus | string;
  size?: BadgeProps['size'];
  className?: string;
}

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const config = getApplicationStatusConfig(status);

  return (
    <Badge variant={config.variant} size={size} className={className} title={config.description}>
      {config.label}
    </Badge>
  );
};
