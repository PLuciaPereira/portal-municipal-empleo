import React from 'react';
import { UserIcon, BuildingIcon, CheckIcon, ArrowRightIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export const HomeRolesSection: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        
        {/* =========================================================
            TARJETA 1: POSTULANTES / VECINOS DE FUNES
            ========================================================= */}
        <Card className="border-border bg-surface border shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-800" />
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center border border-brand-200">
                <UserIcon className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 border border-brand-200/60">
                Para Vecinos de Funes
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                ¿Estás buscando trabajo?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Registrate en la base oficial de postulantes de la Oficina de Empleo para acceder a oportunidades laborales en empresas y comercios de la ciudad.
              </p>
            </div>

            {/* Viñetas con checks verdes */}
            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-foreground/90">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
                <span>Cargá tu CV una sola vez y postulate a búsquedas activas.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
                <span>Preselección guiada por el equipo de intermediación municipal.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
                <span>Tus datos personales están protegidos y resguardados.</span>
              </li>
            </ul>

            <div className="pt-3">
              <Button href="/registro" variant="primary" className="w-full sm:w-auto font-bold gap-2">
                <span>Registrarme como Postulante</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* =========================================================
            TARJETA 2: EMPRESAS / COMERCIOS
            ========================================================= */}
        <Card className="border-border bg-surface border shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-600" />
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center border border-brand-200">
                <BuildingIcon className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 border border-brand-200/60">
                Para Comercios y Empresas
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                ¿Buscás personal para tu empresa?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Publicá tu búsqueda laboral y optimizá tus tiempos de contratación con el respaldo técnico y gratuito de la Oficina de Empleo.
              </p>
            </div>

            {/* Viñetas con checks verdes */}
            <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-foreground/90">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
                <span>Publicación ágil de vacantes sin exponer contactos privados.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
                <span>Preselección de candidatos idóneos por el equipo de empleo.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
                <span>Servicio 100% público y sin comisiones de intermediación.</span>
              </li>
            </ul>

            <div className="pt-3">
              <Button href="/registro/empresa" variant="secondary" className="w-full sm:w-auto font-bold gap-2">
                <span>Espacio Empresas</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </section>
  );
};
