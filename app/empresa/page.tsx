'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
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

  return (
    <PageContainer>
      <PageHeader
        title={empresa?.nombre_fantasia || empresa?.razon_social || 'Panel de Empresa'}
        description="Gestión de ofertas laborales y evaluación de postulantes presentados por la Oficina de Empleo de Funes."
        badge={
          isAprobada ? (
            <Badge variant="emerald">Empresa Habilitada</Badge>
          ) : (
            <Badge variant="amber">Pendiente de Aprobación Municipal</Badge>
          )
        }
      />

      {/* Alerta de Verificación Pendiente */}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tarjeta lateral: Datos Comerciales de la Empresa */}
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
                  Los candidatos derivados son seleccionados por el equipo municipal para garantizar idoneidad técnica e inserción local.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Principal: Pestañas de Ofertas y Candidatos */}
        <div className="space-y-6 lg:col-span-3">
          {/* Navegación por pestañas */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ofertas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'ofertas'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <BriefcaseIcon className="w-4 h-4" />
                <span>Mis Ofertas</span>
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                  {ofertas.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('candidatos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'candidatos'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                <span>Candidatos Presentados</span>
                {activeCandidatesCount > 0 && (
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-brand-600 text-white font-bold">
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
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="p-6">
                <CompanyJobsTable
                  ofertas={ofertas}
                  loading={loadingOfertas}
                  onRefresh={loadOfertas}
                  onViewCandidates={handleSelectOfertaCandidates}
                />
              </CardContent>
            </Card>
          )}

          {/* Contenido Pestaña Candidatos */}
          {activeTab === 'candidatos' && (
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Candidatos Derivados por la Oficina de Empleo
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Evaluá los perfiles y CVs presentados. Podés confirmar la contratación o registrar un rechazo con motivo para el Municipio.
                    </p>
                  </div>

                  {filterOfertaId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Filtrado por oferta</span>
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
              </CardContent>
            </Card>
          )}
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
    </PageContainer>
  );
}
