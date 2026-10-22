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
    label: 'Recibido por Oficina de Empleo',
    description: 'Tu postulación fue registrada y está aguardando revisión técnica municipal.',
    variant: 'blue',
  },
  en_revision: {
    label: 'En evaluación técnica',
    description: 'El equipo de la Oficina de Empleo está analizando tu perfil laboral y CV.',
    variant: 'amber',
  },
  preseleccionado: {
    label: 'Preseleccionado',
    description: 'Tu perfil cumple con los requisitos preliminares de la búsqueda.',
    variant: 'emerald',
  },
  entrevista: {
    label: 'Instancia de entrevista',
    description: 'Fuiste convocado a una entrevista de orientación o preselección.',
    variant: 'purple',
  },
  presentado_a_empresa: {
    label: 'Derivado a la empresa',
    description: 'La Oficina de Empleo presentó formalmente tu perfil ante la empresa solicitante.',
    variant: 'brand',
  },
  seleccionado: {
    label: 'Seleccionado por empresa',
    description: 'La empresa seleccionó tu perfil para avanzar en el proceso final.',
    variant: 'emerald',
  },
  contratado: {
    label: 'Contratado',
    description: 'Fuiste incorporado exitosamente al puesto laboral.',
    variant: 'emerald',
  },
  no_seleccionado: {
    label: 'Proceso finalizado',
    description: 'En esta oportunidad se priorizaron otros perfiles para la vacante.',
    variant: 'zinc',
  },
  rechazado_por_empresa: {
    label: 'No seleccionado por empresa',
    description: 'La empresa finalizó la revisión de candidatos derivados para esta búsqueda.',
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
      label: 'No derivado',
      description: 'La Oficina de Empleo no derivó esta postulación a la empresa.',
      variant: 'amber',
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
