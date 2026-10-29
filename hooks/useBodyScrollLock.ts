'use client';

import { useEffect } from 'react';

// Contador global de modales activos para soportar modales anidados
let activeLocksCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    if (activeLocksCount === 0) {
      // Guardar estilos originales
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;

      // Calcular ancho del scrollbar para evitar layout shift
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';

      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }

    activeLocksCount++;

    return () => {
      activeLocksCount--;

      if (activeLocksCount <= 0) {
        activeLocksCount = 0;
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isLocked]);
}
