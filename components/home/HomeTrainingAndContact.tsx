import React from 'react';
import Link from 'next/link';
import {
  GraduationCapIcon,
  MapPinIcon,
  ClockIcon,
  MailIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const HomeTrainingAndContact: React.FC = () => {
  const cursosEjemplo = [
    'Herramientas Digitales y Ofimática',
    'Atención al Cliente y Ventas',
    'Armado de CV y Entrevistas Laborales',
    'Introducción a la Gastronomía y Buenas Prácticas',
  ];

  return (
    <div className="space-y-16">
      {/* =========================================================
          BLOQUE 1: CURSOS Y CAPACITACIONES LABORALES
          ========================================================= */}
      <section id="capacitaciones" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 relative overflow-hidden border border-brand-800 shadow-xl">
          {/* Fondo sutil radial */}
          <div
            className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-brand-700/20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-left">
              <Badge variant="brand" className="bg-brand-800 text-brand-100 border-brand-700">
                Formación y Empleabilidad
              </Badge>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                Cursos y Talleres Gratuitos para Vecinos de Funes
              </h3>

              <p className="text-sm sm:text-base text-brand-100/90 leading-relaxed font-normal">
                La Oficina de Empleo no solo te acerca a las búsquedas laborales de la ciudad, sino que también ofrece capacitaciones y talleres gratuitos para que mejores tus competencias, actualices tu CV y aumentes tus posibilidades de inserción laboral.
              </p>

              {/* Lista de capacitaciones frecuentes */}
              <div className="pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-200 block mb-2.5">
                  Talleres y temáticas habituales:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-brand-100">
                  {cursosEjemplo.map((curso, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-brand-800/40 p-2 rounded-lg border border-brand-700/40">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                      <span className="truncate">{curso}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-center">
              <div className="bg-brand-950/60 p-6 rounded-2xl border border-brand-700/60 backdrop-blur-xs space-y-4 w-full sm:max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center text-brand-200 border border-brand-700">
                    <GraduationCapIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">¿Querés capacitarte?</h4>
                    <p className="text-xs text-brand-200">Inscripciones y fechas abiertas</p>
                  </div>
                </div>

                <p className="text-xs text-brand-100/80 leading-relaxed">
                  Consultá por los próximos cursos presenciales y virtuales dictados por la Municipalidad de Funes.
                </p>

                <Button
                  href="/#contacto"
                  variant="hero-primary"
                  className="w-full justify-center font-bold"
                >
                  <span>Consultar por Cursos</span>
                  <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BLOQUE 2: ATENCIÓN Y CONTACTO INSTITUCIONAL (#contacto)
          ========================================================= */}
      <section id="contacto" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Información institucional de la Oficina de Empleo */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold border border-brand-200">
                <ShieldCheckIcon className="w-4 h-4 text-brand-700" />
                <span>Atención Oficial y Asesoramiento</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Oficina de Empleo · Municipalidad de Funes
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                ¿Tenés dudas para cargar tu CV o necesitás asesoramiento presencial para una búsqueda laboral? Nuestro equipo te atiende en la sede municipal para acompañarte en cada paso del proceso.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 mt-0.5">
                    <ClockIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">Horario de Atención</span>
                    <span className="text-xs text-muted-foreground">Lunes a Viernes de 7:00 a 13:00 hs</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPinIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">Sede Municipal</span>
                    <span className="text-xs text-muted-foreground">Santa Fe 1689, Funes, Santa Fe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Contacto Directo */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="p-6 rounded-2xl bg-brand-50/60 border border-brand-200/80 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-brand-800 uppercase tracking-wider">
                    Contacto y Consultas
                  </span>
                  <h4 className="font-bold text-base text-foreground">
                    Escribinos directamente
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Podés enviarnos tus inquietudes o solicitar turnos de orientación por correo electrónico.
                  </p>
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0">
                    <MailIcon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[11px] text-muted-foreground block">Correo Oficial</span>
                    <a
                      href="mailto:empleo@funes.gob.ar"
                      className="text-xs sm:text-sm font-bold text-brand-800 hover:underline"
                    >
                      empleo@funes.gob.ar
                    </a>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    href="/registro"
                    variant="primary"
                    className="w-full justify-center font-bold"
                  >
                    <span>Cargar mi CV en el Portal</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
