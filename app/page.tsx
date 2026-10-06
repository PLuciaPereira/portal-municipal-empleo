import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BuildingIcon,
  UserIcon,
  SearchIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobCard } from '@/components/jobs/JobCard';
import { getJobs } from '@/lib/jobs';

export default async function Home() {
  const { jobs: featuredJobs } = await getJobs({ destacadasOnly: true });
  const topJobs = featuredJobs.slice(0, 3);

  const rubrosDestacados = [
    { nombre: 'Comercio y Atención al Cliente', icon: '🛍️', count: 'Múltiples vacantes' },
    { nombre: 'Gastronomía y Hotelería', icon: '🍽️', count: 'Temporada y anual' },
    { nombre: 'Construcción y Mantenimiento', icon: '🔨', count: 'Electricidad, plomería, obra' },
    { nombre: 'Administración y Contabilidad', icon: '📊', count: 'Pymes y comercios' },
    { nombre: 'Logística y Distribución', icon: '🚚', count: 'Distribución local y regional' },
    { nombre: 'Jardinería y Parquizaciones', icon: '🌿', count: 'Mantenimiento de quintas' },
    { nombre: 'Salud y Cuidados', icon: '🩺', count: 'Asistencia y atención' },
    { nombre: 'Tecnología e Informática', icon: '💻', count: 'Soporte y diseño' },
  ];

  const pasos = [
    {
      numero: '01',
      titulo: 'Creá tu perfil y cargá tu CV',
      descripcion:
        'Completá tus datos, experiencia y habilidades. Tu información queda resguardada y disponible para las búsquedas municipales.',
      icono: UserIcon,
    },
    {
      numero: '02',
      titulo: 'Intermediación Municipal',
      descripcion:
        'El equipo de la Oficina de Empleo analiza las ofertas de las empresas de Funes y realiza la preselección de perfiles afines.',
      icono: ShieldCheckIcon,
    },
    {
      numero: '03',
      titulo: 'Entrevistas y Contratación',
      descripcion:
        'Los candidatos preseleccionados son presentados a las empresas para avanzar con las entrevistas finales y la inserción laboral.',
      icono: CheckCircleIcon,
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-700/80 border border-emerald-500/50 text-emerald-100 text-xs font-medium shadow-xs">
            <Image
              src="/escudo-funes-blanco.png"
              alt="Escudo Oficial de la Municipalidad de Funes"
              width={16}
              height={16}
              className="w-4 h-4 object-contain shrink-0"
              priority
            />
            <span>Portal Oficial de la Municipalidad de Funes</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Encontrá tu próxima oportunidad laboral en <span className="text-emerald-300">Funes</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-emerald-100/90 leading-relaxed">
            El punto de encuentro oficial entre los vecinos que buscan empleo y las empresas locales. Un servicio público, transparente, confidencial y gratuito.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <Button
              href="/ofertas"
              size="lg"
              className="w-full sm:w-auto bg-white text-emerald-900 hover:bg-emerald-50 shadow-md font-semibold"
            >
              <SearchIcon className="w-5 h-5 text-emerald-800" />
              Ver Ofertas Laborales
            </Button>
            <Button
              href="/postulantes"
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-emerald-400/60 bg-emerald-800/40 text-white hover:bg-emerald-700/60"
            >
              <UserIcon className="w-5 h-5" />
              Cargar mi CV
            </Button>
          </div>

          {/* Estadísticas rápidas o destacados */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto border-t border-emerald-700/60 text-left">
            <div className="p-3">
              <span className="block text-2xl font-bold text-white">+100%</span>
              <span className="text-xs text-emerald-200">Enfocado en Funes y zona</span>
            </div>
            <div className="p-3">
              <span className="block text-2xl font-bold text-white">Gratuito</span>
              <span className="text-xs text-emerald-200">Para vecinos y comercios</span>
            </div>
            <div className="p-3 col-span-2 md:col-span-1">
              <span className="block text-2xl font-bold text-white">Intermediación</span>
              <span className="text-xs text-emerald-200">Acompañamiento personalizado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Acceso para Empresas y Postulantes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-emerald-600 bg-gradient-to-br from-white to-emerald-50/30">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">¿Estás buscando trabajo?</h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Registrate en la base oficial de postulantes de la Oficina de Empleo. Podrás postularte a las ofertas vigentes y ser considerado para futuras oportunidades en empresas de Funes.
              </p>
              <div className="pt-2">
                <Button href="/postulantes" variant="primary">
                  Registrarme como Postulante
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sky-600 bg-gradient-to-br from-white to-sky-50/30">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <BuildingIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">¿Buscás personal para tu empresa o comercio?</h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Publicá tu búsqueda laboral. La Oficina de Empleo preseleccionará a los candidatos adecuados según tus requisitos, optimizando tus tiempos de contratación sin exponer datos personales.
              </p>
              <div className="pt-2">
                <Button href="/empresas" variant="secondary" className="bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100">
                  Espacio Empresas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cómo Funciona */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="emerald" size="md">
            Proceso Transparente
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
            ¿Cómo funciona la Oficina de Empleo?
          </h2>
          <p className="text-sm sm:text-base text-zinc-600">
            La plataforma digitaliza y agiliza el contacto laboral resguardando la privacidad y asegurando una preselección calificada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pasos.map((paso, idx) => {
            const Icon = paso.icono;
            return (
              <div
                key={idx}
                className="relative bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black text-zinc-200 font-mono">
                      {paso.numero}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">{paso.titulo}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {paso.descripcion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ofertas Laborales Destacadas */}
      {topJobs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Búsquedas Activas
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">Búsquedas laborales destacadas en Funes</h2>
              <p className="text-sm text-zinc-600 mt-1">
                Convocatorias abiertas intermediadas por la Oficina de Empleo Municipal.
              </p>
            </div>
            <Button
              href="/ofertas"
              variant="outline"
              size="sm"
              className="self-start sm:self-auto"
            >
              Explorar Catálogo Completo &rarr;
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* Rubros de Empleo en Funes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Principales rubros en Funes</h2>
            <p className="text-sm text-zinc-600 mt-1">
              Explorá búsquedas activas y sectores con demanda laboral frecuente en la ciudad.
            </p>
          </div>
          <Link
            href="/ofertas"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 self-start sm:self-auto"
          >
            Ver todas las ofertas &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rubrosDestacados.map((rubro, index) => (
            <Link
              key={index}
              href={`/ofertas?rubro=${encodeURIComponent(rubro.nombre)}`}
              className="group p-4 bg-white rounded-xl border border-zinc-200 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="text-2xl mb-2">{rubro.icon}</div>
              <div>
                <h4 className="font-semibold text-sm text-zinc-900 group-hover:text-emerald-700 transition-colors">
                  {rubro.nombre}
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">{rubro.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Banner de Compromiso y Capacitación */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-900 text-white rounded-2xl p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <Badge variant="emerald" className="bg-emerald-800 text-emerald-200 border-emerald-700">
              Formación y Empleabilidad
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-bold">
              Cursos y Capacitaciones Laborales
            </h3>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              La Oficina de Empleo no solo conecta búsquedas laborales, sino que también orienta a los vecinos hacia cursos y capacitaciones gratuitas para mejorar su empleabilidad y adquirir nuevas competencias.
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button
              href="/#contacto"
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold"
            >
              Consultar por Cursos
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
