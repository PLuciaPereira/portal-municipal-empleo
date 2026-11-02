'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
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
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Guardia de coherencia de sesión en el cliente
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login?redirect=/admin');
    }
  }, [isAuthLoading, user, router]);

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
      {/* 1. Header Maestro Institucional Delgado y Nítido */}
      <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white border-b border-brand-950/40 shadow-sm py-3 sm:py-3.5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Lado Izquierdo: Avatar 42px + Chip y Título */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0 shadow-xs p-1">
                <Image
                  src="/escudo-funes-blanco.png"
                  alt="Municipalidad de Funes"
                  width={28}
                  height={28}
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain opacity-95"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/95 text-[11px] font-semibold backdrop-blur-xs leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
                    Oficina de Empleo · Municipalidad de Funes
                  </span>
                </div>

                <div className="flex items-baseline gap-2 truncate">
                  <h1 className="text-lg sm:text-xl lg:text-[22px] font-bold tracking-tight leading-tight text-white font-sans truncate">
                    Panel de Gestión Municipal
                  </h1>
                  <span className="hidden xl:inline text-brand-100/75 text-xs truncate">
                    • Intermediación laboral, moderación de vacantes y padrón de Funes
                  </span>
                </div>
              </div>
            </div>

            {/* Lado Derecho: Botón Sincronizar Accesible */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts}
                className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Sincronizar datos del panel"
                aria-label="Sincronizar datos del panel"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-200 ${
                    loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts
                      ? 'animate-spin'
                      : ''
                  }`}
                />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Barra de Navegación por Pestañas Segmentadas (Con scroll horizontal asistido) */}
      <div className="bg-surface border-b border-zinc-200 shadow-2xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-1 overflow-x-auto py-1.5 scroll-smooth no-scrollbar text-xs" role="tablist">
            
            {/* Ofertas */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ofertas'}
              onClick={() => {
                setActiveTab('ofertas');
                setSelectedOfertaFunnelId(null);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ofertas'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Ofertas laborales</span>
              {counts.ofertasPendientes > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-zinc-900 text-[10px] font-extrabold leading-none">
                  {counts.ofertasPendientes}
                </span>
              )}
            </button>

            {/* Empresas */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'empresas'}
              onClick={() => setActiveTab('empresas')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'empresas'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Validación de empresas</span>
              {counts.empresasPendientes > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-zinc-900 text-[10px] font-extrabold leading-none">
                  {counts.empresasPendientes}
                </span>
              )}
            </button>

            {/* Postulantes */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'postulantes'}
              onClick={() => setActiveTab('postulantes')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'postulantes'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Padrón de postulantes</span>
            </button>

            {/* Registro Asistido */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'registro_asistido'}
              onClick={() => setActiveTab('registro_asistido')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'registro_asistido'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registro asistido</span>
            </button>

            {/* Capacitaciones */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'capacitaciones'}
              onClick={() => setActiveTab('capacitaciones')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'capacitaciones'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Cursos y formación</span>
            </button>

            {/* Estadísticas */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'estadisticas'}
              onClick={() => setActiveTab('estadisticas')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'estadisticas'
                  ? 'bg-emerald-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Estadísticas</span>
            </button>

            {/* Administradores */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'administradores'}
              onClick={() => setActiveTab('administradores')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'administradores'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>Equipo operativo</span>
            </button>

          </div>
        </div>
      </div>

      {/* 3. Contenedor Principal Full-Width (hasta 1600px) */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 w-full space-y-5 flex-1">
        {/* TARJETAS INDICADORAS COMPACTAS (Baja altura ~75-80px, responsive 2 cols móvil / 4 cols desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          
          {/* 1. Ofertas por moderar */}
          <div
            onClick={() => {
              setActiveTab('ofertas');
              setSelectedOfertaFunnelId(null);
            }}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group ${
              counts.ofertasPendientes > 0
                ? 'bg-white border-amber-300 hover:border-amber-400'
                : 'bg-white border-zinc-200/80 hover:border-zinc-300'
            }`}
            title="Ver ofertas pendientes de moderación"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block truncate">
                Ofertas por aprobar
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 tabular-nums leading-none">
                  {counts.ofertasPendientes}
                </span>
                {counts.ofertasPendientes > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Acción requerida
                  </span>
                )}
              </div>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              counts.ofertasPendientes > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200'
            }`}>
              <Briefcase className="w-4 h-4" />
            </div>
          </div>

          {/* 2. Empresas nuevas */}
          <div
            onClick={() => setActiveTab('empresas')}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group ${
              counts.empresasPendientes > 0
                ? 'bg-white border-amber-300 hover:border-amber-400'
                : 'bg-white border-zinc-200/80 hover:border-zinc-300'
            }`}
            title="Ver empresas pendientes de verificación"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block truncate">
                Empresas nuevas
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 tabular-nums leading-none">
                  {counts.empresasPendientes}
                </span>
                {counts.empresasPendientes > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Por verificar
                  </span>
                )}
              </div>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              counts.empresasPendientes > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200'
            }`}>
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          {/* 3. Padrón de Postulantes */}
          <div
            onClick={() => setActiveTab('postulantes')}
            className="p-3 sm:p-3.5 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group"
            title="Ver padrón general de postulantes"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block truncate">
                Postulantes
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 tabular-nums leading-none">
                  {counts.postulantesActivos}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md leading-none border border-emerald-200/60">
                  Padrón Funes
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* 4. Intermediaciones Activas */}
          <div
            onClick={() => {
              setActiveTab('ofertas');
              setSelectedOfertaFunnelId(null);
            }}
            className="p-3 sm:p-3.5 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group"
            title="Candidatos en proceso de derivación o entrevista"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block truncate">
                Intermediaciones
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 tabular-nums leading-none">
                  {counts.intermediacionesActivas}
                </span>
                <span className="text-[10px] font-bold text-brand-900 bg-brand-50 px-1.5 py-0.5 rounded-md leading-none border border-brand-200/60">
                  En circuito
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

        </div>

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
                      Moderación y publicación de ofertas laborales
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
                  Habilitación y control de empresas
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
                  Padrón general de postulantes de Funes
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
