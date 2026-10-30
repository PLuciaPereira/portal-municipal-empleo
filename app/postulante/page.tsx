'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  PostulanteProfileFull,
  PostulacionConDetalle,
  getPostulanteProfile,
  getPostulanteApplications,
  getPostulanteCourses,
} from '@/lib/postulante';
import { getRubros } from '@/lib/jobs';
import { PostulanteCurso, Rubro, EstadoPostulanteCurso } from '@/types/database';
import { Badge, BadgeProps } from '@/components/ui/Badge';
import { CurriculumManager } from '@/components/postulante/CurriculumManager';
import { ApplicationsHistoryList } from '@/components/postulante/ApplicationsHistoryList';
import { ProfileEditModal } from '@/components/postulante/ProfileEditModal';
import {
  Edit3,
  GraduationCap,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Search,
  ShieldCheck,
  Check,
  User,
  Inbox,
  Award,
  Sparkles, Calendar, Camera,
} from 'lucide-react';

type TabKey = 'perfil' | 'postulaciones' | 'cursos';

const CURSO_STATUS_BADGE: Record<
  EstadoPostulanteCurso,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  asignado: { label: 'Asignado', variant: 'blue' },
  en_curso: { label: 'En curso', variant: 'amber' },
  completado: { label: 'Completado', variant: 'emerald' },
  abandonado: { label: 'Abandonado', variant: 'zinc' },
  cancelado: { label: 'Cancelado', variant: 'rose' },
};

export default function PostulanteDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page flex items-center justify-center p-8 text-zinc-500 font-sans text-sm">Cargando panel de postulante...</div>}>
      <PostulanteDashboardContent />
    </Suspense>
  );
}

