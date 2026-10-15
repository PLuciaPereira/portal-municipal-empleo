import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  success?: boolean;
  inputSize?: 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightElement,
      success,
      inputSize = 'md',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined;
    const inputId = id || generatedId;
    const isLg = inputSize === 'lg';

    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;
    const describedBy = props['aria-describedby'] || (error ? errorId : hint ? hintId : undefined);

    let borderStyles = 'border-border hover:border-brand-600/70 focus:border-brand-800 focus:ring-brand-800/15';
    if (error) {
      borderStyles = 'border-destructive focus:border-destructive focus:ring-destructive/20';
    } else if (success) {
      borderStyles = 'border-success focus:border-success focus:ring-success/20';
    }

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div
              className={`absolute inset-y-0 left-0 ${
                isLg ? 'w-12' : 'w-10'
              } flex items-center justify-center pointer-events-none text-placeholder transition-colors group-focus-within:text-brand-800`}
            >
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={props['aria-invalid'] ?? (error ? true : undefined)}
            aria-describedby={describedBy}
            className={`w-full rounded-xl border bg-surface text-foreground transition-all duration-150 placeholder:text-placeholder focus:outline-none focus:ring-3 ${
              isLg
                ? `h-13 text-base ${leftIcon ? 'pl-12' : 'px-4'} ${rightElement ? 'pr-12' : 'pr-4'}`
                : `h-11 text-sm ${leftIcon ? 'pl-10' : 'px-3.5'} ${rightElement ? 'pr-10' : 'px-3.5'}`
            } ${borderStyles} disabled:bg-page disabled:text-muted-foreground/60 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-muted-foreground mt-1">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
