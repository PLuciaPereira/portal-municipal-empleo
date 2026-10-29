import React, { ReactNode } from 'react';

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'full' | 'dashboard';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  size = 'default',
}) => {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-7xl',
    dashboard: 'max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10',
    full: 'max-w-full px-4 sm:px-6 lg:px-8',
  };

  const paddingClasses = size === 'dashboard' || size === 'full' 
    ? '' 
    : 'px-4 sm:px-6 lg:px-8';

  return (
    <div
      className={`mx-auto w-full py-6 sm:py-8 space-y-6 ${paddingClasses} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </div>
  );
};