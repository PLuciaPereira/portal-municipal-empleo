import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getJobs, getRubros } from '@/lib/jobs';
import { JobCatalogView } from '@/components/jobs/JobCatalogView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ofertas Laborales en Funes | Portal de Empleo',
  description:
    'Explorá y postulate a las búsquedas laborales vigentes en Funes, Santa Fe. Servicio público de intermediación gratuito y confidencial.',
};

export default async function OfertasPage() {
  const [{ jobs }, rubros] = await Promise.all([
    getJobs(),
    getRubros(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-16 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
          <p className="mt-4 text-sm text-zinc-500">Cargando catálogo de ofertas laborales de Funes...</p>
        </div>
      }
    >
      <JobCatalogView initialJobs={jobs} rubros={rubros} />
    </Suspense>
  );
}