function PostulanteDashboardContent() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'postulaciones' || tabParam === 'cursos' || tabParam === 'perfil') {
      return tabParam;
    }
    return 'perfil';
  });
  const [profileFull, setProfileFull] = useState<PostulanteProfileFull | null>(null);
  const [applications, setApplications] = useState<PostulacionConDetalle[]>([]);
  const [courses, setCourses] = useState<PostulanteCurso[]>([]);
  const [availableRubros, setAvailableRubros] = useState<Rubro[]>([]);
  const [ofertasSugeridas, setOfertasSugeridas] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Sincronizar tab cuando cambian los searchParams (ej. notificación "Ver detalle")
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'postulaciones' || tabParam === 'cursos' || tabParam === 'perfil') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleDirectAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La foto de perfil no debe superar los 2MB.');
      return;
    }

    try {
      const { uploadAvatarPostulante } = await import('@/lib/postulante');
      const res = await uploadAvatarPostulante(user.id, file);
      if (res.error) {
        alert(res.error);
      } else {
        await refreshUser();
        await loadDashboardData(user.id);
      }
    } catch {
      alert('Error al subir la imagen.');
    }
  };

  const loadDashboardData = useCallback(async (userId: string) => {
    setIsLoadingData(true);
    const [prof, apps, crs, rubrosList] = await Promise.all([
      getPostulanteProfile(userId),
      getPostulanteApplications(userId),
      getPostulanteCourses(userId),
      getRubros(),
    ]);
    setProfileFull(prof);
    setApplications(apps);
    setCourses(crs);
    setAvailableRubros(rubrosList);
    setIsLoadingData(false);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const init = async () => {
      const [prof, apps, crs, rubrosList] = await Promise.all([
        getPostulanteProfile(user.id),
        getPostulanteApplications(user.id),
        getPostulanteCourses(user.id),
        getRubros(),
      ]);
      if (!isMounted) return;
      setProfileFull(prof);
      setApplications(apps);
      setCourses(crs);
      setAvailableRubros(rubrosList);
      setIsLoadingData(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleDataChanged = async () => {
    if (!user?.id) return;
    await Promise.all([loadDashboardData(user.id), refreshUser()]);
  };

  const displayProfile: PostulanteProfileFull | null =
    profileFull ||
    (user
      ? {
          ...user,
          rubros: user.rubros || [],
          curriculums: user.curriculums || [],
        }
      : null);

  const isProfileIncomplete =
    !displayProfile?.dni?.trim() ||
    !displayProfile?.telefono?.trim() ||
    !displayProfile?.localidad?.trim() ||
    !displayProfile?.nivel_educativo?.trim();

  const initialLetter = displayProfile?.nombre?.charAt(0).toUpperCase() || 'P';
  
  // Detectar entrevistas activas agendadas
  const upcomingInterviews = applications.filter(
    (app) => app.estado === 'entrevista' && (app as any).fecha_entrevista
  );

  const activeApplicationsCount = applications.filter(
    (app) => app.estado !== 'retirado_por_postulante'
  ).length;

  return (
    <div className="min-h-screen bg-page text-foreground flex flex-col font-sans">
      {/* 1. Banda Verde Superior Institucional Funes Full-Width */}
      <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white pt-8 pb-7 border-b border-brand-950/40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-[820px]">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 border border-white/15 text-white/95 text-xs font-semibold backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Portal de Empleo · Municipalidad de Funes
                </span>
                {displayProfile?.es_residente_funes && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-200 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                    Vecino Residente de Funes
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-4">
                {displayProfile?.avatar_url ? (
                  <img
                    src={displayProfile.avatar_url}
                    alt={displayProfile.nombre}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/20 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-white/20 text-white flex items-center justify-center font-extrabold text-2xl shrink-0 shadow-md">
                    {initialLetter}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white font-sans">
                    {displayProfile?.nombre ? `${displayProfile.nombre} ${displayProfile.apellido || ''}` : 'Mi Perfil Laboral'}
                  </h1>
                  <p className="mt-1 text-brand-100/90 text-xs sm:text-sm lg:text-base leading-relaxed max-w-[650px]">
                    Gestioná tu legajo laboral, actualizá tus currículums y seguí en tiempo real las intermediaciones de la Oficina de Empleo de Funes.
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/ofertas"
                className="min-h-[42px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.4]" />
                Explorar Ofertas Laborales
              </Link>
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
              <User className="w-4 h-4 text-brand-800" />
              <span>Mi Perfil y CV</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'postulaciones'}
              onClick={() => setActiveTab('postulaciones')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'postulaciones'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Inbox className="w-4 h-4 text-brand-800" />
              <span>Mis Postulaciones</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'postulaciones'
                    ? 'bg-brand-100 text-brand-900'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {activeApplicationsCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cursos'}
              onClick={() => setActiveTab('cursos')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cursos'
                  ? 'border-brand-800 text-brand-900 font-extrabold bg-brand-50/50'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Award className="w-4 h-4 text-zinc-600" />
              <span>Cursos y Talleres</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-100 text-zinc-700">
                {courses.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Contenedor de Contenido Principal Full-Width (hasta 1600px) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 w-full flex-1 space-y-6">

        {/* Banner de entrevistas agendadas */}
        {upcomingInterviews.length > 0 && (
          <div className="p-4 sm:p-5 bg-brand-50 border border-brand-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-brand-900 font-bold text-sm sm:text-base">
              <Calendar className="w-5 h-5 text-brand-700 shrink-0" />
              <span>¡Tenés {upcomingInterviews.length === 1 ? 'una entrevista laboral agendada' : `${upcomingInterviews.length} entrevistas agendadas`}!</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingInterviews.map((app) => (
                <div key={app.id} className="p-3 bg-white rounded-xl border border-brand-100 text-xs text-zinc-700 space-y-1">
                  <div className="font-bold text-zinc-900 text-sm">
                    {app.oferta?.titulo || 'Entrevista Laboral'}
                  </div>
                  <div className="text-zinc-600">
                    Empresa: <strong>{app.oferta?.empresa?.nombre_fantasia || app.oferta?.empresa?.razon_social || 'Empresa solicitante'}</strong>
                  </div>
                  <div className="text-brand-700 font-semibold flex items-center gap-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date((app as any).fecha_entrevista).toLocaleString('es-AR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })} hs
                    </span>
                    <span className="capitalize">({(app as any).modalidad_entrevista || 'Presencial'})</span>
                  </div>
                  {(app as any).lugar_entrevista && (
                    <div className="text-zinc-500 text-[11px] pt-0.5">
                      Lugar/Link: {(app as any).lugar_entrevista}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Aviso de perfil incompleto */}
        {!isLoadingData && isProfileIncomplete && (
          <div className="mb-6 p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm text-amber-950 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-amber-900">
                  Completá tu perfil laboral para mejorar tu posicionamiento
                </strong>
                <span className="text-amber-800">
                  Agregar tu nivel educativo, experiencia, habilidades y rubros de interés ayuda a la Oficina de Empleo de Funes a preseleccionarte más rápido.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 rounded-full border border-amber-300 bg-white font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
            >
              Completar ahora
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 1: MI PERFIL (Pantalla inicial y prioritaria)         */}
        {/* ============================================================== */}
        {activeTab === 'perfil' && (
          <div className="space-y-6 w-full">
            {/* 1. Módulo Maestro de Datos Personales (Full-Width Header Integrado) */}
            <section className="bg-surface border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200/80 bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0 group">
                    {displayProfile?.avatar_url ? (
                      <img
                        src={displayProfile.avatar_url}
                        alt={displayProfile.nombre}
                        className="w-16 h-16 rounded-2xl object-cover shadow-xs border border-zinc-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-900 flex items-center justify-center font-extrabold text-2xl font-sans shadow-xs border border-brand-200">
                        {initialLetter}
                      </div>
                    )}
                    <label
                      title="Subir o cambiar foto de perfil directamente"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-700 text-white flex items-center justify-center shadow-md hover:bg-brand-800 transition-transform active:scale-95 border-2 border-white cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleDirectAvatarUpload}
                      />
                    </label>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-xl sm:text-2xl text-zinc-900 leading-tight font-sans">
                        {displayProfile?.nombre} {displayProfile?.apellido}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 text-xs font-bold">
                        <Sparkles className="w-3 h-3" />
                        Búsqueda activa
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>{user?.email || 'Postulante registrado'}</span>
                      <span>•</span>
                      <span>DNI: <strong className="text-zinc-700 font-semibold tabular-nums">{displayProfile?.dni || 'No informado'}</strong></span>
                      <span>•</span>
                      <span>Localidad: <strong className="text-zinc-700 font-semibold">{displayProfile?.localidad || (displayProfile?.es_residente_funes ? 'Funes' : 'No informada')}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {displayProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="min-h-[40px] px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-xs text-zinc-800 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-brand-800" />
                      <span>Editar Legajo</span>
                    </button>
                  )}

                </div>
              </div>

              {/* Fila de Datos Rápidos de Contacto y Resguardo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/80 text-xs">
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Teléfono / WhatsApp</span>
                  <span className="font-bold text-sm text-zinc-900">{displayProfile?.telefono || 'No informado'}</span>
                </div>
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Domicilio</span>
                  <span className="font-bold text-sm text-zinc-900">{displayProfile?.direccion || 'No especificado'}</span>
                </div>
                <div className="p-4 flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Residencia Municipal</span>
                  <span className="font-bold text-sm text-brand-900">{displayProfile?.es_residente_funes ? 'Residente verificado en Funes' : 'Otras localidades'}</span>
                </div>
                <div className="p-4 flex items-center gap-2 text-zinc-500 bg-zinc-50/30">
                  <ShieldCheck className="w-4 h-4 text-brand-800 shrink-0" />
                  <span className="text-[11px] leading-relaxed">Legajo resguardado por la Oficina de Empleo de Funes.</span>
                </div>
              </div>
            </section>

            {/* 2. Módulo de Trayectoria, Formación y Habilidades (Full-Width) */}
            <section className="bg-surface border border-zinc-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-zinc-900 font-sans">
                      Perfil Laboral y Competencias
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Experiencia previa, disponibilidad horaria y oficios declarados ante el Municipio.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 font-semibold text-xs text-zinc-700 transition-colors cursor-pointer shrink-0"
                >
                  Modificar
                </button>
              </div>

              {/* Resumen de Experiencia */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Resumen de Trayectoria
                </span>
                <p className="text-sm mt-1.5 text-zinc-800 leading-relaxed font-sans">
                  {displayProfile?.experiencia_resumen ||
                    'Aún no registraste una descripción de tu trayectoria laboral.'}
                </p>
              </div>

              {/* Grid Horizontal de Atributos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">Educación</span>
                    <span className="font-bold text-sm text-zinc-900 mt-0.5 block">{displayProfile?.nivel_educativo || 'No especificado'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">Situación Laboral</span>
                    <span className="font-bold text-sm text-zinc-900 mt-0.5 block">{displayProfile?.situacion_laboral_actual || 'No informada'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">Disponibilidad</span>
                    <span className="font-bold text-sm text-zinc-900 mt-0.5 block">{displayProfile?.disponibilidad_horaria || 'No informada'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-surface flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">Movilidad</span>
                    <span className="font-bold text-sm text-zinc-900 mt-0.5 block">{displayProfile?.movilidad_propia ? 'Con movilidad' : 'Sin movilidad'}</span>
                  </div>
                </div>
              </div>

              {/* Habilidades y Oficios */}
              <div className="pt-2 border-t border-zinc-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                  Habilidades y Oficios Declarados
                </span>
                <div className="flex flex-wrap gap-2">
                  {displayProfile?.habilidades && displayProfile.habilidades.length > 0 ? (
                    displayProfile.habilidades.map((h, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-800 bg-zinc-50"
                      >
                        {h}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400 italic">Sin habilidades registradas</span>
                  )}
                </div>
              </div>

              {/* Rubros de Interés */}
              <div className="pt-2 border-t border-zinc-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                  Rubros de Interés en Funes
                </span>
                <div className="flex flex-wrap gap-2">
                  {displayProfile?.rubros && displayProfile.rubros.length > 0 ? (
                    displayProfile.rubros.map((r) => (
                      <span
                        key={r.id}
                        className="px-3 py-1 rounded-lg bg-brand-50 text-brand-900 text-xs font-bold border border-brand-200"
                      >
                        {r.nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400 italic">No seleccionaste rubros aún</span>
                  )}
                </div>
              </div>
            </section>

            {/* 3. Módulo de Currículums Vitae (Full-Width) */}
            <CurriculumManager
              curriculums={profileFull?.curriculums || []}
              isLoading={isLoadingData}
              onChanged={handleDataChanged}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: MIS POSTULACIONES                                 */}
        {/* ============================================================== */}
        {activeTab === 'postulaciones' && (
          <div className="space-y-6">
            {/* Banner Informativo Institucional de Intermediación */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs sm:text-sm flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#1E40AF]" />
              <div>
                <strong className="font-bold block text-[#1E3A8A]">
                  Intermediación Municipal de la Oficina de Empleo de Funes
                </strong>
                <span>
                  Cada postulación es analizada por el equipo técnico municipal para validar que responda a los requerimientos del puesto. Una vez verificada, se deriva a la empresa contratante.
                </span>
              </div>
            </div>

            <ApplicationsHistoryList
              applications={applications}
              isLoading={isLoadingData}
              onChanged={handleDataChanged}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 3: MIS CURSOS Y CAPACITACIONES                      */}
        {/* ============================================================== */}
        {activeTab === 'cursos' && (
          <section className="bg-white border border-[#E0E8E1] rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#EEF2EE]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 font-sans">
                    Mis Cursos y Capacitaciones Municipales
                  </h2>
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold bg-[#E6F0FB] text-[#174F93]">
                    {courses.length} {courses.length === 1 ? 'asignado' : 'asignados'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#4B6256]">
                  Talleres de formación profesional y oficios coordinados por el Gobierno de Funes.
                </p>
              </div>
            </div>

            {isLoadingData ? (
              <div className="mt-6 h-36 rounded-2xl bg-zinc-100 animate-pulse" />
            ) : courses.length === 0 ? (
              <div className="mt-8 border-[1.5px] border-dashed border-[#C3D1C7] rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#E4F1E8] text-[#0E4D36] flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 font-sans">
                  No tenés cursos asignados por el momento
                </h3>
                <p className="mt-2 max-w-[500px] text-sm text-[#4B6256] leading-relaxed">
                  Cuando un orientador de la Oficina de Empleo de Funes te inscriba o recomiende un taller de formación técnico-laboral, aparecerá aquí con sus horarios, sede y porcentaje de asistencia.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <Link
                    href="/ofertas"
                    className="min-h-[44px] px-6 rounded-full bg-[#0E4D36] hover:bg-[#06402B] text-white font-bold text-sm inline-flex items-center gap-2 transition-colors"
                  >
                    Ver ofertas laborales abiertas
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-[#E0E8E1] border border-[#E0E8E1] rounded-2xl overflow-hidden bg-white">
                {courses.map((pc) => {
                  const badgeConfig =
                    CURSO_STATUS_BADGE[pc.estado] || {
                      label: pc.estado,
                      variant: 'zinc' as const,
                    };
                  const formattedDate = new Date(pc.fecha_asignacion).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={pc.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAF8] transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-zinc-900">
                            {pc.curso?.titulo || 'Curso de Formación Laboral'}
                          </span>
                          <Badge variant={badgeConfig.variant} size="sm">
                            {badgeConfig.label}
                          </Badge>
                        </div>

                        {pc.curso?.descripcion && (
                          <p className="text-xs sm:text-sm text-[#4B6256]">
                            {pc.curso.descripcion}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          {pc.curso?.institucion && <span>Sede / Institución: {pc.curso.institucion}</span>}
                          {pc.curso?.duracion && <span>Duración: {pc.curso.duracion}</span>}
                          <span>Asignado el {formattedDate}</span>
                        </div>

                        {pc.observaciones && (
                          <p className="text-xs text-emerald-900 bg-[#E4F1E8] px-3 py-1.5 rounded-lg border border-[#BFE0CB] mt-1.5">
                            Nota de la Oficina de Empleo: {pc.observaciones}
                          </p>
                        )}
                      </div>

                      {pc.estado === 'completado' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-[#D9EEDF] px-3 py-1.5 rounded-full shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          Acreditado
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>

      {/* Modal accesible de edición de perfil */}
      {isEditModalOpen && displayProfile && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          profile={displayProfile}
          availableRubros={availableRubros}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={handleDataChanged}
        />
      )}
    </div>
  );
}

