'use client';

import React from 'react';
import { Bold, List, ListOrdered } from 'lucide-react';

interface RichTextToolbarProps {
  textareaId: string;
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

export function RichTextToolbar({
  textareaId,
  value,
  onChange,
  disabled = false,
}: RichTextToolbarProps) {
  const insertFormat = (prefix: string, suffix: string = '', isLinePrefix: boolean = false) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    let nextValue = '';
    let newCursorPos = start;

    if (isLinePrefix) {
      // Aplicar prefijo al inicio de cada línea seleccionada
      const lines = selected.split('\n');
      const formattedLines = lines.map((l, i) => {
        if (prefix === '1. ') {
          return `${i + 1}. ${l.replace(/^\d+\.\s*/, '')}`;
        }
        return `${prefix}${l.replace(/^[-*]\s*/, '')}`;
      }).join('\n');

      nextValue = value.substring(0, start) + formattedLines + value.substring(end);
      newCursorPos = start + formattedLines.length;
    } else {
      const insertion = `${prefix}${selected || 'texto'}${suffix}`;
      nextValue = value.substring(0, start) + insertion + value.substring(end);
      newCursorPos = selected ? start + insertion.length : start + prefix.length;
    }

    onChange(nextValue);

    // Restaurar foco y cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-100/80 rounded-t-xl border-t border-x border-zinc-200 text-xs">
      <button
        type="button"
        disabled={disabled}
        onClick={() => insertFormat('**', '**')}
        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/80 transition-colors cursor-pointer flex items-center gap-1 font-bold"
        title="Formato en negrita (**texto**)"
      >
        <Bold className="w-3.5 h-3.5" />
        <span className="text-[11px] hidden sm:inline">Negrita</span>
      </button>

      <div className="w-px h-4 bg-zinc-300 mx-0.5" />

      <button
        type="button"
        disabled={disabled}
        onClick={() => insertFormat('- ', '', true)}
        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/80 transition-colors cursor-pointer flex items-center gap-1"
        title="Lista con viñetas (- elemento)"
      >
        <List className="w-3.5 h-3.5" />
        <span className="text-[11px] hidden sm:inline">Viñetas</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => insertFormat('1. ', '', true)}
        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/80 transition-colors cursor-pointer flex items-center gap-1"
        title="Lista numerada (1. elemento)"
      >
        <ListOrdered className="w-3.5 h-3.5" />
        <span className="text-[11px] hidden sm:inline">Numeración</span>
      </button>

      <span className="text-[10.5px] text-zinc-400 ml-auto pr-2 hidden md:inline">
        Podés usar formato básico
      </span>
    </div>
  );
}
