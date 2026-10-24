import React from 'react';
import { EstadoEmpresa } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

interface CompanyStatusBadgeProps {
  estado: EstadoEmpresa;
  className?: string;
}

export function CompanyStatusBadge({ estado, className = '' }: CompanyStatusBadgeProps) {
  switch (estado) {
    case 'aprobada':
      return (
        <Badge
          variant="emerald"
          className={`inline-flex items-center gap-1.5 font-medium ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Aprobada
        </Badge>
      );
    case 'pendiente':
      return (
        <Badge
          variant="amber"
          className={`inline-flex items-center gap-1.5 font-medium ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Pendiente
        </Badge>
      );
    case 'rechazada':
      return (
        <Badge
          variant="rose"
          className={`inline-flex items-center gap-1.5 font-medium ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          Rechazada
        </Badge>
      );
    default:
      return (
        <Badge variant="zinc" className={className}>
          {estado}
        </Badge>
      );
  }
}
