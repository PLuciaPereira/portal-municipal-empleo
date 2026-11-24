import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getJobs, getRubros } from '@/lib/jobs';
import { JobCatalogView } from '@/components/jobs/JobCatalogView';
import { Skeleton } from '@/components/ui/Skeleton';

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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Sidebar Skeleton */}
            <div className="w-full lg:w-72 bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-4 shrink-0">
              <Skeleton className="h-5 w-32 rounded-md" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>

            {/* Listado Skeleton */}
            <div className="flex-1 w-full space-y-4">
              <div className="h-8 w-48 bg-zinc-200/60 rounded-md animate-pulse" />
              <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`job-skel-${i}`}
                    className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 space-y-3 shadow-2xs"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-2/5 rounded-md" />
                        <Skeleton className="h-4 w-1/4 rounded-md bg-zinc-100" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-4/5 rounded-md bg-zinc-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <JobCatalogView initialJobs={jobs} rubros={rubros} />
    </Suspense>
  );
}
