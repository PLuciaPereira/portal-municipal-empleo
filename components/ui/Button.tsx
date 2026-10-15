import React from 'react';
import Link from 'next/link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'hero-primary'
    | 'hero-secondary'
    | 'ghost'
    | 'destructive'
    | 'danger';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-xl cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none shrink-0';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2 h-10',
    lg: 'px-6 py-3 text-base gap-2.5 h-13',
  };

  const normalizedVariant = variant === 'danger' ? 'destructive' : variant;

  const variantStyles = {
    primary:
      'bg-brand-800 text-white hover:bg-brand-900 active:bg-brand-950 focus:ring-brand-800 shadow-xs',
    secondary:
      'bg-brand-100 text-brand-800 hover:bg-brand-200/80 active:bg-brand-200 focus:ring-brand-800/40 border border-brand-400/40',
    outline:
      'border border-border bg-surface text-foreground hover:bg-brand-50 hover:text-brand-900 hover:border-brand-600/40 focus:ring-brand-800/30',
    'hero-primary':
      'bg-white text-brand-900 hover:bg-brand-50 active:bg-brand-100 focus:ring-white shadow-sm font-bold',
    'hero-secondary':
      'border-2 border-white/80 bg-white/10 text-white hover:bg-white hover:text-brand-900 active:bg-brand-100 focus:ring-white/50 backdrop-blur-xs font-semibold',
    ghost:
      'bg-transparent text-muted-foreground hover:bg-brand-50 hover:text-brand-900 focus:ring-brand-800/30',
    destructive:
      'bg-destructive text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-destructive shadow-xs',
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[normalizedVariant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {isLoading ? (
          <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : null}
        {children}
      </Link>
    );
  }

  return (
    <button
      className={combinedClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      ) : null}
      {children}
    </button>
  );
};
