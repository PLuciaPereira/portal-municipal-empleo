'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = '',
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generar páginas a mostrar con elipsis inteligente
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 select-none ${className}`}
      aria-label="Paginación de resultados"
    >
      {/* Resumen de resultados */}
      <div className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
        Mostrando <span className="font-semibold text-foreground">{startItem}</span> a{' '}
        <span className="font-semibold text-foreground">{endItem}</span> de{' '}
        <span className="font-semibold text-foreground">{totalItems}</span> resultados
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        {/* Selector de cantidad por página (opcional) */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-border text-xs text-muted-foreground">
            <span className="hidden md:inline">Por pág:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-8 px-2 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-brand-800 cursor-pointer"
              aria-label="Cantidad de elementos por página"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Primera página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Ir a la primera página"
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Números de página */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-xs text-muted-foreground select-none"
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(page);
            const isCurrent = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`h-8 min-w-[32px] px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-brand-800 text-white shadow-2xs font-bold'
                    : 'text-foreground/80 hover:bg-muted border border-border/60 hover:text-foreground'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Página siguiente */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          aria-label="Página siguiente"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Última página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          aria-label="Ir a la última página"
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
