'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheckIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
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
  Sparkles, Camera,
  Lock,
} from 'lucide-react';

type TabKey = 'perfil' | 'ofertas' | 'candidatos';

export default function EmpresaDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page flex items-center justify-center p-8 text-zinc-500 font-sans text-sm">Cargando panel...</div>}>
      <EmpresaDashboardContent />
    </Suspense>
  );
}

function EmpresaDashboardContent() {
  const { user, empresa: authEmpresa, refreshUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Guardia de coherencia de sesión en el cliente
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/empresa");
    }
  }, [authLoading, user, router]);
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'ofertas' || tabParam === 'candidatos' || tabParam === 'perfil') {
      return tabParam;
    }
    return 'perfil';
  });
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
  const estado = displayEmpresa?.estado ?? null;
  const isAprobada = estado === 'aprobada';
  const isPendiente = estado === 'pendiente';
  const isRechazada = estado === 'rechazada';
  const isStateReady = !authLoading && Boolean(displayEmpresa);

  const [loadingOfertas, setLoadingOfertas] = useState(() => isAprobada);
  const [loadingCandidatos, setLoadingCandidatos] = useState(() => isAprobada);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isReenvioModal, setIsReenvioModal] = useState(false);

  // Reaccionar a cambios en query param ?tab= y ?candidatoId= (ej. enlaces directos desde notificaciones)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const candidatoIdParam = searchParams.get('candidatoId');

    // Si viene candidatoId o tab=candidatos, abrir directamente la pestaña de candidatos
    if (candidatoIdParam || tabParam === 'candidatos') {
      setActiveTab('candidatos');
    } else if (tabParam === 'ofertas' || tabParam === 'perfil') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const targetCandidatoId = searchParams.get('candidatoId');

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
    // Protección adicional en frontend: verificar que la oferta no esté pendiente de revisión
    const targetJob = ofertas.find((o) => o.id === ofertaId);
    if (targetJob && targetJob.estado === 'pendiente_revision') {
      return;
    }
    setFilterOfertaId(ofertaId);
    setActiveTab('candidatos');
    loadCandidatos(ofertaId);
  };

  const handleClearCandidatesFilter = () => {
    setFilterOfertaId(null);
    loadCandidatos();
  };

  
  const handleDirectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !displayEmpresa?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('El logotipo no debe superar los 2MB.');
      return;
    }

    try {
      const { subirLogoEmpresa } = await import('@/lib/empresa');
      const res = await subirLogoEmpresa(displayEmpresa.id, file);
      if (res.error) {
        alert(res.error);
      } else {
        await handleProfileSaved();
      }
    } catch (err) {
      alert('Error al subir el logo.');
    }
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
      {/* 1. Banda Verde Superior Institucional Funes Compacta */}
      <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white border-b border-brand-950/40 shadow-sm py-4 sm:py-5 min-h-[72px] flex items-center">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Lado Izquierdo: Avatar con botón de cámara + Info en varias líneas organizadas */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            {/* Avatar Cuadrado redondeado con botón de cámara integrado */}
            <div className="relative w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] shrink-0 group">
              {displayEmpresa?.logo_url ? (
                <img
                  src={displayEmpresa.logo_url}
                  alt={empresaNombre}
                  className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-xl object-contain bg-white p-1 border border-white/20 shadow-xs"
                />
              ) : (
                <div className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-extrabold text-lg sm:text-xl shrink-0 shadow-xs">
                  {initialLetter}
                </div>
              )}
              <label
                title="Subir o cambiar logo institucional directamente"
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center shadow hover:bg-brand-800 transition-transform active:scale-95 border border-white cursor-pointer"
              >
                <Camera className="w-2.5 h-2.5" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleDirectLogoUpload}
                />
              </label>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {/* Chip sobre el nombre */}
              <div className="flex flex-wrap items-center gap-2">
                {!isStateReady ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/70 text-[11.5px] font-semibold leading-none animate-pulse">
                    Comprobando estado...
                  </span>
                ) : isAprobada ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/95 text-[11.5px] font-semibold backdrop-blur-xs leading-none">
                    <Check className="w-3 h-3 stroke-[3] text-emerald-300" />
                    Empresa Habilitada por la Oficina de Empleo de Funes
                  </span>
                ) : isRechazada ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[11.5px] font-semibold leading-none">
                    <XCircleIcon className="w-3 h-3 text-rose-300" />
                    Solicitud de habilitación observada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11.5px] font-semibold leading-none">
                    <ClockIcon className="w-3 h-3 text-amber-300" />
                    Pendiente de aprobación municipal
                  </span>
                )}
              </div>

              {/* Nombre de empresa grande */}
              <div>
                <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold tracking-tight leading-tight text-white font-sans">
                  {empresaNombre}
                </h1>
              </div>

              {/* Debajo del nombre: Razón social, CUIT y Rubro al 86% de opacidad */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/86 text-[14px]">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>{displayEmpresa?.razon_social || 'Empresa Funes SRL'}</span>
                </span>
                <span className="text-white/30 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span className="tabular-nums">{displayEmpresa?.cuit || '30-71234567-8'}</span>
                </span>
                <span className="text-white/30 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>{displayEmpresa?.rubro || 'Comercio'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Lado Derecho: Botón de Acción Compacto */}
          <div className="shrink-0 flex items-center gap-3 pt-2 md:pt-0">
            {isAprobada ? (
              <Link
                href="/empresa/ofertas/nueva"
                className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer w-full sm:w-auto shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5 stroke-[2.4]" />
                Publicar nueva oferta
              </Link>
            ) : isRechazada ? (
              <span className="h-10 px-4 rounded-xl bg-rose-500/20 border border-rose-400/30 text-xs text-rose-200 font-semibold inline-flex items-center justify-center gap-1.5 w-full sm:w-auto">
                <XCircleIcon className="w-3.5 h-3.5 text-rose-300" />
                Publicación no habilitada
              </span>
            ) : (
              <span className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-xs text-white/80 font-medium inline-flex items-center justify-center w-full sm:w-auto">
                {isStateReady ? 'Habilitación en revisión' : 'Comprobando habilitación...'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Alerta destacada si hay candidatos derivados sin gestionar (Compacta, sin ícono y con padding alineado) */}
      {isAprobada && activeCandidatesCount > 0 && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 sm:px-6 lg:px-8 xl:px-10 py-2">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-medium text-amber-900">
              <span>
                Tenés <strong>{activeCandidatesCount} candidato{activeCandidatesCount === 1 ? '' : 's'} derivado{activeCandidatesCount === 1 ? '' : 's'}</strong> por la Oficina de Empleo pendiente{activeCandidatesCount === 1 ? '' : 's'} de revisión y coordinación de entrevista.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('candidatos')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 shrink-0 text-left sm:text-right cursor-pointer"
            >
              Revisar candidatos ahora &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 2. Barra de Navegación por Pestañas Segmentadas (Estilo unificado con Admin) */}
      <div className="bg-surface border-b border-zinc-200 shadow-2xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-1 overflow-x-auto py-1.5 scroll-smooth no-scrollbar text-xs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'perfil'}
              onClick={() => setActiveTab('perfil')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Perfil de empresa</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ofertas'}
              onClick={() => setActiveTab('ofertas')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ofertas'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Mis ofertas laborales</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'candidatos'}
              onClick={() => setActiveTab('candidatos')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'candidatos'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Candidatos derivados</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Contenedor de Contenido Principal Full-Width (hasta 1600px) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 w-full flex-1 space-y-6">
        {/* Avisos de Estado Diferenciados (Neutro durante carga para evitar parpadeo) */}
        {!isStateReady ? null : isRechazada ? (
          <div className="mb-6 p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs sm:text-sm text-rose-950 shadow-xs">
            <div className="flex items-start gap-3.5">
              <XCircleIcon className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-rose-900 text-sm sm:text-base">
                    Solicitud de habilitación observada / rechazada
                  </h2>
                </div>
                {displayEmpresa?.motivo_rechazo && (
                  <p className="text-xs text-rose-900 bg-white/80 p-2.5 rounded-xl border border-rose-200/90 leading-relaxed font-sans">
                    <strong>Motivo informado por la Oficina de Empleo:</strong> {displayEmpresa.motivo_rechazo}
                  </p>
                )}
                <p className="text-xs text-rose-800 leading-relaxed">
                  Podés revisar y corregir tus datos comerciales para volver a solicitar la habilitación municipal ante la Oficina de Empleo.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={() => {
                  setIsReenvioModal(true);
                  setIsEditProfileOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Corregir datos y reenviar solicitud</span>
              </button>
            </div>
          </div>
        ) : isPendiente ? (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 text-xs sm:text-sm text-amber-950 shadow-xs">
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
        ) : null}

        {/* ============================================================== */}
        {/* PESTAÑA 1: PERFIL DE EMPRESA (HOJA CONTINUA - FULL WIDTH)      */}
        {/* ============================================================== */}
        {activeTab === 'perfil' && (
          <div className="w-full bg-surface border border-zinc-200/90 rounded-2xl shadow-xs divide-y divide-zinc-200/80 overflow-hidden">
            {/* Canales de contacto y radicación (4 columnas integradas en la hoja ATS) con acción de editar */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Canales de contacto y radicación
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="h-8.5 px-3.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-xs text-zinc-700 transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
                  aria-label="Editar ficha comercial"
                >
                  <Edit3 className="w-3.5 h-3.5 text-brand-800" />
                  <span>Editar ficha comercial</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Teléfono / WhatsApp</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                    <Phone className="w-4 h-4 text-brand-800 shrink-0" />
                    <span>{displayEmpresa?.telefono || 'No informado'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Correo electrónico RRHH</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                    <Mail className="w-4 h-4 text-brand-800 shrink-0" />
                    <span className="truncate">{displayEmpresa?.email_contacto || user?.email || 'No informado'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Ubicación en Funes</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                    <MapPin className="w-4 h-4 text-brand-800 shrink-0" />
                    <span>{displayEmpresa?.direccion || 'Funes'}, {displayEmpresa?.localidad || 'Funes'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Responsable comercial</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                    <Users className="w-4 h-4 text-brand-800 shrink-0" />
                    <span>{displayEmpresa?.persona_contacto || user?.nombre || 'No informado'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Descripción y actividad comercial */}
            <div className="p-6 sm:p-8 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Descripción y actividad comercial
                </h3>
                {displayEmpresa?.sitio_web && (
                  <a
                    href={displayEmpresa.sitio_web}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-brand-800 hover:underline flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Sitio web institucional
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-zinc-700 leading-relaxed font-sans max-w-4xl">
                {displayEmpresa?.descripcion || 'Empresa local radicada o vinculada comercialmente a la ciudad de Funes.'}
              </p>
            </div>

            {/* 4. Acciones Operativas Integradas al Pie de la Hoja */}
            <div className="p-6 sm:p-8 bg-zinc-50/70 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">
                  Gestión de búsquedas y candidatos
                </h3>
                <p className="text-xs text-zinc-500 max-w-xl">
                  Podés crear nuevas convocatorias laborales o consultar el avance de las entrevistas con los candidatos derivados por la Oficina de Empleo.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {isAprobada ? (
                  <Link
                    href="/empresa/ofertas/nueva"
                    className="h-9 px-4 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Nueva búsqueda</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="h-9 px-4 rounded-xl bg-brand-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs opacity-50 cursor-not-allowed"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Nueva búsqueda</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('candidatos')}
                  className="h-9 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-brand-800" />
                  <span>Ver candidatos derivados</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: MIS OFERTAS LABORALES                               */}
        {/* ============================================================== */}
        {activeTab === 'ofertas' && (
          <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
              <div>
                <h2 className="text-xl font-extrabold text-[#10231B] font-sans">
                  Mis búsquedas laborales
                </h2>
                <p className="text-xs sm:text-sm text-[#4B6256] mt-0.5">
                  Administrá tus avisos de empleo y accedé a los candidatos derivados por la Oficina de Empleo.
                </p>
              </div>

              {isAprobada && (
                <Link
                  href="/empresa/ofertas/nueva"
                  className="px-5 py-2.5 rounded-full bg-[#0E4D36] hover:bg-[#06402B] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <PlusIcon className="w-4 h-4" />
                  Nueva oferta
                </Link>
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
          <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
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
              highlightCandidateId={targetCandidatoId}
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
        isReenvio={isReenvioModal}
        onClose={() => {
          setIsEditProfileOpen(false);
          setIsReenvioModal(false);
        }}
        onSaved={async () => {
          setIsReenvioModal(false);
          await handleProfileSaved();
        }}
      />
      )}
    </div>
  );
}

