'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheckIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import {
  getMisOfertasEmpresa,
  getCandidatosPresentados,
  getMiEmpresa,
} from '@/lib/empresa';
import { Oferta, Rubro, VistaCandidatoEmpresa, Empresa } from '@/types/database';
import { CompanyJobsTable } from '@/components/empresa/CompanyJobsTable';
import { CandidatesTable } from '@/components/empresa/CandidatesTable';
import { CompanyJobModal } from '@/components/empresa/CompanyJobModal';
import { CompanyProfileEditModal } from '@/components/empresa/CompanyProfileEditModal';
import {
  Building2,
  Briefcase,
  Users,
  Edit3,
  Check,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  Lock,
} from 'lucide-react';

type TabKey = 'perfil' | 'ofertas' | 'candidatos';

export default function EmpresaDashboardPage() {
  const { user, empresa: authEmpresa, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('perfil');
  const [empresaData, setEmpresaData] = useState<Empresa | null>(authEmpresa);
  const [ofertas, setOfertas] = useState<
    (Oferta & {
      rubro: Rubro | null;
      ofertas_rubros: { rubro_id: number; rubro: Rubro | null }[];
    })[]
  >([]);
  const [candidatos, setCandidatos] = useState<VistaCandidatoEmpresa[]>([]);
  const [filterOfertaId, setFilterOfertaId] = useState<string | null>(null);

  const displayEmpresa = empresaData || authEmpresa;
  const estado = displayEmpresa?.estado || 'pendiente';
  const isAprobada = estado === 'aprobada';

  const [loadingOfertas, setLoadingOfertas] = useState(() => isAprobada);
  const [loadingCandidatos, setLoadingCandidatos] = useState(() => isAprobada);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Sincronizar datos de la empresa actual
  const loadEmpresaData = useCallback(async () => {
    const res = await getMiEmpresa();
    if (res.data) {
      setEmpresaData(res.data);
    }
  }, []);

  const loadOfertas = useCallback(async () => {
    if (!isAprobada) return;
    setLoadingOfertas(true);
    const res = await getMisOfertasEmpresa();
    if (res.data) setOfertas(res.data);
    setLoadingOfertas(false);
  }, [isAprobada]);

  const loadCandidatos = useCallback(
    async (ofertaId?: string) => {
      if (!isAprobada) return;
      setLoadingCandidatos(true);
      const res = await getCandidatosPresentados(ofertaId);
      if (res.data) setCandidatos(res.data);
      setLoadingCandidatos(false);
    },
    [isAprobada]
  );


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

  const handleProfileSaved = async () => {
    await Promise.all([loadEmpresaData(), refreshUser()]);
  };

  const activeCandidatesCount = candidatos.filter(
    (c) => c.estado_postulacion === 'presentado_a_empresa'
  ).length;

  const contratadosCount = candidatos.filter(
    (c) => c.estado_postulacion === 'contratado'
  ).length;

  const ofertasActivasCount = ofertas.filter((o) => o.estado === 'publicada').length;

  const empresaNombre =
    displayEmpresa?.nombre_fantasia ||
    displayEmpresa?.razon_social ||
    'Mi Empresa';

  const initialLetter = empresaNombre.charAt(0).toUpperCase() || 'E';

  return (
    <div className="min-h-screen bg-page text-foreground flex flex-col font-sans">
      {/* 1. Banda Verde Superior Institucional Funes Full-Width */}
      <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white pt-8 pb-7 border-b border-brand-950/40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-[820px]">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                {isAprobada ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 text-brand-950 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    Empresa Habilitada por la Oficina de Empleo de Funes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold backdrop-blur-xs">
                    <ClockIcon className="w-3.5 h-3.5 text-amber-300" />
                    Pendiente de Aprobación Municipal
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white font-sans">
                {empresaNombre}
              </h1>

              <p className="mt-1.5 text-brand-100/90 text-xs sm:text-sm lg:text-base leading-relaxed">
                Gestión integral de búsquedas laborales, seguimiento de candidatos derivados y vinculación estratégica con la Oficina de Empleo de Funes.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {isAprobada ? (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="min-h-[42px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5 stroke-[2.4]" />
                  Publicar Nueva Oferta
                </button>
              ) : (
                <span className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white/80 font-medium">
                  Habilitación en revisión
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Barra de Navegación por Pestañas Segmentadas */}
      <div className="bg-surface border-b border-zinc-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar text-xs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'perfil'}
              onClick={() => setActiveTab('perfil')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'perfil'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-brand-800" />
              <span>Perfil de Empresa</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ofertas'}
              onClick={() => setActiveTab('ofertas')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ofertas'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Briefcase className="w-4 h-4 text-brand-800" />
              <span>Mis Ofertas Laborales</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'ofertas'
                    ? 'bg-brand-100 text-brand-900'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {ofertas.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'candidatos'}
              onClick={() => setActiveTab('candidatos')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'candidatos'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Users className="w-4 h-4 text-brand-800" />
              <span>Candidatos Derivados</span>
              {activeCandidatesCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                  {activeCandidatesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Contenedor de Contenido Principal Full-Width (hasta 1600px) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 w-full flex-1 space-y-6">
        {/* Alerta de Verificación Pendiente */}
        {!isAprobada && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4 text-xs sm:text-sm text-amber-950 shadow-xs">
            <ClockIcon className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="font-bold text-amber-900 text-sm sm:text-base">
                Cuenta en proceso de verificación por la Oficina de Empleo de Funes
              </h2>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                El equipo municipal de intermediación está revisando los datos comerciales de tu empresa (CUIT: <strong>{displayEmpresa?.cuit || 'Pendiente'}</strong>). Una vez confirmada tu habilitación, podrás crear búsquedas laborales y recibir postulantes preseleccionados idóneos.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 1: PERFIL DE EMPRESA                                   */}
        {/* ============================================================== */}
        {activeTab === 'perfil' && (
          <div className="space-y-6 w-full">
            {/* 1. Módulo Maestro de Datos de la Empresa (Full-Width Header Integrado) */}
            <section className="bg-surface border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200/80 bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-900 flex items-center justify-center font-extrabold text-2xl font-sans shadow-xs border border-brand-200 shrink-0">
                    {initialLetter}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-xl sm:text-2xl text-zinc-900 leading-tight font-sans">
                        {empresaNombre}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-brand-800" />
                        {isAprobada ? 'Empresa Habilitada' : 'En Validación Municipal'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>Razón Social: <strong className="text-zinc-700 font-semibold">{displayEmpresa?.razon_social || 'No informada'}</strong></span>
                      <span>•</span>
                      <span>CUIT: <strong className="text-zinc-700 font-semibold tabular-nums">{displayEmpresa?.cuit || 'Pendiente'}</strong></span>
                      <span>•</span>
                      <span>Rubro: <strong className="text-zinc-700 font-semibold">{displayEmpresa?.rubro || 'General'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="min-h-[40px] px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-xs text-zinc-800 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-brand-800" />
                    <span>Editar Datos Comerciales</span>
                  </button>
                </div>
              </div>

              {/* Fila de Datos Rápidos Comerciales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/80 text-xs">
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    Teléfono / WhatsApp
                  </span>
                  <span className="font-bold text-sm text-zinc-900">{displayEmpresa?.telefono || 'No informado'}</span>
                </div>
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3 text-zinc-400" />
                    Correo Electrónico
                  </span>
                  <span className="font-bold text-sm text-zinc-900 truncate">{displayEmpresa?.email_contacto || user?.email || 'No informado'}</span>
                </div>
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    Ubicación en Funes
                  </span>
                  <span className="font-bold text-sm text-zinc-900">{displayEmpresa?.direccion || 'Funes'}, {displayEmpresa?.localidad || 'Funes'}</span>
                </div>
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3 text-zinc-400" />
                    Contacto RRHH
                  </span>
                  <span className="font-bold text-sm text-zinc-900">{displayEmpresa?.persona_contacto || user?.nombre || 'No informado'}</span>
                </div>
              </div>
            </section>

            {/* 2. Módulo de Información Corporativa y Acciones Rápidas (Full-Width) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <section className="lg:col-span-8 bg-surface border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <h3 className="font-bold text-base text-zinc-900 font-sans">
                    Descripción y Actividad Comercial
                  </h3>
                  {displayEmpresa?.sitio_web && (
                    <a
                      href={displayEmpresa.sitio_web}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-brand-800 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Sitio Web
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed font-sans">
                  {displayEmpresa?.descripcion || 'Empresa local radicada o vinculada comercialmente a la ciudad de Funes.'}
                </p>
              </section>

              <section className="lg:col-span-4 bg-surface border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-zinc-900 font-sans">
                  Acciones Rápidas
                </h3>
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={!isAprobada}
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Publicar Nueva Búsqueda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('candidatos')}
                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-brand-800" />
                    <span>Ver Candidatos Derivados</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: MIS OFERTAS LABORALES                               */}
        {/* ============================================================== */}
        {activeTab === 'ofertas' && (
          <div className="bg-white rounded-2xl border border-[#E0E8E1] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF2EE] pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#10231B] font-sans">
                  Mis Búsquedas Laborales
                </h2>
                <p className="text-xs sm:text-sm text-[#4B6256] mt-0.5">
                  Administrá tus avisos de empleo y accedé a los candidatos derivados por la Oficina de Empleo.
                </p>
              </div>

              {isAprobada && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-[#0E4D36] hover:bg-[#06402B] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <PlusIcon className="w-4 h-4" />
                  Nueva Oferta
                </button>
              )}
            </div>

            <CompanyJobsTable
              ofertas={ofertas}
              loading={loadingOfertas}
              onRefresh={loadOfertas}
              onViewCandidates={handleSelectOfertaCandidates}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 3: CANDIDATOS DERIVADOS                                */}
        {/* ============================================================== */}
        {activeTab === 'candidatos' && (
          <div className="bg-white rounded-2xl border border-[#E0E8E1] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF2EE] pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#10231B] font-sans">
                  Candidatos Derivados por la Oficina de Empleo
                </h2>
                <p className="text-xs sm:text-sm text-[#4B6256] mt-0.5">
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

      {/* Modal para Editar Perfil Comercial */}
      {isEditProfileOpen && displayEmpresa && (
        <CompanyProfileEditModal
          isOpen={isEditProfileOpen}
          empresa={displayEmpresa}
          onClose={() => setIsEditProfileOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  );
}
