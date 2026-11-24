import React from 'react';
import { PostulanteNavbar } from '@/components/layout/PostulanteNavbar';

export default function PostulanteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PostulanteNavbar />
      {children}
    </>
  );
}
