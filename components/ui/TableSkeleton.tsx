import React from 'react';
import { Skeleton } from './Skeleton';

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  hasHeader?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  cols = 5,
  hasHeader = true,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="bg-zinc-50 border-b border-zinc-200/80 px-4 sm:px-6 py-3.5 flex items-center gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={`th-skel-${i}`}
              className={i === 0 ? 'flex-1 min-w-[140px]' : 'w-24 sm:w-32 hidden sm:block'}
            >
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
          ))}
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={`row-skel-${rIdx}`}
            className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4"
          >
            {/* Columna Principal (Título o Nombre) */}
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-2/5 sm:w-1/3 rounded-md" />
              <Skeleton className="h-3.5 w-3/5 sm:w-1/2 rounded-md bg-zinc-100" />
            </div>

            {/* Columnas Secundarias */}
            {Array.from({ length: Math.max(1, cols - 2) }).map((_, cIdx) => (
              <div
                key={`cell-skel-${rIdx}-${cIdx}`}
                className="w-24 sm:w-32 hidden md:block space-y-1.5"
              >
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3 w-2/3 rounded-md bg-zinc-100" />
              </div>
            ))}

            {/* Columna de Acciones */}
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-8 w-16 sm:w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
