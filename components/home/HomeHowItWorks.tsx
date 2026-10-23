import React from 'react';
import Link from 'next/link';
import {
  BuildingIcon,
  ShieldCheckIcon,
  UsersIcon,
  CheckIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const HomeHowItWorks: React.FC = () => {
  return (
    <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Cabecera de Sección */}
      <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
        <Badge variant="brand" size="md">
          Proceso Transparente y Gratuito
        </Badge>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground">
          ¿Cómo funciona la Oficina de Empleo?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Un servicio público municipal que conecta las vacantes reales de las empresas locales con los vecinos de Funes, asegurando acompañamiento y preselección calificada.
        </p>
      </div>

      {/* =========================================================
          REJILLA DE 3 PASOS CRONOLÓGICOS (FASE 3 OFICIAL)
          ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        
        {/* =========================================================
            PASO 01: LAS EMPRESAS PUBLICAN VACANTES
            ========================================================= */}
        <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-border shadow-xs hover:border-brand-300 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center border border-brand-200">
                <BuildingIcon className="w-5 h-5" />
              </div>
              <span className="text-3xl font-black text-brand-200 font-mono">01</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                Paso 1 · Convocatorias Reales
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Las empresas publican sus vacantes
              </h3>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Comercios, pymes y empresas de Funes cargan sus búsquedas activas en la plataforma oficial, detallando las tareas y requisitos del puesto.
            </p>

            <ul className="space-y-2 pt-2 text-xs text-foreground/80">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-2.5 h-2.5" />
                </span>
                <span>Búsquedas verificadas en Funes y zona</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-2.5 h-2.5" />
                </span>
                <span>Sin exponer datos privados de contacto</span>
              </li>
            </ul>
          </div>
        </div>

        {/* =========================================================
            PASO 02: LA OFICINA DE EMPLEO PRESELECCIONA (EL NÚCLEO)
            ========================================================= */}
        <div className="bg-brand-50/50 rounded-2xl p-6 sm:p-7 border-2 border-brand-600/70 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-700" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-brand-800 text-white flex items-center justify-center shadow-xs">
                <ShieldCheckIcon className="w-6 h-6 text-brand-300" />
              </div>
              <span className="text-3xl font-black text-brand-300 font-mono">02</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-800 bg-brand-100/90 px-2 py-0.5 rounded-md">
                Paso 2 · Intermediación Municipal
              </span>
              <h3 className="text-lg font-bold text-foreground">
                La Oficina de Empleo preselecciona perfiles
              </h3>
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed font-normal">
              El equipo de empleo analiza la base de vecinos registrados, cruzando experiencia, cercanía y formación para encontrar a las personas más acordes a la vacante.
            </p>

            <ul className="space-y-2 pt-2 text-xs text-brand-950 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-200 text-brand-900 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-2.5 h-2.5" />
                </span>
                <span>Evaluación humana, cercana y personalizada</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-200 text-brand-900 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-2.5 h-2.5" />
                </span>
                <span>Ahorro de tiempo para empresas y postulantes</span>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-brand-200/60 mt-3 text-[11px] text-brand-800 font-semibold flex items-center gap-1.5">
            <SparklesIcon className="w-3.5 h-3.5 text-brand-700" />
            <span>Servicio público, confidencial y 100% gratuito</span>
          </div>
        </div>

        {/* =========================================================
            PASO 03: ENTREVISTA Y CONTRATACIÓN
            ========================================================= */}
        <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-border shadow-xs hover:border-brand-300 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center border border-brand-200">
                <UsersIcon className="w-5 h-5" />
              </div>
              <span className="text-3xl font-black text-brand-200 font-mono">03</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                Paso 3 · Vinculación Directa
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Entrevista laboral y contratación
              </h3>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              La empresa recibe la terna de candidatos seleccionados y convocamos a los vecinos para coordinar las entrevistas finales e incorporación al puesto.
            </p>

            <ul className="space-y-2 pt-2 text-xs text-foreground/80">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-2.5 h-2.5" />
                </span>
                <span>Contacto directo para entrevistas formales</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-2.5 h-2.5" />
                </span>
                <span>Inserción laboral formal en la comunidad de Funes</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* =========================================================
          BANNER COMPLEMENTARIO INFERIOR CON DOS ACCESOS
          ========================================================= */}
      <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-bold text-foreground text-sm sm:text-base">
            ¿Querés ser parte de la red de empleo de Funes?
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Elegí cómo comenzar según tu necesidad actual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button href="/registro" size="sm" variant="primary">
            Cargar mi CV (Postulante)
          </Button>
          <Button href="/registro/empresa" size="sm" variant="secondary">
            Publicar Vacante (Empresa)
          </Button>
        </div>
      </div>
    </section>
  );
};
