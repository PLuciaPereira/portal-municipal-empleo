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
  Sparkles, Camera,
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
    <div className="min-h-screen bg-[#F8FAF8] text-[#10231B]">
      {/* 1. Banda Verde Superior Institucional Funes */}
      <section className="bg-gradient-to-r from-[#06402B] to-[#0A3D2A] text-white pt-10 pb-8 border-b border-[#04281B]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-[760px]">
              <div className="flex flex-wrap items-center gap-3">
                {isAprobada ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDEFE3]/20 border border-[#DDEFE3]/30 text-[#E8F5EE] text-xs font-semibold">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#DDEFE3] text-[#06402B] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    Empresa Habilitada por la Oficina de Empleo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
                    <ClockIcon className="w-3.5 h-3.5 text-amber-300" />
                    Pendiente de Aprobación Municipal
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-4">
                {displayEmpresa?.logo_url ? (
                  <img
                    src={displayEmpresa.logo_url}
                    alt={empresaNombre}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white object-contain p-1 border-2 border-white/20 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-white/20 text-white flex items-center justify-center font-extrabold text-2xl shrink-0 shadow-md">
                    {initialLetter}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight font-display text-white">
                    {empresaNombre}
                  </h1>
                  <p className="mt-1 text-[#D6EADD] text-xs sm:text-sm leading-relaxed max-w-[550px]">
                    Gestión de búsquedas laborales, seguimiento de candidatos derivados y vinculación con la Oficina de Empleo de Funes.
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {isAprobada ? (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="min-h-[46px] px-6 rounded-full bg-[#F2B84B] hover:bg-[#E5AC41] text-[#2B1D00] font-bold text-sm inline-flex items-center gap-2 transition-all shadow-sm hover:-translate-y-0.5 cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4 stroke-[2.4]" />
                  Publicar Nueva Oferta
                </button>
              ) : (
                <span className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs text-white/80">
                  Habilitación en revisión
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Alerta destacada si hay candidatos derivados sin gestionar */}
      {isAprobada && activeCandidatesCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 sm:px-6">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Tenés <strong>{activeCandidatesCount} candidato{activeCandidatesCount === 1 ? '' : 's'} derivado{activeCandidatesCount === 1 ? '' : 's'}</strong> por la Oficina de Empleo pendiente{activeCandidatesCount === 1 ? '' : 's'} de revisión y coordinación de entrevista.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('candidatos')}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 underline underline-offset-2 shrink-0 text-left sm:text-right cursor-pointer"
            >
              Revisar candidatos ahora &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 2. Barra de Navegación por Pestañas */}
      <div className="bg-white border-b border-[#E0E8E1] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'perfil'}
              onClick={() => setActiveTab('perfil')}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Perfil de Empresa
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ofertas'}
              onClick={() => setActiveTab('ofertas')}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ofertas'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Mis Ofertas Laborales
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'ofertas'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#DDEFE3] text-[#0A3D2A]'
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
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'candidatos'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Users className="w-4 h-4" />
              Candidatos Derivados
              {activeCandidatesCount > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'candidatos'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F2B84B] text-[#2B1D00]'
                  }`}
                >
                  {activeCandidatesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Contenedor de Contenido Principal */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
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
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Columna Izquierda (360px): Tarjeta Institucional de la Empresa */}
            <aside className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4">
              <section className="bg-white border border-[#E0E8E1] rounded-[24px] overflow-hidden shadow-xs">
                {/* Cabecera de la tarjeta con avatar comercial */}
                <div className="text-center p-6 bg-gradient-to-b from-[#F4F8F4] to-white border-b border-[#E0E8E1] relative">
                  <div className="relative w-24 h-24 mx-auto group">
                    {displayEmpresa?.logo_url ? (
                      <img
                        src={displayEmpresa.logo_url}
                        alt={empresaNombre}
                        className="w-24 h-24 rounded-2xl object-contain bg-white shadow-sm border-2 border-[#E0E8E1] p-1.5"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-[#DDEFE3] text-[#0A3D2A] flex items-center justify-center font-extrabold text-3xl font-display shadow-sm border-2 border-white">
                        {initialLetter}
                      </div>
                    )}
                    <label
                      title="Subir o cambiar logo institucional directamente"
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center shadow-md hover:bg-brand-800 transition-transform active:scale-95 border-2 border-white cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleDirectLogoUpload}
                      />
                    </label>
                  </div>

                  <h3 className="mt-3 font-extrabold text-xl leading-tight text-zinc-900 font-display">
                    {empresaNombre}
                  </h3>

                  <div className="text-xs text-[#4B6256] mt-0.5 truncate max-w-[260px] mx-auto">
                    {displayEmpresa?.razon_social || 'Empresa Registrada'}
                  </div>

                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDEFE3] text-[#0A3D2A] text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-[#0E4D36]" />
                    {isAprobada ? 'Empresa Habilitada' : 'En Validación'}
                  </div>
                </div>

                {/* Lista de Datos Comerciales y Fiscales */}
                <div className="p-6 space-y-4 text-xs">
                  {/* CUIT con candado de protección fiscal */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064] flex items-center gap-1">
                        CUIT
                        <Lock className="w-3 h-3 text-zinc-400" />
                      </span>
                      <span className="text-[10px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded font-medium">
                        Validez fiscal
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm text-zinc-900">
                      {displayEmpresa?.cuit || 'No informado'}
                    </span>
                  </div>

                  {/* Razón Social con candado */}
                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064] flex items-center gap-1">
                        Razón Social
                        <Lock className="w-3 h-3 text-zinc-400" />
                      </span>
                    </div>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayEmpresa?.razon_social || 'No informado'}
                    </span>
                  </div>

                  {/* Rubro */}
                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064]">
                      Rubro / Actividad
                    </span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayEmpresa?.rubro || 'General'}
                    </span>
                  </div>

                  {/* Persona de Contacto */}
                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064]">
                      Persona de Contacto (RRHH)
                    </span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayEmpresa?.persona_contacto || user?.nombre || 'No informado'}
                    </span>
                  </div>

                  {/* Teléfono */}
                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#4B6256]" />
                      Teléfono / WhatsApp
                    </span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayEmpresa?.telefono || 'No informado'}
                    </span>
                  </div>

                  {/* Email de contacto */}
                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064] flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#4B6256]" />
                      Correo Electrónico
                    </span>
                    <span className="font-bold text-sm text-zinc-900 truncate">
                      {displayEmpresa?.email_contacto || user?.email || 'No informado'}
                    </span>
                  </div>

                  {/* Dirección y Localidad */}
                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#4B6256]" />
                      Ubicación
                    </span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayEmpresa?.direccion || 'Funes'}, {displayEmpresa?.localidad || 'Funes'}
                    </span>
                  </div>

                  {/* Sitio Web si existe */}
                  {displayEmpresa?.sitio_web && (
                    <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A7064] flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#4B6256]" />
                        Sitio Web / Red Social
                      </span>
                      <a
                        href={displayEmpresa.sitio_web}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-[#0E4D36] hover:underline flex items-center gap-1 truncate"
                      >
                        {displayEmpresa.sitio_web}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Botón explícito de editar perfil */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditProfileOpen(true)}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#D3DED5] bg-white text-xs font-bold text-[#0E4D36] hover:bg-[#F4F8F4] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Datos de la Empresa
                    </button>
                  </div>
                </div>
              </section>

              {/* Idoneidad e intermediación municipal */}
              <div className="p-4 bg-[#F4F8F4] border border-[#DDEFE3] rounded-2xl flex items-start gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-[#0E4D36] shrink-0 mt-0.5" />
                <p className="text-xs text-[#0A3D2A] font-medium leading-relaxed">
                  Los candidatos derivados son seleccionados por el equipo de intermediación de la Oficina de Empleo de Funes para garantizar su adecuación al puesto y promover el trabajo local.
                </p>
              </div>
            </aside>

            {/* Columna Derecha: Métricas y Reseña de la Empresa */}
            <main className="flex-1 w-full flex flex-col gap-6">
              {/* Tarjetas de Métricas Clave */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-[#E0E8E1] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5A7064] uppercase tracking-wider">
                      Ofertas Publicadas
                    </span>
                    <Briefcase className="w-4 h-4 text-[#0E4D36]" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-zinc-900 font-display">
                    {ofertas.length}
                  </div>
                  <div className="text-[11px] text-[#4B6256] mt-0.5">
                    {ofertasActivasCount} activas actualmente
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0E8E1] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5A7064] uppercase tracking-wider">
                      Candidatos Derivados
                    </span>
                    <Users className="w-4 h-4 text-[#0E4D36]" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-zinc-900 font-display">
                    {candidatos.length}
                  </div>
                  <div className="text-[11px] text-[#4B6256] mt-0.5">
                    {activeCandidatesCount} pendientes de evaluación
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0E8E1] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5A7064] uppercase tracking-wider">
                      Contrataciones
                    </span>
                    <CheckCircleIcon className="w-4 h-4 text-[#0E4D36]" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-zinc-900 font-display">
                    {contratadosCount}
                  </div>
                  <div className="text-[11px] text-[#4B6256] mt-0.5">
                    Incorporados mediante el portal
                  </div>
                </div>
              </div>

              {/* Descripción Institucional de la Empresa */}
              <section className="bg-white border border-[#E0E8E1] rounded-[24px] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#EEF2EE] pb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 font-display">
                      Descripción de la Empresa
                    </h3>
                    <p className="text-xs text-[#4B6256]">
                      Información pública visible para postulantes interesados en tus búsquedas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="text-xs font-bold text-[#0E4D36] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Modificar
                  </button>
                </div>

                {displayEmpresa?.descripcion ? (
                  <p className="text-sm text-[#4B6256] leading-relaxed whitespace-pre-line">
                    {displayEmpresa.descripcion}
                  </p>
                ) : (
                  <div className="p-6 rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-center space-y-2">
                    <p className="text-xs text-zinc-500">
                      Aún no agregaste una reseña o descripción de tu empresa.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditProfileOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E4D36] text-white text-xs font-bold hover:bg-[#06402B] transition-colors cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      Agregar Reseña Institucional
                    </button>
                  </div>
                )}
              </section>

              {/* Acciones Rápidas y Gestión de la Empresa */}
              <section className="bg-white border border-[#E0E8E1] rounded-[24px] p-6 shadow-xs space-y-4">
                <h3 className="font-extrabold text-base text-zinc-900 font-display">
                  Acciones Rápidas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAprobada) {
                        setIsCreateModalOpen(true);
                      }
                    }}
                    disabled={!isAprobada}
                    className="p-4 rounded-2xl border border-[#D3DED5] bg-[#F4F8F4] text-left hover:bg-[#EAF3EB] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0E4D36] text-white flex items-center justify-center shrink-0">
                        <PlusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="block text-sm font-bold text-[#10231B]">
                          Publicar Nueva Búsqueda
                        </strong>
                        <span className="text-xs text-[#4B6256]">
                          Creá una vacante para recibir candidatos preseleccionados.
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('candidatos')}
                    className="p-4 rounded-2xl border border-[#D3DED5] bg-white text-left hover:bg-zinc-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#DDEFE3] text-[#0A3D2A] flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="block text-sm font-bold text-[#10231B]">
                          Evaluar Postulantes
                        </strong>
                        <span className="text-xs text-[#4B6256]">
                          Revisá CVs derivados y registrá contrataciones o devoluciones.
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            </main>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: MIS OFERTAS LABORALES                               */}
        {/* ============================================================== */}
        {activeTab === 'ofertas' && (
          <div className="bg-white rounded-[24px] border border-[#E0E8E1] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF2EE] pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#10231B] font-display">
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
          <div className="bg-white rounded-[24px] border border-[#E0E8E1] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF2EE] pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#10231B] font-display">
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
