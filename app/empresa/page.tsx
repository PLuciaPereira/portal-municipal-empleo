'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  BuildingIcon,
  ShieldCheckIcon,
  ClockIcon,
  BriefcaseIcon,
  UsersIcon,
  PlusIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import { getMisOfertasEmpresa, getCandidatosPresentados } from '@/lib/empresa';
import { Oferta, Rubro, VistaCandidatoEmpresa } from '@/types/database';
import { CompanyJobsTable } from '@/components/empresa/CompanyJobsTable';
import { CandidatesTable } from '@/components/empresa/CandidatesTable';
import { CompanyJobModal } from '@/components/empresa/CompanyJobModal';

export default function EmpresaDashboardPage() {
  const { user, empresa } = useAuth();

  const [activeTab, setActiveTab] = useState<'ofertas' | 'candidatos'>('ofertas');
  const [ofertas, setOfertas] = useState<
    (Oferta & {
      rubro: Rubro | null;
      ofertas_rubros: { rubro_id: number; rubro: Rubro | null }[];
    })[]
  >([]);
  const [candidatos, setCandidatos] = useState<VistaCandidatoEmpresa[]>([]);
  const estado = empresa?.estado || 'pendiente';
  const isAprobada = estado === 'aprobada';

  const [filterOfertaId, setFilterOfertaId] = useState<string | null>(null);
  const [loadingOfertas, setLoadingOfertas] = useState(() => isAprobada);
  const [loadingCandidatos, setLoadingCandidatos] = useState(() => isAprobada);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadOfertas = useCallback(async () => {
    if (!isAprobada) return;
    setLoadingOfertas(true);
    const res = await getMisOfertasEmpresa();
    if (res.data) setOfertas(res.data);
    setLoadingOfertas(false);
  }, [isAprobada]);

  const loadCandidatos = useCallback(async (ofertaId?: string) => {
    if (!isAprobada) return;
    setLoadingCandidatos(true);
    const res = await getCandidatosPresentados(ofertaId);
    if (res.data) setCandidatos(res.data);
    setLoadingCandidatos(false);
  }, [isAprobada]);

  useEffect(() => {
    if (!isAprobada) return;
    let isMounted = true;
    const init = async () => {
      const [resOfertas, resCandidatos] = await Promise.all([
        getMisOfertasEmpresa(),
        getCandidatosPresentados(),
      ]);
      if (!isMounted) return;
      if (resOfertas.data) setOfertas(resOfertas.data);
      if (resCandidatos.data) setCandidatos(resCandidatos.data);
      setLoadingOfertas(false);
      setLoadingCandidatos(false);
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [isAprobada]);

  const handleSelectOfertaCandidates = (ofertaId: string) => {
    setFilterOfertaId(ofertaId);
    setActiveTab('candidatos');
    loadCandidatos(ofertaId);
  };

  const handleClearCandidatesFilter = () => {
    setFilterOfertaId(null);
    loadCandidatos();
  };

  const activeCandidatesCount = candidatos.filter(
    (c) => c.estado_postulacion === 'presentado_a_empresa'
  ).length;

  const empresaNombre =
    empresa?.nombre_fantasia || empresa?.razon_social || 'Panel de Empresa';

  return (
    <div className="min-h-screen bg-background">
      {/* Franja verde institucional de cabecera */}
      <section className="bg-brand-950 bg-gradient-to-b from-brand-950 to-brand-900 pt-8 pb-24 sm:pt-10 sm:pb-28 border-b border-brand-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {empresaNombre}
            </h1>
            <div>
              {isAprobada ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-brand-100 text-brand-900 border border-brand-200">
                  <CheckCircleIcon className="w-4 h-4 text-brand-800" />
                  Empresa Habilitada
                </span>
              ) : (
                <Badge variant="amber">Pendiente de Aprobación Municipal</Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contenido principal montado sobre la franja */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 pb-16">
        {/* Alerta de Verificación Pendiente */}
        {!isAprobada && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-xs">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Tarjeta lateral: Datos Comerciales de la Empresa */}
          <div className="space-y-4 lg:col-span-1">
            <Card className="border-border shadow-sm bg-surface">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-lg">
                    <BuildingIcon className="w-6 h-6 text-brand-800" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground leading-tight truncate">
                      {empresa?.razon_social || 'Empresa Registrada'}
                    </h3>
                    <span className="text-xs text-muted-foreground block truncate">
                      {empresa?.email_contacto || user?.email}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-border/60 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">CUIT:</span>
                    <span className="font-semibold text-foreground">{empresa?.cuit || 'No informado'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Rubro:</span>
                    <span className="font-semibold text-foreground">{empresa?.rubro || 'General'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="font-semibold text-foreground">{empresa?.direccion || 'Funes'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="font-semibold text-foreground">{empresa?.telefono || 'No informado'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Contacto:</span>
                    <span className="font-semibold text-foreground">{empresa?.persona_contacto || user?.nombre}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recuadro de idoneidad municipal ubicado debajo de la tarjeta comercial */}
            <div className="p-4 bg-brand-50/70 border border-brand-200 rounded-2xl flex items-start gap-3 shadow-2xs">
              <ShieldCheckIcon className="w-5 h-5 text-brand-800 shrink-0 mt-0.5" />
              <p className="text-xs text-brand-950 font-medium leading-relaxed">
                Los candidatos derivados son seleccionados por el equipo municipal para garantizar su adecuación al puesto y promover la inserción laboral local.
              </p>
            </div>
          </div>

          {/* Bloque Contenedor Blanco: Pestañas + Acciones + Contenido de Ofertas/Candidatos */}
          <div className="lg:col-span-3">
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-6">
              {/* Navegación por pestañas y botón Nueva Oferta juntos dentro del bloque blanco */}
              <div className="flex items-center justify-between border-b border-border pb-4 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('ofertas')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'ofertas'
                        ? 'bg-brand-50 text-brand-800 border border-brand-200'
                        : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100'
                    }`}
                  >
                    <BriefcaseIcon className="w-4 h-4" />
                    <span>Mis Ofertas</span>
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 font-semibold">
                      {ofertas.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('candidatos')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'candidatos'
                        ? 'bg-brand-50 text-brand-800 border border-brand-200'
                        : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100'
                    }`}
                  >
                    <UsersIcon className="w-4 h-4" />
                    <span>Candidatos Presentados</span>
                    {activeCandidatesCount > 0 && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-brand-800 text-white font-bold">
                        {activeCandidatesCount}
                      </span>
                    )}
                  </button>
                </div>

                {isAprobada && activeTab === 'ofertas' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Nueva Oferta
                  </Button>
                )}
              </div>

              {/* Contenido Pestaña Ofertas */}
              {activeTab === 'ofertas' && (
                <CompanyJobsTable
                  ofertas={ofertas}
                  loading={loadingOfertas}
                  onRefresh={loadOfertas}
                  onViewCandidates={handleSelectOfertaCandidates}
                />
              )}

              {/* Contenido Pestaña Candidatos */}
              {activeTab === 'candidatos' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        Candidatos Derivados por la Oficina de Empleo
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Evaluá los perfiles y CVs presentados. Podés confirmar la contratación o registrar un rechazo con motivo para el Municipio.
                      </p>
                    </div>

                    {filterOfertaId && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Filtrado por oferta</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleClearCandidatesFilter}
                        >
                          Ver todos
                        </Button>
                      </div>
                    )}
                  </div>

                  <CandidatesTable
                    candidatos={candidatos}
                    loading={loadingCandidatos}
                    onRefresh={() => loadCandidatos(filterOfertaId || undefined)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal para Crear Nueva Oferta */}
        {isCreateModalOpen && (
          <CompanyJobModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              loadOfertas();
            }}
          />
        )}
      </main>
    </div>
  );
}
