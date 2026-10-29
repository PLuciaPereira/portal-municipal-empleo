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
      {/* 1. Header Maestro Institucional Full-Width */}
      <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white border-b border-brand-950/40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-[860px]">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 border border-white/15 text-white/95 text-xs font-semibold backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Oficina de Empleo · Municipalidad de Funes
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-brand-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  Intermediación Pública y Gratuita
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white font-sans">
                Panel de Gestión y Moderación Municipal
              </h1>

              <p className="mt-2 text-brand-100/90 text-xs sm:text-sm lg:text-base leading-relaxed">
                Supervisión centralizada de ofertas de empleo, validación comercial de empresas y derivación directa de postulantes idóneos con prioridad comunitaria para residentes de Funes.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts}
                className="min-h-[42px] px-4.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Actualizar datos y métricas en tiempo real"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-brand-200 ${
                    loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts
                      ? 'animate-spin'
                      : ''
                  }`}
                />
                <span>Sincronizar Panel</span>
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
              {counts.ofertasPendientes > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-900 border border-amber-200/80">
                  {counts.ofertasPendientes} por revisar
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-100 text-zinc-700">
                  {ofertas.length}
                </span>
              )}
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
              {counts.empresasPendientes > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-900 border border-amber-200/80">
                  {counts.empresasPendientes} pendientes
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-100 text-zinc-700">
                  {empresas.length}
                </span>
              )}
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
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-100 text-brand-900">
                {counts.postulantesActivos}
              </span>
            </button>

            {/* Registro Asistido */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'registro_asistido'}
              onClick={() => setActiveTab('registro_asistido')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'registro_asistido'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
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
                {/* Resumen Operativo de Métricas Clave (Solo en Vista Principal de Ofertas) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Resumen Operativo Municipal
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('estadisticas')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 hover:text-brand-950 transition-colors cursor-pointer group"
                    >
                      <span>Ver estadísticas completas</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

{/* Ribbon Unificado de KPIs Operativos (Superficie continua sin tarjetas flotantes separadas) */}
        <div className="bg-surface border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/80">
            
            {/* KPI 1: Ofertas por Aprobar */}
            <div
              onClick={() => setActiveTab('ofertas')}
              className="p-5 flex items-center justify-between hover:bg-zinc-50/80 transition-colors cursor-pointer group"
            >
              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Ofertas por Aprobar
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight tabular-nums font-sans">
                    {counts.ofertasPendientes}
                  </span>
                  {counts.ofertasPendientes > 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900">
                      Requiere acción
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-900">
                      Al día
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Búsquedas creadas esperando publicación</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 2: Empresas Nuevas */}
            <div
              onClick={() => setActiveTab('empresas')}
              className="p-5 flex items-center justify-between hover:bg-zinc-50/80 transition-colors cursor-pointer group"
            >
              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Empresas Nuevas
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight tabular-nums font-sans">
                    {counts.empresasPendientes}
                  </span>
                  {counts.empresasPendientes > 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-100 text-sky-900">
                      Validar CUIT
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-900">
                      Al día
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Registros comerciales por habilitar</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 3: Padrón de Postulantes */}
            <div
              onClick={() => setActiveTab('postulantes')}
              className="p-5 flex items-center justify-between hover:bg-zinc-50/80 transition-colors cursor-pointer group"
            >
              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Padrón de Postulantes
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight tabular-nums font-sans">
                    {counts.postulantesActivos}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-900">
                    Prioridad Funes
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Vecinos con legajo laboral activo</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center border border-brand-200/60 group-hover:scale-105 transition-transform shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 4: Intermediaciones Activas */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Intermediaciones Activas
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight tabular-nums font-sans">
                    {counts.intermediacionesActivas}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900">
                    En derivación
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Candidatos presentados formalmente</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/60 shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
              </div>
            </div>

          </div>
                </div>
              </div>

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
                  Consulte la base de datos municipal, filtre por localidad o estudios y acceda a los legajos laborales y currículums digitales.
                </p>
              </div>
            </div>

            <ApplicantsTable
              postulantes={postulantes}
              loading={loadingPostulantes}
              onRefresh={loadPostulantes}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 4: REGISTRO ASISTIDO (Presencial en Oficina)           */}
        {/* ============================================================== */}
        {activeTab === 'registro_asistido' && (
          <ManualProfileRegister
            onCreated={() => {
              void loadPostulantes();
              void loadCounts();
            }}
          />
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
