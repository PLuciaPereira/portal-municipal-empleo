import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id,
      label,
      error,
      containerClassName = '',
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId =
      typeof label === 'string'
        ? label.toLowerCase().replace(/\s+/g, '-')
        : undefined;
    const inputId = id || generatedId;
    const errorId = inputId ? `${inputId}-error` : undefined;

    return (
      <div className="w-full space-y-1.5">
        <div className={`flex items-start gap-3 ${containerClassName}`}>
          <div className="flex items-center h-5 mt-0.5">
            <input
              id={inputId}
              ref={ref}
              type="checkbox"
              aria-invalid={props['aria-invalid'] ?? (error ? true : undefined)}
              aria-describedby={
                props['aria-describedby'] || (error ? errorId : undefined)
              }
              className={`w-4 h-4 rounded border-border text-brand-800 focus:ring-brand-800/30 focus:ring-2 focus:ring-offset-0 cursor-pointer accent-brand-800 transition-colors ${
                error
                  ? 'border-destructive focus:ring-destructive/30'
                  : 'hover:border-brand-600/70'
              } disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
              {...props}
            />
          </div>
          {label && (
            <div className="text-xs text-foreground leading-relaxed select-none">
              {typeof label === 'string' ? (
                <label htmlFor={inputId} className="cursor-pointer">
                  {label}
                </label>
              ) : (
                label
              )}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="text-xs text-destructive font-medium flex items-center gap-1 pl-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
