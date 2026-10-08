import React, { ReactNode } from 'react';
import { Button, ButtonProps } from '@/components/ui/Button';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bg-surface rounded-2xl border border-border p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-card ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center mx-auto border border-brand-400/30">
        {icon || <Inbox className="w-7 h-7 text-brand-800" />}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-foreground">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {action && (
        <div className="pt-2">
          <Button
            href={action.href}
            onClick={action.onClick}
            variant={action.variant || 'primary'}
            size="sm"
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
