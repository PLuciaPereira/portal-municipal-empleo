'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  UserIcon,
  SearchIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';

export default function PostulanteDashboardPage() {
  const { user, appliedJobIds } = useAuth();

  return (
    <PageContainer>
      <PageHeader
        title="Mi Portal de Postulante"
        description="Gestioná tus datos personales, currículums vitae y el estado de tus postulaciones laborales."
        badge={<Badge variant="emerald">Postulante Activo</Badge>}
        actions={
          <Button href="/ofertas" variant="primary" size="sm" className="flex items-center gap-1.5">
            <SearchIcon className="w-4 h-4" />
            Explorar Ofertas Laborales
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Información de Perfil */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  {user?.nombre?.charAt(0) || 'P'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 leading-tight">
                    {user?.nombre} {user?.apellido}
                  </h2>
                  <span className="text-xs text-zinc-500">
                    {user?.email || 'Postulante registrado'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">DNI:</span>
                  <span className="font-semibold text-zinc-800">{user?.dni || 'No cargado'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Teléfono:</span>
                  <span className="font-semibold text-zinc-800">{user?.telefono || 'No cargado'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Residencia:</span>
                  <span className="font-semibold text-zinc-800">
                    {user?.es_residente_funes ? 'Funes (Residente)' : 'Otra localidad'}
                  </span>
                </div>
                {user?.barrio && (
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Barrio:</span>
                    <span className="font-semibold text-zinc-800">{user?.barrio}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60 text-xs text-emerald-950 flex items-start gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Tus datos privados están resguardados por la Oficina de Empleo de Funes conforme a la política municipal de privacidad.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Resumen de Trámites y Postulaciones */}
        <div className="space-y-6 lg:col-span-2">
          {/* Postulaciones Registradas */}
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900">
                  Mis Postulaciones Activas
                </h3>
                <Badge variant="zinc">
                  {appliedJobIds.length} {appliedJobIds.length === 1 ? 'postulación' : 'postulaciones'}
                </Badge>
              </div>

              {appliedJobIds.length === 0 ? (
                <div className="text-center py-8 px-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <UserIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-zinc-700">
                    Aún no te has postulado a ninguna oferta
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 mb-4">
                    Revisá las búsquedas vigentes de comercios y empresas de Funes y enviá tu postulación.
                  </p>
                  <Button href="/ofertas" variant="outline" size="sm">
                    Ver ofertas disponibles
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>Tenés {appliedJobIds.length} ofertas en proceso de intermediación municipal.</span>
                    </div>
                    <Link
                      href="/ofertas"
                      className="font-semibold text-emerald-700 hover:text-emerald-900 underline"
                    >
                      Ver más ofertas
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Currículums Vitae (Preparado para Fase 5) */}
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Mis Currículums Vitae
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Podrás gestionar hasta 5 CVs diferenciados para distintos perfiles laborales.
                  </p>
                </div>
                <Badge variant="blue">Próximamente: Fase 5</Badge>
              </div>

              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-1">
                <span className="font-bold block text-sky-900">
                  Gestión múltiple de CVs en preparación
                </span>
                <p>
                  En la Fase 5 podrás subir tus archivos en PDF o Word, seleccionar un CV principal y asociar una copia inmutable a cada postulación específica.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
