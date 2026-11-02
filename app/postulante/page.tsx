'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { ProfilePersonalModal } from '@/components/postulante/ProfilePersonalModal';
import { ProfileLaboralModal } from '@/components/postulante/ProfileLaboralModal';
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
  Sparkles,
  Calendar,
  Camera,
  ArrowUpDown,
  Mail,
  MapPin,
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
  const { user, refreshUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Guardia de coherencia de sesión en el cliente
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login?redirect=/postulante");
    }
  }, [isAuthLoading, user, router]);
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
  const [cursoSortOrder, setCursoSortOrder] = useState<'recientes' | 'antiguas'>('recientes');
  const [availableRubros, setAvailableRubros] = useState<Rubro[]>([]);
  const [ofertasSugeridas, setOfertasSugeridas] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState<boolean>(false);
  const [isLaboralModalOpen, setIsLaboralModalOpen] = useState<boolean>(false);

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
      <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white py-4 sm:py-5 border-b border-brand-950/40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
              {/* Avatar cuadrado de 44 px */}
              {displayProfile?.avatar_url ? (
                <img
                  src={displayProfile.avatar_url}
                  alt={displayProfile.nombre}
                  className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-xl object-cover border border-white/20 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-extrabold text-lg sm:text-xl shrink-0 shadow-xs">
                  {initialLetter}
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                {/* Fila de chips arriba del nombre */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/95 text-[11.5px] font-semibold backdrop-blur-xs leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Portal de Empleo · Municipalidad de Funes
                  </span>
                  {displayProfile?.es_residente_funes && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/95 text-[11.5px] font-semibold backdrop-blur-xs leading-none">
                      <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />
                      Vecino Residente de Funes
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400/15 border border-amber-300/30 text-[#ffd978] text-[11.5px] font-semibold backdrop-blur-xs leading-none">
                    <Search className="w-3 h-3 text-[#ffd978] stroke-[2.5]" />
                    Búsqueda activa
                  </span>
                </div>

                {/* Nombre grande del postulante */}
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold tracking-tight text-white font-sans leading-tight">
                    {displayProfile?.nombre ? `${displayProfile.nombre} ${displayProfile.apellido || ''}` : 'Mi Perfil Laboral'}
                  </h1>
                </div>

                {/* Debajo del nombre: correo, DNI y localidad al 86% de opacidad */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/86 text-[14px]">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span>{user?.email || 'postulante@funes.com'}</span>
                  </span>
                  <span className="text-white/30 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span>{displayProfile?.dni || '35123456'}</span>
                  </span>
                  <span className="text-white/30 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span>{displayProfile?.localidad || (displayProfile?.es_residente_funes ? 'Funes' : 'No informada')}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3 pt-2 md:pt-0">
              <Link
                href="/ofertas"
                className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer w-full sm:w-auto shrink-0"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.4]" />
                Explorar ofertas laborales
              </Link>
            </div>
          </div>
        </div>
      </section>

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
              <User className="w-3.5 h-3.5" />
              <span>Mi perfil y CV</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'postulaciones'}
              onClick={() => setActiveTab('postulaciones')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'postulaciones'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Mis postulaciones</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold leading-none transition-colors ${
                  activeTab === 'postulaciones'
                    ? 'bg-white/20 text-white'
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cursos'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Cursos y talleres</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold leading-none transition-colors ${
                  activeTab === 'cursos'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {courses.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Contenedor de Contenido Principal Full-Width (hasta 1600px) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 w-full flex-1 space-y-5">

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
              onClick={() => {
                const missingContact = !displayProfile?.dni?.trim() || !displayProfile?.telefono?.trim() || !displayProfile?.localidad?.trim();
                if (missingContact) {
                  setIsPersonalModalOpen(true);
                } else {
                  setIsLaboralModalOpen(true);
                }
              }}
              className="px-4 py-2 rounded-full border border-amber-300 bg-white font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
            >
              Completar ahora
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 1: MI PERFIL (HOJA CONTINUA ATS - IDÉNTICA A EMPRESA) */}
        {/* ============================================================== */}
        {activeTab === 'perfil' && (
          <div className="w-full bg-surface border border-zinc-200/90 rounded-2xl shadow-xs divide-y divide-zinc-200/80 overflow-hidden font-sans">
            {/* Canales de contacto y residencia (4 columnas ordenadas ATS) con acción de editar */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Canales de contacto y residencia
                </h3>
                {displayProfile && (
                  <button
                    type="button"
                    onClick={() => setIsPersonalModalOpen(true)}
                    className="h-8.5 px-3.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-xs text-zinc-700 transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
                    aria-label="Editar legajo y contacto"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-brand-800" />
                    <span>Editar legajo y contacto</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Teléfono / WhatsApp</span>
                  <span className="font-bold text-sm text-zinc-900 block">{displayProfile?.telefono || 'No informado'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Domicilio</span>
                  <span className="font-bold text-sm text-zinc-900 block">{displayProfile?.direccion || 'No especificado'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Padrón de residencia</span>
                  <span className="font-bold text-sm text-brand-900 block">{displayProfile?.es_residente_funes ? 'Residente oficial en Funes' : 'Otras localidades'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Resguardo municipal</span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Oficina de Empleo de Funes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Perfil Laboral y Trayectoria */}
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Perfil laboral y competencias
                </h3>
                <button
                  type="button"
                  onClick={() => setIsLaboralModalOpen(true)}
                  className="h-8.5 px-3.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-semibold text-xs text-zinc-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  Modificar perfil laboral
                </button>
              </div>

              {/* Resumen de trayectoria */}
              <div>
                <span className="text-xs font-semibold text-zinc-500 block mb-1">Resumen de trayectoria y experiencia</span>
                <p className="text-sm text-zinc-800 leading-relaxed font-sans bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/70">
                  {displayProfile?.experiencia_resumen || 'Aún no registraste una descripción de tu trayectoria laboral.'}
                </p>
              </div>

              {/* Atributos clave en 4 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Nivel educativo</span>
                  <span className="font-bold text-sm text-zinc-900 block">{displayProfile?.nivel_educativo || 'No especificado'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Situación laboral</span>
                  <span className="font-bold text-sm text-zinc-900 block">{displayProfile?.situacion_laboral_actual || 'No informada'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Disponibilidad horaria</span>
                  <span className="font-bold text-sm text-zinc-900 block">{displayProfile?.disponibilidad_horaria || 'No informada'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-1">Movilidad propia</span>
                  <span className="font-bold text-sm text-zinc-900 block">{displayProfile?.movilidad_propia ? 'Con movilidad' : 'Sin movilidad'}</span>
                </div>
              </div>

              {/* Habilidades y Oficios */}
              <div className="pt-4 border-t border-zinc-100">
                <span className="text-xs font-semibold text-zinc-500 block mb-2">Habilidades y oficios declarados</span>
                <div className="flex flex-wrap gap-2">
                  {displayProfile?.habilidades && displayProfile.habilidades.length > 0 ? (
                    displayProfile.habilidades.map((h, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-800 bg-zinc-50/60 shadow-2xs"
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
              <div className="pt-4 border-t border-zinc-100">
                <span className="text-xs font-semibold text-zinc-500 block mb-2">Rubros de interés en Funes</span>
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
            </div>

            {/* 4. Módulo de Currículum Vitae Integrado */}
            <div className="p-6 sm:p-8">
              <CurriculumManager
                curriculums={profileFull?.curriculums || []}
                isLoading={isLoadingData}
                onChanged={handleDataChanged}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: MIS POSTULACIONES                                 */}
        {/* ============================================================== */}
        {activeTab === 'postulaciones' && (
          <div className="w-full">
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
          <section className="space-y-5 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-sans">
                    Mis cursos y capacitaciones municipales
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F0FB] text-[#174F93]">
                    {courses.length} {courses.length === 1 ? 'asignado' : 'asignados'}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-[#4B6256]">
                  Talleres de formación profesional y oficios coordinados por el Gobierno de Funes.
                </p>
              </div>

              {/* Selector de Orden */}
              {courses.length > 1 && (
                <div className="flex items-center gap-1.5 bg-white px-2.5 h-8.5 rounded-xl border border-zinc-200 text-xs shrink-0 self-start sm:self-auto shadow-2xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-500 font-medium hidden sm:inline">Orden:</span>
                  <select
                    value={cursoSortOrder}
                    onChange={(e) => setCursoSortOrder(e.target.value as 'recientes' | 'antiguas')}
                    aria-label="Ordenar cursos por fecha de asignación"
                    className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="antiguas">Más antiguas</option>
                  </select>
                </div>
              )}
            </div>

            {isLoadingData ? (
              <div className="h-32 rounded-xl bg-zinc-100 animate-pulse" />
            ) : courses.length === 0 ? (
              <div className="border border-dashed border-[#C3D1C7] rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center max-w-2xl mx-auto bg-white shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-[#E4F1E8] text-[#0E4D36] flex items-center justify-center mb-3">
                  <BookOpen className="w-7 h-7 stroke-[1.8]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 font-sans">
                  No tenés cursos asignados por el momento
                </h3>
                <p className="mt-1.5 max-w-[480px] text-xs sm:text-sm text-[#4B6256] leading-relaxed">
                  Cuando un orientador de la Oficina de Empleo de Funes te inscriba o recomiende un taller de formación técnico-laboral, aparecerá aquí con sus horarios, sede y porcentaje de asistencia.
                </p>
                <div className="mt-5 flex flex-wrap gap-3 justify-center">
                  <Link
                    href="/ofertas"
                    className="h-10 px-5 rounded-xl bg-[#0E4D36] hover:bg-[#06402B] text-white font-bold text-xs inline-flex items-center gap-2 transition-colors shadow-2xs"
                  >
                    Ver ofertas laborales abiertas
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[...courses]
                  .sort((a, b) => {
                    const timeA = new Date(a.fecha_asignacion).getTime() || 0;
                    const timeB = new Date(b.fecha_asignacion).getTime() || 0;
                    return cursoSortOrder === 'recientes' ? timeB - timeA : timeA - timeB;
                  })
                  .map((pc) => {
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
                      className="p-4 sm:p-4.5 rounded-xl border border-zinc-200/90 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-300 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-zinc-900">
                            {pc.curso?.titulo || 'Curso de Formación Laboral'}
                          </span>
                          <Badge variant={badgeConfig.variant} size="sm">
                            {badgeConfig.label}
                          </Badge>
                        </div>

                        {pc.curso?.descripcion && (
                          <p className="text-xs text-[#4B6256]">
                            {pc.curso.descripcion}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-zinc-500 pt-0.5">
                          {pc.curso?.institucion && <span>Sede: {pc.curso.institucion}</span>}
                          {pc.curso?.duracion && <span>• Duración: {pc.curso.duracion}</span>}
                          <span>• Asignado el {formattedDate}</span>
                        </div>

                        {pc.observaciones && (
                          <p className="text-xs text-emerald-900 bg-[#E4F1E8] px-3 py-1.5 rounded-lg border border-[#BFE0CB] mt-1.5 inline-block">
                            Nota de la Oficina de Empleo: {pc.observaciones}
                          </p>
                        )}
                      </div>

                      {pc.estado === 'completado' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-[#D9EEDF] px-3 py-1.5 rounded-full shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
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

      {/* Modales separados y específicos para el legajo personal y perfil laboral */}
      {isPersonalModalOpen && displayProfile && (
        <ProfilePersonalModal
          isOpen={isPersonalModalOpen}
          profile={displayProfile}
          onClose={() => setIsPersonalModalOpen(false)}
          onSaved={handleDataChanged}
        />
      )}

      {isLaboralModalOpen && displayProfile && (
        <ProfileLaboralModal
          isOpen={isLaboralModalOpen}
          profile={displayProfile}
          availableRubros={availableRubros}
          onClose={() => setIsLaboralModalOpen(false)}
          onSaved={handleDataChanged}
        />
      )}
    </div>
  );
}

