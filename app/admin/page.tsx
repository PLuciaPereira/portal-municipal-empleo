'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheckIcon,
  BuildingIcon,
  UserIcon,
  BriefcaseIcon,
} from '@/components/ui/Icons';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const isSuperAdmin = user?.es_superadmin;
  const isAdminGeneral = user?.es_admin_general || isSuperAdmin;

  return (
    <PageContainer>
      <PageHeader
        title="Oficina de Empleo · Municipalidad de Funes"
        description="Panel de intermediación laboral, validación institucional de empresas y gestión de búsquedas de empleo."
        badge={
          isSuperAdmin ? (
            <Badge variant="rose">Superadministrador</Badge>
          ) : isAdminGeneral ? (
            <Badge variant="zinc">Administrador General</Badge>
          ) : (
            <Badge variant="emerald">Oficina de Empleo</Badge>
          )
        }
      />

      {/* Tarjetas de Métricas de Intermediación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-zinc-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 block font-medium">Empresas Pendientes</span>
              <span className="text-xl font-bold text-zinc-900">En revisión</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <BriefcaseIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 block font-medium">Ofertas por Aprobar</span>
              <span className="text-xl font-bold text-zinc-900">En revisión</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 block font-medium">Postulantes Registrados</span>
              <span className="text-xl font-bold text-zinc-900">Base activa</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center shrink-0">
              <ShieldCheckIcon className="w-5 h-5 text-brand-800" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 block font-medium">Intermediaciones</span>
              <span className="text-xl font-bold text-zinc-900">Funes prioridad</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identidad de la Sesión Administrativa */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg">
                  <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 leading-tight">
                    {user?.nombre} {user?.apellido}
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {user?.email || 'Sesión Administrativa Oficial'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Rol:</span>
                  <span className="font-semibold text-zinc-800">
                    {isSuperAdmin
                      ? 'Superadministrador Activo'
                      : isAdminGeneral
                      ? 'Administrador General'
                      : 'Personal Oficina de Empleo'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Jurisdicción:</span>
                  <span className="font-semibold text-zinc-800">Gobierno de Funes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Seguridad:</span>
                  <span className="font-semibold text-emerald-700">Políticas RLS Activas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flujos Operativos Municipales (Fase 7) */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Centro de Intermediación y Control Municipal
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Módulos operativos en preparación para la Fase 7.
                  </p>
                </div>
                <Badge variant="blue">Próximamente: Fase 7</Badge>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
                  <BuildingIcon className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-zinc-800 block">Aprobación de Empresas con Motivo</span>
                    <p className="text-zinc-600">
                      Revisión de altas comerciales, aprobación y rechazo fundado según ordenanza municipal.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
                  <BriefcaseIcon className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-zinc-800 block">Revisión y Aprobación de Ofertas Laborales</span>
                    <p className="text-zinc-600">
                      Validación de ofertas creadas por comercios antes de su difusión pública general.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-zinc-800 block">Preselección de Postulantes con Prioridad Funes</span>
                    <p className="text-zinc-600">
                      Búsqueda en base municipal, registro de entrevistas preliminares y derivación formal a empresas.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
