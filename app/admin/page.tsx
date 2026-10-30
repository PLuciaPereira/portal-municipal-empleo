'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  GraduationCap,
  UserCog,
  RefreshCw,
  Check,
  Sparkles,
  TrendingUp,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { Empresa } from '@/types/database';
import {
  getEmpresasAdmin,
  getOfertasAdmin,
  getPostulantesAdmin,
  getAdminCounts,
  AdminCounts,
  OfertaAdminItem,
  PostulanteAdminItem,
} from '@/lib/admin';
import { CompaniesTable } from '@/components/admin/CompaniesTable';
import { AdminJobsTable } from '@/components/admin/AdminJobsTable';
import { ApplicantsTable } from '@/components/admin/ApplicantsTable';
import { IntermediationFunnel } from '@/components/admin/IntermediationFunnel';
import { CoursesManager } from '@/components/admin/CoursesManager';
import { AdminsManager } from '@/components/admin/AdminsManager';
import { AdminStatsView } from '@/components/admin/AdminStatsView';
import { ManualProfileRegister } from '@/components/admin/ManualProfileRegister';

type AdminTab = 'ofertas' | 'empresas' | 'postulantes' | 'registro_asistido' | 'capacitaciones' | 'administradores' | 'estadisticas';

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page flex items-center justify-center p-8 text-zinc-500 font-sans text-sm">Cargando panel de gestión...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: AdminTab[] = [
      'ofertas',
      'empresas',
      'postulantes',
      'registro_asistido',
      'capacitaciones',
      'administradores',
      'estadisticas',
    ];
    if (tabParam && validTabs.includes(tabParam as AdminTab)) {
      return tabParam as AdminTab;
    }
    return 'ofertas';
  });
  const [selectedOfertaFunnelId, setSelectedOfertaFunnelId] = useState<string | null>(null);

  const [counts, setCounts] = useState<AdminCounts>({
    empresasPendientes: 0,
    ofertasPendientes: 0,
    postulantesActivos: 0,
    intermediacionesActivas: 0,
  });

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const [ofertas, setOfertas] = useState<OfertaAdminItem[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(true);

  const [postulantes, setPostulantes] = useState<PostulanteAdminItem[]>([]);
  const [loadingPostulantes, setLoadingPostulantes] = useState(true);

  const [refreshingCounts, setRefreshingCounts] = useState(false);

  // Sincronizar activeTab cuando cambia el query param (ej. enlaces de notificación)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: AdminTab[] = [
      'ofertas',
      'empresas',
      'postulantes',
      'registro_asistido',
      'capacitaciones',
      'administradores',
      'estadisticas',
    ];
    if (tabParam && validTabs.includes(tabParam as AdminTab)) {
      setActiveTab(tabParam as AdminTab);
    }
  }, [searchParams]);

  // Cargar contadores globales
  const loadCounts = useCallback(async () => {
    setRefreshingCounts(true);
    const data = await getAdminCounts();
    setCounts(data);
    setRefreshingCounts(false);
  }, []);

  // Cargar empresas
  const loadEmpresas = useCallback(async () => {
    setLoadingEmpresas(true);
    const res = await getEmpresasAdmin();
    if (res.data) {
      setEmpresas(res.data);
    }
    setLoadingEmpresas(false);
  }, []);

  // Cargar ofertas
  const loadOfertas = useCallback(async () => {
    setLoadingOfertas(true);
    const res = await getOfertasAdmin();
    if (res.data) {
      setOfertas(res.data);
    }
    setLoadingOfertas(false);
  }, []);

  // Cargar postulantes
  const loadPostulantes = useCallback(async () => {
    setLoadingPostulantes(true);
    const res = await getPostulantesAdmin();
    if (res.data) {
      setPostulantes(res.data);
    }
    setLoadingPostulantes(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isMounted) return;
      await Promise.all([
        loadCounts(),
        loadEmpresas(),
        loadOfertas(),
        loadPostulantes(),
      ]);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [loadCounts, loadEmpresas, loadOfertas, loadPostulantes]);

  const handleRefreshAll = () => {
    void loadCounts();
    void loadEmpresas();
    void loadOfertas();
    void loadPostulantes();
  };

  return (
    <div className="min-h-screen bg-page text-foreground flex flex-col font-sans">
      {/* 1. Header Maestro Delgado: 72px de Alto con Indicadores Integrados */}
      <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white border-b border-brand-950/40 shadow-sm py-3 sm:py-3.5 min-h-[72px] flex items-center">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            
            {/* Lado Izquierdo: Avatar 44px + Chip y Título en 22px */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar cuadrado de 44 px institucional */}
              <div className="w-[44px] h-[44px] rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0 shadow-xs p-1">
                <Image
                  src="/escudo-funes-blanco.png"
                  alt="Municipalidad de Funes"
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain opacity-95"
                />
              </div>

              <div className="min-w-0 flex-1">
                {/* Chip identificador a 11.5 px */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/95 text-[11.5px] font-semibold backdrop-blur-xs leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
                    Oficina de Empleo · Municipalidad de Funes
                  </span>
                </div>

                {/* Título y descripción compacta */}
                <div className="flex items-baseline gap-2 truncate">
                  <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight leading-tight text-white font-sans truncate">
                    Panel de Gestión y Moderación Municipal
                  </h1>
                  <span className="hidden xl:inline text-brand-100/80 text-xs truncate">
                    • Intermediación laboral, moderación de vacantes y padrón general de Funes.
                  </span>
                </div>
              </div>
            </div>

            {/* Lado Derecho: Indicadores discretos en fila + botón sincronizar de solo ícono */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 shrink-0 self-start lg:self-auto">
              <div className="flex items-center bg-black/15 border border-white/10 rounded-xl px-2 h-10 shadow-2xs">
                
                {/* 1. Ofertas por aprobar */}
                <div
                  onClick={() => setActiveTab('ofertas')}
                  className="flex flex-col justify-center px-3 cursor-pointer hover:opacity-90 transition-opacity relative border-r border-white/12 h-full"
                  title="Ver ofertas pendientes de moderación"
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[17px] sm:text-[18px] font-extrabold text-white leading-none font-sans tabular-nums">
                      {counts.ofertasPendientes}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-200/90 whitespace-nowrap">
                      Ofertas por aprobar
                    </span>
                  </div>
                  {counts.ofertasPendientes > 0 && (
                    <div className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-300 leading-none mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]"></span>
                      <span>Acción requerida</span>
                    </div>
                  )}
                </div>

                {/* 2. Empresas nuevas */}
                <div
                  onClick={() => setActiveTab('empresas')}
                  className="flex flex-col justify-center px-3 cursor-pointer hover:opacity-90 transition-opacity relative border-r border-white/12 h-full"
                  title="Ver empresas pendientes de verificación"
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[17px] sm:text-[18px] font-extrabold text-white leading-none font-sans tabular-nums">
                      {counts.empresasPendientes}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-200/90 whitespace-nowrap">
                      Empresas nuevas
                    </span>
                  </div>
                  {counts.empresasPendientes > 0 && (
                    <div className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-300 leading-none mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]"></span>
                      <span>Acción requerida</span>
                    </div>
                  )}
                </div>

                {/* 3. Padrón de postulantes */}
                <div
                  onClick={() => setActiveTab('postulantes')}
                  className="flex flex-col justify-center px-3 cursor-pointer hover:opacity-90 transition-opacity relative border-r border-white/12 h-full"
                  title="Ver padrón general de postulantes"
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[17px] sm:text-[18px] font-extrabold text-white leading-none font-sans tabular-nums">
                      {counts.postulantesActivos}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-200/90 whitespace-nowrap">
                      Postulantes
                    </span>
                  </div>
                </div>

                {/* 4. Intermediaciones activas */}
                <div
                  onClick={() => setActiveTab('ofertas')}
                  className="flex flex-col justify-center px-3 cursor-pointer hover:opacity-90 transition-opacity h-full"
                  title="Candidatos en proceso de derivación o entrevista"
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[17px] sm:text-[18px] font-extrabold text-white leading-none font-sans tabular-nums">
                      {counts.intermediacionesActivas}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-200/90 whitespace-nowrap">
                      Intermediaciones
                    </span>
                  </div>
                </div>

              </div>

              {/* Botón Sincronizar solo con ícono (40px) */}
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                title="Sincronizar Panel de Gestión"
                aria-label="Sincronizar Panel de Gestión"
              >
                <RefreshCw
                  className={`w-4 h-4 text-emerald-100 ${
                    loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Barra de Navegación por Pestañas Segmentadas Integrada */}
      <div className="bg-surface border-b border-zinc-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar text-xs" role="tablist">
            
            {/* Ofertas */}
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
              <span>Ofertas Laborales</span>
            </button>

            {/* Empresas */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'empresas'}
              onClick={() => setActiveTab('empresas')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'empresas'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-brand-800" />
              <span>Validación de Empresas</span>
            </button>

            {/* Postulantes */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'postulantes'}
              onClick={() => setActiveTab('postulantes')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'postulantes'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Users className="w-4 h-4 text-brand-800" />
              <span>Padrón de Postulantes</span>
            </button>

            {/* Registro Asistido */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'registro_asistido'}
              onClick={() => setActiveTab('registro_asistido')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'registro_asistido'
                  ? 'border-emerald-700 text-emerald-900 font-extrabold bg-emerald-50/60'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Registro Asistido</span>
            </button>
            {/* Capacitaciones */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'capacitaciones'}
              onClick={() => setActiveTab('capacitaciones')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'capacitaciones'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-zinc-600" />
              <span>Cursos y Formación</span>
            </button>

            {/* Estadísticas */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'estadisticas'}
              onClick={() => setActiveTab('estadisticas')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'estadisticas'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Estadísticas</span>
            </button>
            {/* Administradores */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'administradores'}
              onClick={() => setActiveTab('administradores')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'administradores'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <UserCog className="w-4 h-4 text-zinc-600" />
              <span>Equipo Operativo</span>
            </button>

          </div>
        </div>
      </div>

      {/* 3. Contenedor Principal Full-Width (hasta 1600px) */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 w-full space-y-6 flex-1">

        {/* ============================================================== */}
        {/* SECCIÓN 1: OFERTAS LABORALES Y FUNNEL DE DERIVACIÓN            */}
        {/* ============================================================== */}
        {activeTab === 'ofertas' && (
          <div className="space-y-4">
            {selectedOfertaFunnelId ? (
              (() => {
                const selectedOferta = ofertas.find(
                  (o) => o.id === selectedOfertaFunnelId
                );
                if (!selectedOferta) {
                  return (
                    <div className="p-8 text-center text-xs text-zinc-500 bg-surface rounded-2xl border border-zinc-200">
                      Oferta no encontrada.
                      <button
                        onClick={() => setSelectedOfertaFunnelId(null)}
                        className="ml-2 font-bold text-brand-900 underline cursor-pointer"
                      >
                        Volver
                      </button>
                    </div>
                  );
                }
                return (
                  <IntermediationFunnel
                    oferta={selectedOferta}
                    onBack={() => {
                      setSelectedOfertaFunnelId(null);
                      void loadOfertas();
                    }}
                    onUpdated={() => {
                      void loadOfertas();
                      void loadCounts();
                    }}
                  />
                );
              })()
            ) : (
              <>


                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                      Moderación y Publicación de Ofertas Laborales
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Revise las vacantes cargadas por las empresas, autorice su publicación en el catálogo público o gestione el embudo de postulaciones recibidas.
                    </p>
                  </div>
                </div>

                <AdminJobsTable
                  ofertas={ofertas}
                  postulantesDisponibles={postulantes}
                  loading={loadingOfertas}
                  onRefresh={() => {
                    void loadOfertas();
                    void loadCounts();
                  }}
                  onSelectOfertaPostulaciones={(ofertaId: string) => {
                    setSelectedOfertaFunnelId(ofertaId);
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 2: EMPRESAS                                            */}
        {/* ============================================================== */}
        {activeTab === 'empresas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                  Habilitación y Control de Empresas
                </h2>
                <p className="text-xs text-zinc-500">
                  Verifique las razones sociales, CUIT y habilitaciones de las firmas que solicitan publicar ofertas en la ciudad de Funes.
                </p>
              </div>
            </div>

            <CompaniesTable
              empresas={empresas}
              loading={loadingEmpresas}
              onRefresh={() => {
                void loadEmpresas();
                void loadCounts();
              }}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 3: POSTULANTES (Padrón Municipal)                      */}
        {/* ============================================================== */}
        {activeTab === 'postulantes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                  Padrón General de Postulantes de Funes
                </h2>
                <p className="text-xs text-zinc-500">
                  Explore la base de datos municipal, encuentre perfiles según sus características y consulte sus legajos laborales y currículums digitales.
                </p>
              </div>
            </div>

            <ApplicantsTable
              postulantes={postulantes}
              ofertasDisponibles={ofertas}
              loading={loadingPostulantes}
              onRefresh={loadPostulantes}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 4: REGISTRO ASISTIDO (Presencial en Oficina)           */}
        {/* ============================================================== */}
        {activeTab === 'registro_asistido' && (
          <div className="-mt-2 sm:-mt-4">
            <ManualProfileRegister
              onCreated={() => {
                void loadPostulantes();
                void loadCounts();
              }}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 5: CAPACITACIONES                                      */}
        {/* ============================================================== */}
        {activeTab === 'capacitaciones' && (
          <CoursesManager />
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 6: ESTADÍSTICAS (Métricas y Reportes)                  */}
        {/* ============================================================== */}
        {activeTab === 'estadisticas' && (
          <AdminStatsView />
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 7: ADMINISTRADORES                                     */}
        {/* ============================================================== */}
        {activeTab === 'administradores' && (
          <AdminsManager />
        )}

      </main>
    </div>
  );
}
