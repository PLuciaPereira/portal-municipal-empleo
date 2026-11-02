'use client';

import React from 'react';

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Renderizador de formato enriquecido seguro en React puro (sin dependencias ni dangerouslySetInnerHTML).
 * Soporta negrita (**texto**), viñetas (- elemento / * elemento) y listas numeradas (1. elemento).
 */
export function FormattedText({ content, className = '' }: FormattedTextProps) {
  if (!content) return null;

  const lines = content.split('\n');

  // Función auxiliar para parsear negritas en una línea
  const renderLineWithBold = (line: string, keyPrefix: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={keyPrefix}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
              <strong key={`${keyPrefix}-${index}`} className="font-bold text-zinc-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        // 1. Línea vacía
        if (!trimmed) {
          return <div key={lineIndex} className="h-2" />;
        }

        // 2. Viñeta (- o *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.slice(2);
          return (
            <div key={lineIndex} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-800 shrink-0 mt-2" />
              <div className="flex-1">{renderLineWithBold(text, `bullet-${lineIndex}`)}</div>
            </div>
          );
        }

        // 3. Lista numerada (ej. "1. ")
        const matchNum = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (matchNum) {
          const num = matchNum[1];
          const text = matchNum[2];
          return (
            <div key={lineIndex} className="flex items-start gap-2 pl-2">
              <span className="font-bold text-brand-900 text-xs shrink-0 min-w-4 text-right pt-0.5">
                {num}.
              </span>
              <div className="flex-1">{renderLineWithBold(text, `num-${lineIndex}`)}</div>
            </div>
          );
        }

        // 4. Párrafo común
        return (
          <p key={lineIndex} className="leading-relaxed">
            {renderLineWithBold(line, `p-${lineIndex}`)}
          </p>
        );
      })}
    </div>
  );
}
