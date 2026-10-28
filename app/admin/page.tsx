'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  GraduationCap,
  UserCog,
  RefreshCw,
  Check,
  TrendingUp,
  UserPlus,
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
  const [activeTab, setActiveTab] = useState<AdminTab>('ofertas');
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
    void init();
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
    <div className="min-h-screen bg-[#F8FAF8] text-[#10231B]">
      {/* 1. Banda Verde Superior Institucional Funes */}
      <section className="bg-gradient-to-r from-[#06402B] to-[#0A3D2A] text-white pt-10 pb-9 border-b border-[#04281B]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-[780px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDEFE3]/20 border border-[#DDEFE3]/30 text-[#E8F5EE] text-xs font-semibold">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#DDEFE3] text-[#06402B] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  Oficina de Empleo · Municipalidad de Funes
                </span>
              </div>

              <h1 className="mt-2.5 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white font-display">
                Panel de Gestión Municipal
              </h1>

              <p className="mt-2 text-[#D6EADD] text-sm sm:text-base leading-relaxed max-w-[680px]">
                Supervisión institucional de vacantes laborales, validación formal de empresas y derivación transparente de postulantes con prioridad para residentes de Funes.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts}
                className="min-h-[46px] px-5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                title="Actualizar datos en tiempo real"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#D6EADD] ${
                    loadingEmpresas || loadingOfertas || loadingPostulantes || refreshingCounts
                      ? 'animate-spin'
                      : ''
                  }`}
                />
                <span>Sincronizar Datos</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Barra de Navegación por Pestañas (Sticky Sub-nav en Cápsula) */}
      <div className="bg-white border-b border-[#E0E8E1] sticky top-16 z-30 shadow-2xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar" role="tablist">
            
            {/* Ofertas */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ofertas'}
              onClick={() => setActiveTab('ofertas')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ofertas'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Ofertas Laborales</span>
              {counts.ofertasPendientes > 0 ? (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    activeTab === 'ofertas'
                      ? 'bg-[#F2B84B] text-[#2B1D00]'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {counts.ofertasPendientes} por revisar
                </span>
              ) : (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'ofertas'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#DDEFE3] text-[#0A3D2A]'
                  }`}
                >
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
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'empresas'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Validación Empresas</span>
              {counts.empresasPendientes > 0 ? (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'empresas'
                      ? 'bg-[#F2B84B] text-[#2B1D00]'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {counts.empresasPendientes} pendientes
                </span>
              ) : (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'empresas'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#DDEFE3] text-[#0A3D2A]'
                  }`}
                >
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
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'postulantes'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Padrón de Postulantes</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'postulantes'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#DDEFE3] text-[#0A3D2A]'
                }`}
              >
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
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'capacitaciones'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Cursos & Formación</span>
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
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'administradores'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <UserCog className="w-4 h-4" />
              <span>Equipo & Roles</span>
            </button>

          </div>
        </div>
      </div>

      {/* 3. Contenedor Principal con KPIs y Contenido */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 w-full space-y-7">
        
        {/* Tarjetas de Métricas de Intermediación (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card Ofertas por Revisar */}
          <div
            onClick={() => setActiveTab('ofertas')}
            className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs hover:border-[#0E4D36] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
                Ofertas por Aprobar
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                {counts.ofertasPendientes}
              </span>
              {counts.ofertasPendientes > 0 ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900">
                  Requiere acción
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#DDEFE3] text-[#06402B]">
                  Al día
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Búsquedas creadas esperando publicación</p>
          </div>

          {/* Card Empresas Pendientes */}
          <div
            onClick={() => setActiveTab('empresas')}
            className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs hover:border-[#0E4D36] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
                Empresas Nuevas
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                {counts.empresasPendientes}
              </span>
              {counts.empresasPendientes > 0 ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-100 text-sky-900">
                  Validar CUIT
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#DDEFE3] text-[#06402B]">
                  Al día
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Registros comerciales por habilitar</p>
          </div>

          {/* Card Postulantes Activos */}
          <div
            onClick={() => setActiveTab('postulantes')}
            className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs hover:border-[#0E4D36] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
                Padrón de Postulantes
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#DDEFE3] text-[#06402B] flex items-center justify-center border border-[#A7D7B9] group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                {counts.postulantesActivos}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#DDEFE3] text-[#06402B]">
                Prioridad Funes
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Vecinos con legajo laboral activo</p>
          </div>

          {/* Card Intermediaciones Activas */}
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
                Intermediaciones
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/60">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                {counts.intermediacionesActivas}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-900">
                En derivación
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Candidatos presentados formalmente</p>
          </div>

        </div>

        {/* Contenido de la Pestaña Activa: POSTULANTES (7.3) */}
        {activeTab === 'postulantes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  Padrón General de Postulantes
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

        {/* Contenido de la Pestaña Activa: OFERTAS (7.2 y 7.4) */}
        {activeTab === 'ofertas' && (
          <div className="space-y-4">
            {selectedOfertaFunnelId ? (
              (() => {
                const selectedOferta = ofertas.find(
                  (o) => o.id === selectedOfertaFunnelId
                );
                if (!selectedOferta) {
                  return (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      Oferta no encontrada.
                      <button
                        onClick={() => setSelectedOfertaFunnelId(null)}
                        className="ml-2 font-bold text-brand-900 underline"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">
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

        {/* Contenido de la Pestaña Activa: EMPRESAS (7.1) */}
        {activeTab === 'empresas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
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

        {/* Contenido de la Pestaña Activa: REGISTRO ASISTIDO */}
        {activeTab === 'registro_asistido' && (
          <ManualProfileRegister
            onCreated={() => {
              void loadPostulantes();
              void loadCounts();
            }}
          />
        )}

        {/* Contenido de la Pestaña Activa: CAPACITACIONES (7.5) */}
        {activeTab === 'capacitaciones' && (
          <CoursesManager />
        )}

        {/* Contenido de la Pestaña Activa: ESTADÍSTICAS (Fase 8) */}
        {activeTab === 'estadisticas' && (
          <AdminStatsView />
        )}

        {/* Contenido de la Pestaña Activa: ADMINISTRADORES (7.6) */}
        {activeTab === 'administradores' && (
          <AdminsManager />
        )}

      </main>
    </div>
  );
}
