import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  inputSize?: 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      inputSize = 'md',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const isLg = inputSize === 'lg';

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
            className={`w-full rounded-xl border bg-surface text-foreground transition-all duration-150 placeholder:text-placeholder focus:outline-none focus:ring-3 ${
              isLg
                ? `h-13 text-base ${leftIcon ? 'pl-12 pr-4' : 'px-4'}`
                : `h-10 text-sm ${leftIcon ? 'pl-10 pr-3.5' : 'px-3.5'}`
            } ${
              error
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-border hover:border-brand-600/70 focus:border-brand-800 focus:ring-brand-800/15'
            } disabled:bg-page disabled:text-muted-foreground/60 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive font-medium">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
