'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'destructive';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
  onClose: () => void;
}

type ConfirmDialogContentProps = Omit<ConfirmDialogProps, 'isOpen'>;

const ConfirmDialogContent: React.FC<ConfirmDialogContentProps> = ({
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  requireReason = false,
  reasonLabel = 'Motivo de la acción *',
  reasonPlaceholder = 'Detalle brevemente el motivo de esta acción...',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onClose]);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError('El motivo es obligatorio para continuar.');
      return;
    }
    setError(null);
    await onConfirm(requireReason ? reason.trim() : undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border text-foreground space-y-5 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors disabled:opacity-50"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5">
          {variant === 'destructive' ? (
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-destructive flex items-center justify-center shrink-0 border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 border border-brand-400/30">
              <AlertTriangle className="w-5 h-5 text-brand-800" />
            </div>
          )}

          <div className="space-y-1 pr-6">
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-foreground leading-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {requireReason && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-foreground">
              {reasonLabel}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={reasonPlaceholder}
              disabled={isLoading}
              className="w-full text-xs sm:text-sm rounded-lg border border-border bg-white p-2.5 text-foreground focus:outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-100 disabled:opacity-50 transition-colors resize-none"
            />
            {error && (
              <span className="text-xs text-destructive font-medium block">
                {error}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <ConfirmDialogContent {...props} />;
};
