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
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantStyles = {
    brand: 'bg-brand-100 text-brand-800 border border-brand-400/40',
    secondary: 'bg-brand-100 text-brand-800 border border-brand-400/40',
    emerald: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    blue: 'bg-sky-50 text-sky-800 border border-sky-200/80',
    amber: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    zinc: 'bg-zinc-100 text-zinc-700 border border-zinc-200/80',
    rose: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    purple: 'bg-purple-50 text-purple-800 border border-purple-200/80',
    destructive: 'bg-rose-50 text-destructive border border-rose-200/80',
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
