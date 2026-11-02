import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompanyJobForm } from '@/components/empresa/CompanyJobForm';
import { Oferta } from '@/types/database';

interface EditOfertaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarOfertaEmpresaPage({ params }: EditOfertaPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: oferta, error } = await supabase
    .from('ofertas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !oferta) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-page text-foreground flex flex-col font-sans">
      <CompanyJobForm ofertaToEdit={oferta as Oferta} />
    </div>
  );
}
