import React from 'react';
import Link from 'next/link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'danger';
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
    'inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const normalizedVariant = variant === 'danger' ? 'destructive' : variant;

  const variantStyles = {
    primary:
      'bg-brand-800 text-white hover:bg-brand-900 focus:ring-brand-800 shadow-sm active:bg-brand-900',
    secondary:
      'bg-brand-100 text-brand-800 hover:bg-emerald-100 focus:ring-brand-600 border border-brand-400/30',
    outline:
      'border border-border bg-white text-foreground hover:bg-zinc-50 hover:text-foreground focus:ring-brand-800',
    ghost:
      'bg-transparent text-muted-foreground hover:bg-zinc-100 hover:text-foreground focus:ring-brand-800',
    destructive:
      'bg-destructive text-white hover:bg-rose-700 focus:ring-destructive shadow-sm active:bg-rose-800',
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
