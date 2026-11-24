import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  icon,
  title = 'No se pudieron recuperar los datos',
  description = 'Ocurrió un problema de comunicación al consultar el servidor. Por favor, verificá tu conexión e intentá nuevamente.',
  onRetry,
  retryLabel = 'Reintentar consulta',
  className = '',
}) => {
  return (
    <div
      className={`bg-surface rounded-2xl border border-red-200/80 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-card ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto border border-red-200">
        {icon || <AlertCircle className="w-7 h-7 text-red-700" />}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-foreground">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            onClick={() => void onRetry()}
            variant="outline"
            size="sm"
            className="border-red-200 text-red-800 hover:bg-red-50 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
