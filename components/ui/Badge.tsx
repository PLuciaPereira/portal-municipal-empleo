import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'brand'
    | 'secondary'
    | 'emerald'
    | 'blue'
    | 'amber'
    | 'zinc'
    | 'rose'
    | 'purple'
    | 'destructive';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'zinc',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantStyles = {
    brand: 'bg-brand-100 text-brand-900 border border-brand-300',
    secondary: 'bg-brand-100 text-brand-900 border border-brand-300',
    emerald: 'bg-brand-100 text-brand-900 border border-brand-300',
    blue: 'bg-sky-50 text-sky-900 border border-sky-200',
    amber: 'bg-amber-50 text-amber-900 border border-amber-200',
    zinc: 'bg-zinc-100 text-zinc-800 border border-zinc-200',
    rose: 'bg-rose-50 text-rose-900 border border-rose-200',
    purple: 'bg-purple-50 text-purple-900 border border-purple-200',
    destructive: 'bg-rose-50 text-destructive border border-rose-200',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
