'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string; // formato "HH:MM"
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Opciones estándar de franjas horarias de atención comercial/entrevistas (de 08:00 a 19:30 en intervalos de 30 min)
const PRESET_HOURS: string[] = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

export function TimePicker({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: TimePickerProps) {
  const isCustomTime = value && !PRESET_HOURS.includes(value);

  return (
    <div className={`relative flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-800 shadow-2xs hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-800 appearance-none pr-8 cursor-pointer disabled:opacity-50"
      >
        <option value="" disabled>Seleccionar horario...</option>
        {isCustomTime && (
          <option value={value}>{value} hs (Horario previo)</option>
        )}
        {PRESET_HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {hour} hs
          </option>
        ))}
      </select>
      <Clock className="w-4 h-4 text-zinc-400 absolute right-2.5 pointer-events-none" />
    </div>
  );
}
