'use client';

import React, { useEffect, useState } from 'react';
import { getLocalidades, LOCALIDADES_CANONICAS_DEFAULT } from '@/lib/localidades';
import type { Localidad } from '@/types/database';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface LocalidadSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  labelVariant?: 'default' | 'compact';
  error?: string;
  helperText?: string;
  placeholder?: string;
  value: string;
  onChangeValue?: (val: string) => void;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  inputSize?: 'sm' | 'md' | 'lg';
}

export function LocalidadSelect({
  label,
  labelVariant = 'default',
  error,
  helperText,
  placeholder = 'Seleccioná una localidad...',
  value,
  onChange,
  onChangeValue,
  includeAllOption = false,
  allOptionLabel = 'Todas las localidades',
  inputSize = 'md',
  className = '',
  id,
  required,
  disabled,
  ...props
}: LocalidadSelectProps) {
  const [localidades, setLocalidades] = useState<Localidad[]>(LOCALIDADES_CANONICAS_DEFAULT);

  useEffect(() => {
    let isMounted = true;
    void getLocalidades().then((data) => {
      if (isMounted && data && data.length > 0) {
        setLocalidades(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) onChange(e);
    if (onChangeValue) onChangeValue(e.target.value);
  };

  const selectId = id || 'localidad-select';
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  const sizeClasses = {
    sm: 'h-9 text-xs px-3 pr-8',
    md: 'h-11 text-sm px-3.5 pr-10',
    lg: 'h-13 text-base px-4 pr-12',
  }[inputSize];

  let borderStyles = 'border-border hover:border-brand-600/70 focus:border-brand-800 focus:ring-brand-800/15';
  if (error) {
    borderStyles = 'border-destructive focus:border-destructive focus:ring-destructive/20';
  }

  const labelClass = labelVariant === 'compact'
    ? 'block text-xs font-bold text-zinc-700 tracking-wide'
    : 'block text-sm font-medium text-foreground';

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className={labelClass}>
          {label}
        </label>
      )}

      <div className="relative group">
        <select
          id={selectId}
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full rounded-xl border bg-surface text-foreground transition-all duration-150 appearance-none cursor-pointer focus:outline-hidden focus:ring-3 ${sizeClasses} ${borderStyles} disabled:bg-page disabled:text-muted-foreground/60 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {includeAllOption ? (
            <option value="todas">{allOptionLabel}</option>
          ) : (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {localidades.map((loc) => (
            <option key={loc.id} value={loc.nombre} className="text-foreground bg-surface">
              {loc.nombre}
            </option>
          ))}
        </select>

        {/* Indicador flecha nativa con color del sistema de diseño */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-placeholder transition-colors group-focus-within:text-brand-800">
          <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
        </div>
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-muted-foreground mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
