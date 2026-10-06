import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface MunicipalLogoProps {
  /**
   * 'badge': Ubica el escudo blanco sobre un contenedor verde institucional (bg-brand-800),
   *          ideal para fondos blancos o claros (según sección 4.1 del Design System).
   * 'plain': Renderiza el escudo blanco directamente, ideal para fondos oscuros o verde institucional.
   */
  variant?: 'badge' | 'plain';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textSubtitle?: string;
  href?: string;
  className?: string;
  priority?: boolean;
}

const sizeConfig = {
  sm: {
    container: 'w-8 h-8 rounded-lg p-1',
    image: 24,
    titleText: 'text-sm font-bold',
    subText: 'text-[10px]',
  },
  md: {
    container: 'w-10 h-10 rounded-xl p-1.5',
    image: 32,
    titleText: 'text-base font-bold',
    subText: 'text-xs',
  },
  lg: {
    container: 'w-12 h-12 rounded-xl p-2',
    image: 40,
    titleText: 'text-lg font-extrabold',
    subText: 'text-xs',
  },
  xl: {
    container: 'w-16 h-16 rounded-2xl p-2.5',
    image: 52,
    titleText: 'text-xl font-extrabold',
    subText: 'text-sm',
  },
};

export const MunicipalLogo: React.FC<MunicipalLogoProps> = ({
  variant = 'badge',
  size = 'md',
  showText = false,
  textSubtitle = 'Gobierno de Funes',
  href,
  className = '',
  priority = false,
}) => {
  const config = sizeConfig[size];

  const imageElement = (
    <Image
      src="/escudo-funes-blanco.png"
      alt="Escudo Oficial de la Municipalidad de Funes"
      width={config.image}
      height={config.image}
      className="w-full h-full object-contain shrink-0"
      priority={priority}
    />
  );

  const emblemNode =
    variant === 'badge' ? (
      <div
        className={`${config.container} bg-brand-800 flex items-center justify-center shrink-0 shadow-xs transition-colors`}
      >
        {imageElement}
      </div>
    ) : (
      <div
        className={`w-${size === 'sm' ? 8 : size === 'md' ? 10 : size === 'lg' ? 12 : 16} h-${
          size === 'sm' ? 8 : size === 'md' ? 10 : size === 'lg' ? 12 : 16
        } flex items-center justify-center shrink-0`}
        style={{
          width: config.image + (size === 'xl' ? 12 : 8),
          height: config.image + (size === 'xl' ? 12 : 8),
        }}
      >
        {imageElement}
      </div>
    );

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      {emblemNode}
      {showText && (
        <div className="flex flex-col text-left">
          <span className={`${config.titleText} leading-tight text-foreground`}>
            Portal de Empleo
          </span>
          <span className={`${config.subText} text-brand-800 font-medium tracking-wide`}>
            {textSubtitle}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
};
