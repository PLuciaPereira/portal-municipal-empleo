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
import { AdminHomeView, AdminTab } from '@/components/admin/AdminHomeView';
import { AdminNewApplicationsView } from '@/components/admin/AdminNewApplicationsView';

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
      'inicio',
      'nuevas_postulaciones',
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
    return 'inicio';
  });
  const [selectedOfertaFunnelId, setSelectedOfertaFunnelId] = useState<string | null>(null);

  const [counts, setCounts] = useState<AdminCounts>({
    empresasPendientes: 0,
    ofertasPendientes: 0,
    postulantesActivos: 0,
    intermediacionesActivas: 0,
    postulacionesNuevas: 0,
  });

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const [ofertas, setOfertas] = useState<OfertaAdminItem[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(true);

  const [postulantes, setPostulantes] = useState<PostulanteAdminItem[]>([]);
  const [loadingPostulantes, setLoadingPostulantes] = useState(true);

  // Sincronizar activeTab cuando cambia el query param (ej. enlaces de notificación)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: AdminTab[] = [
      'inicio',
      'nuevas_postulaciones',
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
    } else if (!tabParam) {
      setActiveTab('inicio');
    }
  }, [searchParams]);

  // Cargar contadores globales
  const loadCounts = useCallback(async () => {
    const data = await getAdminCounts();
    setCounts(data);
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

  const handleNavigateTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSelectedOfertaFunnelId(null);
    router.push(`/admin?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-page text-foreground flex flex-col font-sans">
      {/* 1. Header Maestro Institucional Delgado y Nítido (Exclusivo en Inicio) */}
      {activeTab === 'inicio' && (
        <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white border-b border-brand-950/40 shadow-sm py-3.5 sm:py-4">
          <div className="max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/95 text-[11px] font-semibold backdrop-blur-xs leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
                      Oficina de Empleo · Municipalidad de Funes
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 truncate">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight text-white font-sans truncate">
                      Panel de Gestión Municipal
                    </h1>
                    <span className="hidden xl:inline text-brand-100/75 text-xs truncate">
                      • Intermediación laboral, moderación de vacantes y padrón de Funes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Contenedor Principal Full-Width (hasta 1720px) */}
      <main className="max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 sm:py-6 w-full space-y-5 flex-1">
        {/* ============================================================== */}
        {/* SECCIÓN 0: INICIO / DASHBOARD PRINCIPAL DE ENTRADA              */}
        {/* ============================================================== */}
        {activeTab === 'inicio' && (
          <AdminHomeView
            counts={counts}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {/* ============================================================== */}
        {/* SECCIÓN NUEVAS POSTULACIONES: GESTIÓN RÁPIDA Y DERIVACIÓN      */}
        {/* ============================================================== */}
        {activeTab === 'nuevas_postulaciones' && (
          <AdminNewApplicationsView
            onRefreshCounts={() => {
              void loadCounts();
            }}
            onNavigateToOferta={(ofertaId) => {
              setSelectedOfertaFunnelId(ofertaId);
              setActiveTab('ofertas');
              router.push('/admin?tab=ofertas');
            }}
          />
        )}

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
