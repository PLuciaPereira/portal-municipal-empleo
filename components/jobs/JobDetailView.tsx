'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { JobApplyModal } from './JobApplyModal';
import { AuthRequiredModal } from './AuthRequiredModal';
import { JobCard } from './JobCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  BuildingIcon,
  CalendarIcon,
  ShieldCheckIcon,
  ShareIcon,
  CheckCircleIcon,
  SparklesIcon,
  PhoneIcon,
  UserIcon,
} from '@/components/ui/Icons';

interface JobDetailViewProps {
  job: Job;
  similarJobs: Job[];
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({
  job,
  similarJobs,
}) => {
  const { isAuthenticated, user, hasAppliedTo } = useAuth();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Comprobar si el usuario actual ya se postuló a esta oferta
  const alreadyApplied = useMemo(() => {
    return isAuthenticated && hasAppliedTo(job.id);
  }, [isAuthenticated, hasAppliedTo, job.id]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      setIsApplyModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthModalOpen(false);
    setIsApplyModalOpen(true);
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${job.titulo} en Funes`,
            text: `Oferta laboral en Funes: ${job.titulo}`,
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 3000);
        }
      } catch {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    }
  };

  const formattedDate = new Date(job.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedDeadline = job.fecha_limite
    ? new Date(job.fecha_limite).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Navegación y Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500">
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Inicio
          </Link>
          <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400" />
          <Link href="/ofertas" className="hover:text-emerald-700 transition-colors">
            Ofertas Laborales
          </Link>
          <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 font-medium truncate max-w-[200px] sm:max-w-xs">
            {job.titulo}
          </span>
        </nav>

        <Link
          href="/ofertas"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 transition-colors self-start sm:self-auto"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Volver a todas las ofertas
        </Link>
      </div>

      {/* Cabecera Principal de la Oferta */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {job.rubro && (
                <Badge variant="blue" size="md">
                  {job.rubro.nombre}
                </Badge>
              )}
              <Badge variant="zinc" size="md">
                {job.tipo_jornada}
              </Badge>
              {job.destacada && (
                <Badge variant="emerald" size="md" className="gap-1 font-semibold">
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Búsqueda Destacada
                </Badge>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Convocatoria Abierta
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight leading-tight">
              {job.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-zinc-600 pt-1">
              <span className="flex items-center gap-1.5 font-medium text-zinc-800">
                <BuildingIcon className="w-4 h-4 text-emerald-700" />
                {job.company?.nombre_fantasia || 'Empresa local de Funes'}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="w-4 h-4 text-emerald-700" />
                {job.ubicacion}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-zinc-400" />
                Publicada el {formattedDate}
              </span>
            </div>
          </div>

          {/* Botones de acción rápida en cabecera */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:text-emerald-800 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors flex items-center gap-2 text-xs font-medium"
              title="Compartir esta oferta"
            >
              <ShareIcon className="w-4 h-4" />
              <span>{copiedLink ? '¡Enlace copiado!' : 'Compartir'}</span>
            </button>

            {alreadyApplied ? (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-100 text-emerald-900 font-semibold text-sm border border-emerald-300">
                <CheckCircleIcon className="w-5 h-5 text-emerald-700" />
                Postulado
              </span>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleApplyClick}
                className="shadow-sm"
              >
                Postularme Ahora
              </Button>
            )}
          </div>
        </div>

        {/* Notificación si ya se postuló el usuario autenticado */}
        {alreadyApplied && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-emerald-950 space-y-0.5">
              <p className="font-bold">
                ¡Ya registraste tu postulación a este puesto!
              </p>
              <p className="text-emerald-800">
                Tu perfil de postulante ({user?.nombre} {user?.apellido}) ya se encuentra asignado a esta convocatoria. La Oficina de Empleo te contactará en caso de avanzar hacia la entrevista.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cuerpo Principal: 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Izquierda: Información Detallada del Puesto */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Descripción y Tareas */}
          <section className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              Descripción del puesto y tareas
            </h2>
            <div className="text-sm sm:text-base text-zinc-700 leading-relaxed space-y-3 whitespace-pre-line">
              {job.descripcion}
            </div>
          </section>

          {/* 2. Requisitos */}
          <section className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              Requisitos del perfil
            </h2>
            <div className="text-sm sm:text-base text-zinc-700 leading-relaxed whitespace-pre-line space-y-2">
              {job.requisitos}
            </div>

            {/* Detalles estructurados */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-100 text-xs sm:text-sm">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                <span className="block text-zinc-500 font-medium">Experiencia previa:</span>
                <span className="font-semibold text-zinc-800 mt-0.5 block">
                  {job.experiencia_requerida || 'No excluyente / inicial'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                <span className="block text-zinc-500 font-medium">Lugar de trabajo:</span>
                <span className="font-semibold text-zinc-800 mt-0.5 block">
                  {job.ubicacion}
                </span>
              </div>
            </div>
          </section>

          {/* 3. Condiciones de Contratación */}
          <section className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              Condiciones de contratación
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Jornada laboral:</span>
                <p className="font-semibold text-zinc-900">{job.tipo_jornada}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Tipo de contrato:</span>
                <p className="font-semibold text-zinc-900">{job.tipo_contrato || 'A determinar'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Vacantes disponibles:</span>
                <p className="font-semibold text-zinc-900">
                  {job.vacantes} {job.vacantes === 1 ? 'puesto a cubrir' : 'puestos a cubrir'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Remuneración:</span>
                <p className="font-semibold text-zinc-900">{job.rango_salarial || 'A convenir según convenio de actividad'}</p>
              </div>
            </div>
          </section>

          {/* 4. Cómo es el Proceso de Selección */}
          <section className="bg-emerald-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs tracking-wider uppercase">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Intermediación Oficial de la Oficina de Empleo</span>
            </div>
            <h3 className="text-xl font-bold">¿Cómo es el proceso de selección de esta oferta?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs sm:text-sm text-emerald-100/90">
              <div className="p-3.5 bg-emerald-800/60 rounded-xl border border-emerald-700/60 space-y-1">
                <span className="font-black text-emerald-300 block text-base font-mono">1. Postulación</span>
                <p>Iniciás sesión y enviás tu postulación vinculada a tu CV de forma gratuita y confidencial.</p>
              </div>
              <div className="p-3.5 bg-emerald-800/60 rounded-xl border border-emerald-700/60 space-y-1">
                <span className="font-black text-emerald-300 block text-base font-mono">2. Preselección</span>
                <p>La Oficina de Empleo revisa tus antecedentes y realiza la preselección oficial de candidatos.</p>
              </div>
              <div className="p-3.5 bg-emerald-800/60 rounded-xl border border-emerald-700/60 space-y-1">
                <span className="font-black text-emerald-300 block text-base font-mono">3. Entrevista</span>
                <p>Los candidatos idóneos son convocados y presentados a la empresa para avanzar en la contratación.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Columna Derecha: Tarjetas de Acción y Contacto */}
        <aside className="space-y-6">
          {/* Card Principal de Postulación */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-6 shadow-sm space-y-5">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-800">
                Postulación Requerida
              </span>
              <h3 className="text-lg font-bold text-zinc-900">
                ¿Querés postularte a este puesto?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {isAuthenticated
                  ? 'Estás conectado/a con tu perfil de postulante. Confirmá tu postulación en un clic.'
                  : 'Requiere inicio de sesión. Si todavía no tenés cuenta, podrás registrarte gratuitamente.'}
              </p>
            </div>

            {alreadyApplied ? (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-700" />
                  Postulación Enviada
                </span>
                <p className="text-xs text-emerald-800">
                  No se admiten postulaciones reiteradas a la misma búsqueda.
                </p>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleApplyClick}
                className="w-full justify-center text-base py-3"
              >
                {isAuthenticated ? 'Postularme a esta Oferta' : 'Iniciar Sesión para Postularme'}
              </Button>
            )}

            {formattedDeadline && (
              <p className="text-center text-xs text-zinc-500 flex items-center justify-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                Fecha límite estimada: <strong>{formattedDeadline}</strong>
              </p>
            )}

            <div className="pt-4 border-t border-zinc-100 space-y-3 text-xs text-zinc-600">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Vacantes:</span>
                <span className="font-bold text-zinc-900">{job.vacantes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Modalidad:</span>
                <span className="font-bold text-zinc-900">{job.tipo_jornada}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Zona:</span>
                <span className="font-bold text-zinc-900">{job.ubicacion}</span>
              </div>
            </div>
          </div>

          {/* Card de Usuario Autenticado / Sesión */}
          {isAuthenticated && (
            <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 space-y-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold">
                <UserIcon className="w-4 h-4 text-emerald-700" />
                <span>Sesión activa: {user?.nombre} {user?.apellido}</span>
              </div>
              <p className="text-emerald-800 text-[11px]">
                Rol: <strong className="capitalize">{user?.role}</strong> &bull; Residencia Funes: {user?.es_residente_funes ? 'Sí' : 'No'}
              </p>
            </div>
          )}

          {/* Card de Confidencialidad */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200/80 p-5 space-y-3 text-xs text-zinc-600">
            <div className="flex items-center gap-2 font-bold text-zinc-900">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-700" />
              <span>Privacidad Garantizada</span>
            </div>
            <p className="leading-relaxed">
              Las empresas asociadas no acceden directamente a tu historial ni a la base general. La Oficina de Empleo intermedia cada postulación para proteger tus datos personales.
            </p>
          </div>

          {/* Card de Atención al Vecino */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-3 text-xs text-zinc-600">
            <h4 className="font-bold text-zinc-900 text-sm">Oficina de Empleo de Funes</h4>
            <p className="leading-relaxed">
              ¿Tenés dudas o consultas sobre el proceso de selección?
            </p>
            <div className="pt-1 space-y-2 text-zinc-700">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Pedro A. Ríos 1500, Funes</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Lunes a Viernes de 7:00 a 13:00 hs</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Tel: (0341) 493-6000 / 6010</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Ofertas Relacionadas / Similares */}
      {similarJobs.length > 0 && (
        <section className="pt-8 border-t border-zinc-200 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-zinc-900">
              Otras ofertas laborales en Funes
            </h3>
            <Link
              href="/ofertas"
              className="text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Ver todas &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {similarJobs.map((simJob) => (
              <JobCard key={simJob.id} job={simJob} />
            ))}
          </div>
        </section>
      )}

      {/* Modal de Requisito de Autenticación */}
      <AuthRequiredModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        jobTitle={job.titulo}
        jobId={job.id}
      />

      {/* Modal de Postulación Efectiva */}
      <JobApplyModal
        job={job}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onApplicationSuccess={() => {
          // El estado se actualiza mediante AuthContext recordApplication
        }}
      />
    </div>
  );
};
