import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJobById, getAllJobIds, getSimilarJobs } from '@/lib/jobs';
import { JobDetailView } from '@/components/jobs/JobDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const ids = await getAllJobIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return {
      title: 'Oferta no encontrada | Portal de Empleo Funes',
    };
  }

  return {
    title: `${job.titulo} | Portal de Empleo Municipal de Funes`,
    description: `${job.descripcion.substring(0, 150)}... Puesto en Funes, Santa Fe. Intermediación de la Oficina de Empleo.`,
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  const similarJobs = await getSimilarJobs(job.id, job.rubro_id, 3);

  return <JobDetailView job={job} similarJobs={similarJobs} />;
}
