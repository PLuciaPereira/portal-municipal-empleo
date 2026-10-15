'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BuildingIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@/components/ui/Icons';

export default function EmpresaDashboardPage() {
  const { user, empresa } = useAuth();

  const estado = empresa?.estado || 'pendiente';
  const isAprobada = estado === 'aprobada';

  return (
    <PageContainer>
      <PageHeader
        title={empresa?.nombre_fantasia || empresa?.razon_social || 'Panel de Empresa'}
        description="Gestión institucional, publicación de ofertas laborales y revisión de candidatos derivados por el Municipio."
        badge={
          isAprobada ? (
            <Badge variant="emerald">Empresa Habilitada</Badge>
          ) : (
            <Badge variant="amber">Pendiente de Aprobación Municipal</Badge>
          )
        }
      />

      {/* Alerta de Estado Pendiente */}
      {!isAprobada && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <ClockIcon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-950 space-y-1">
            <h2 className="font-bold text-amber-900">
              Cuenta en proceso de verificación por la Oficina de Empleo
            </h2>
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
              El equipo municipal de intermediación está revisando los datos comerciales de tu empresa (CUIT: <strong>{empresa?.cuit || 'Pendiente'}</strong>). Una vez aprobada tu cuenta, podrás crear ofertas laborales y recibir postulantes preseleccionados.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos Comerciales */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-lg">
                  <BuildingIcon className="w-6 h-6 text-sky-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 leading-tight">
                    {empresa?.razon_social || 'Empresa Registrada'}
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {empresa?.email_contacto || user?.email}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">CUIT:</span>
                  <span className="font-semibold text-zinc-800">{empresa?.cuit || 'No informado'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Rubro:</span>
                  <span className="font-semibold text-zinc-800">{empresa?.rubro || 'General'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Dirección:</span>
                  <span className="font-semibold text-zinc-800">{empresa?.direccion || 'Funes'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Teléfono:</span>
                  <span className="font-semibold text-zinc-800">{empresa?.telefono || 'No informado'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Contacto:</span>
                  <span className="font-semibold text-zinc-800">{empresa?.persona_contacto || user?.nombre}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  La intermediación municipal garantiza la confidencialidad de los procesos y la prioridad de inserción laboral local.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de Ofertas y Candidatos (Fase 6) */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Búsquedas Laborales de la Empresa
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Publicación de vacantes laborales sujetas a revisión de la Oficina de Empleo.
                  </p>
                </div>
                <Badge variant="blue">Próximamente: Fase 6</Badge>
              </div>

              <div className="p-6 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200 space-y-2">
                <p className="text-sm font-semibold text-zinc-700">
                  Módulo de Gestión de Ofertas en desarrollo
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  En la Fase 6 podrás crear ofertas de empleo, enviarlas para revisión municipal y hacer seguimiento de los estados de publicación.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Candidatos Presentados por el Municipio
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Perfiles laborales evaluados y derivados por la Oficina de Empleo.
                  </p>
                </div>
                <Badge variant="blue">Próximamente: Fase 6</Badge>
              </div>

              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-1">
                <span className="font-bold block text-sky-900">
                  Privacidad y Seguridad de Candidatos
                </span>
                <p>
                  Por normativa de privacidad de la Municipalidad de Funes, el portal solo te presentará candidatos seleccionados formalmente por la Oficina de Empleo, protegiendo sus datos de contacto privados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
