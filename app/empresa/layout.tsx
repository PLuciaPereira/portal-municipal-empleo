import React from 'react';
import { EmpresaNavbar } from '@/components/layout/EmpresaNavbar';

export default function EmpresaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EmpresaNavbar />
      {children}
    </>
  );
}
