import React from 'react';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeRolesSection } from '@/components/home/HomeRolesSection';
import { HomeHowItWorks } from '@/components/home/HomeHowItWorks';
import { HomeCategories } from '@/components/home/HomeCategories';
import { HomeTrainingAndContact } from '@/components/home/HomeTrainingAndContact';
import { getJobs } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { jobs: featuredJobs } = await getJobs({ destacadasOnly: true });
  const topJobs = featuredJobs.slice(0, 3);

  return (
    <div className="space-y-16 pb-16">
      {/* Fase 1: Hero Principal Renovado (Buscador y Ofertas Destacadas) */}
      <HomeHero latestJobs={topJobs} />

      {/* Fase 2: Segmentación de Roles (Postulantes vs Empresas) */}
      <HomeRolesSection />

      {/* Fase 4: Principales Rubros de Empleo en Funes (Descubrimiento temprano) */}
      <HomeCategories />

      {/* Fase 3: Cómo Funciona la Oficina de Empleo (Confianza e Intermediación) */}
      <HomeHowItWorks />

      {/* Fase 5: Formación, Capacitaciones y Atención Institucional */}
      <HomeTrainingAndContact />
    </div>
  );
}
