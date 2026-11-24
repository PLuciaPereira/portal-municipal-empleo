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
  confirmarAsistenciaCurso,
  darDeBajaCursoPostulante,
} from '@/lib/postulante';
import { getRubros } from '@/lib/jobs';
import { PostulanteCurso, Rubro, EstadoPostulanteCurso } from '@/types/database';
import { Badge, BadgeProps } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CourseDetailModal } from '@/components/postulante/CourseDetailModal';
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
  Play,
  Loader2,
  Info,
  XCircle,
  Building2,
  PhoneCall,
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
  const [cursoSortOrder, setCursoSortOrder] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');
  const [availableRubros, setAvailableRubros] = useState<Rubro[]>([]);
  const [ofertasSugeridas, setOfertasSugeridas] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState<boolean>(false);
  const [isLaboralModalOpen, setIsLaboralModalOpen] = useState<boolean>(false);
  const [confirmandoCursoId, setConfirmandoCursoId] = useState<string | null>(null);
  const [mensajeCurso, setMensajeCurso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [cursoParaVerDetalle, setCursoParaVerDetalle] = useState<PostulanteCurso | null>(null);
  const [cursoParaBaja, setCursoParaBaja] = useState<PostulanteCurso | null>(null);
  const [isSubmittingBaja, setIsSubmittingBaja] = useState<boolean>(false);

  const handleConfirmarInicioCurso = async (asignacionId: string, tituloCurso: string) => {
    setConfirmandoCursoId(asignacionId);
    setMensajeCurso(null);
    try {
      const res = await confirmarAsistenciaCurso(asignacionId);
      if (res.success) {
        setCourses((prev) =>
          prev.map((c) => (c.id === asignacionId ? { ...c, estado: 'en_curso' } : c))
        );
        setMensajeCurso({
          tipo: 'success',
          texto: `¡Felicitaciones! Confirmaste tu inicio en "${tituloCurso}". La Oficina de Empleo fue notificada.`,
        });
      } else {
        setMensajeCurso({
          tipo: 'error',
          texto: res.error || 'No se pudo confirmar el inicio del curso.',
        });
      }
    } catch {
      setMensajeCurso({
        tipo: 'error',
        texto: 'Ocurrió un error inesperado al confirmar la cursada.',
      });
    } finally {
      setConfirmandoCursoId(null);
    }
  };

  const handleConfirmarBajaCurso = async (motivo?: string) => {
    if (!cursoParaBaja || !motivo?.trim()) return;

    setIsSubmittingBaja(true);
    setMensajeCurso(null);
    try {
      const res = await darDeBajaCursoPostulante({
        asignacionId: cursoParaBaja.id,
        motivo: motivo.trim(),
        estadoActual: cursoParaBaja.estado,
      });

      if (res.success) {
        const nuevoEstado = cursoParaBaja.estado === 'asignado' ? 'cancelado' : 'abandonado';
        setCourses((prev) =>
          prev.map((c) => (c.id === cursoParaBaja.id ? { ...c, estado: nuevoEstado } : c))
        );
        setMensajeCurso({
          tipo: 'success',
          texto: 'Se registró la baja de la capacitación y se informó a la Oficina de Empleo.',
        });
        setCursoParaBaja(null);
      } else {
        setMensajeCurso({
          tipo: 'error',
          texto: res.error || 'No se pudo registrar la baja del curso.',
        });
      }
    } catch {
      setMensajeCurso({
        tipo: 'error',
        texto: 'Ocurrió un error inesperado al registrar la baja.',
      });
    } finally {
      setIsSubmittingBaja(false);
    }
  };

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

  const missingRequiredFields: string[] = [];
  if (!displayProfile?.dni?.trim()) missingRequiredFields.push('DNI');
  if (!displayProfile?.telefono?.trim()) missingRequiredFields.push('Teléfono / WhatsApp');
  if (!displayProfile?.localidad?.trim()) missingRequiredFields.push('Localidad');

  const hasCurriculum = (displayProfile?.curriculums?.length ?? 0) > 0;
  if (!hasCurriculum) {
    missingRequiredFields.push('Currículum Vitae (CV)');
  }

  const isMandatoryIncomplete = missingRequiredFields.length > 0;

  // Sugerencias opcionales para perfeccionar el perfil
  const optionalSuggestions: string[] = [];
  if (!displayProfile?.nivel_educativo?.trim()) optionalSuggestions.push('nivel educativo');
  if (!displayProfile?.experiencia_resumen?.trim()) optionalSuggestions.push('experiencia previa');
  if (!displayProfile?.habilidades || displayProfile.habilidades.length === 0) optionalSuggestions.push('habilidades y oficios');
  if (!displayProfile?.rubros || displayProfile.rubros.length === 0) optionalSuggestions.push('rubros de interés');

  // Cálculo de porcentaje de perfil completado
  let profileCompletionScore = 0;
  if (displayProfile?.nombre?.trim()) profileCompletionScore += 10;
  if (displayProfile?.dni?.trim()) profileCompletionScore += 10;
  if (displayProfile?.telefono?.trim()) profileCompletionScore += 10;
  if (displayProfile?.localidad?.trim()) profileCompletionScore += 10;
  if (hasCurriculum) profileCompletionScore += 20;
  if (displayProfile?.nivel_educativo?.trim()) profileCompletionScore += 10;
  if (displayProfile?.experiencia_resumen?.trim()) profileCompletionScore += 10;
  if (displayProfile?.habilidades && displayProfile.habilidades.length > 0) profileCompletionScore += 10;
  if (displayProfile?.rubros && displayProfile.rubros.length > 0) profileCompletionScore += 10;

  const profileCompletionPercentage = Math.min(100, profileCompletionScore);

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
      {/* 1. Banda Verde Superior Institucional Funes Full-Width - Visible únicamente en Mi perfil y CV */}
      {activeTab === 'perfil' && (
        <section className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white py-4 sm:py-5 border-b border-brand-950/40 shadow-sm">
          <div className="max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
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
            </div>
          </div>
        </section>
      )}

      {/* 2. Contenedor de Contenido Principal Full-Width (hasta 1720px) */}
      <div className="max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 sm:py-6 2xl:py-8 w-full flex-1 space-y-5 2xl:space-y-6">

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
        
        {/* 1. Aviso de datos obligatorios faltantes (indispensables para postularse) */}
        {!isLoadingData && isMandatoryIncomplete && (
          <div className="mb-6 p-4 sm:p-5 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm text-amber-950 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold block text-amber-900 text-sm">
                  Datos obligatorios pendientes para postularte
                </strong>
                <p className="text-amber-800 leading-relaxed">
                  Para poder postularte a las ofertas laborales vigentes necesitás completar:{' '}
                  <span className="font-semibold text-amber-950">
                    {missingRequiredFields.join(', ')}
                  </span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const missingContact =
                  !displayProfile?.dni?.trim() ||
                  !displayProfile?.telefono?.trim() ||
                  !displayProfile?.localidad?.trim();
                if (missingContact) {
                  setIsPersonalModalOpen(true);
                } else {
                  // Si solo falta CV, asegurar que esté en tab perfil y scroll hacia CurriculumManager
                  if (activeTab !== 'perfil') {
                    setActiveTab('perfil');
                  }
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
              }}
              className="px-4 py-2 rounded-xl border border-amber-400 bg-white font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shrink-0 shadow-2xs text-center"
            >
              Completar datos requeridos
            </button>
          </div>
        )}

        {/* 2. Indicador visual compacto de progreso de perfil y sugerencias (estilo Computrabajo / Upwork) - Visible únicamente en la pestaña 'Mi perfil y CV' */}
        {!isLoadingData && activeTab === 'perfil' && !isMandatoryIncomplete && profileCompletionPercentage < 100 && (
          <div className="mb-4 py-3 px-4 sm:px-5 bg-surface border border-zinc-200/90 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Badge de porcentaje y barra compacta */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="inline-flex items-center justify-center font-bold text-xs px-2 py-0.5 rounded-md bg-brand-50 text-brand-900 border border-brand-200">
                  {profileCompletionPercentage}%
                </span>
                <div className="w-24 sm:w-32 bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200/80">
                  <div
                    className="bg-brand-700 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${profileCompletionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Texto explicativo discreto */}
              <div className="min-w-0 flex-1">
                <p className="text-zinc-600 truncate sm:text-clip">
                  <strong className="text-zinc-900 font-semibold mr-1">Completá tu perfil:</strong>
                  sumá <span className="text-zinc-800 font-medium">{optionalSuggestions.join(', ')}</span> para potenciar tus postulaciones en Funes.
                </p>
              </div>
            </div>

            {/* Botón de acción rápido y discreto */}
            <button
              type="button"
              onClick={() => setIsLaboralModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50/50 hover:bg-brand-100/60 font-semibold text-brand-900 text-xs transition-colors cursor-pointer shrink-0 self-start md:self-center shadow-2xs"
            >
              Completar perfil →
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
                    onChange={(e) => setCursoSortOrder(e.target.value as 'recientes' | 'antiguas' | 'titulo')}
                    aria-label="Ordenar cursos"
                    className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="recientes">Más reciente primero</option>
                    <option value="antiguas">Más antiguo primero</option>
                    <option value="titulo">Título (A-Z)</option>
                  </select>
                </div>
              )}
            </div>

            {mensajeCurso && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-sans transition-all animate-in fade-in duration-200 ${
                  mensajeCurso.tipo === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {mensajeCurso.tipo === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{mensajeCurso.texto}</span>
                </div>
                <button
                  onClick={() => setMensajeCurso(null)}
                  className="text-zinc-400 hover:text-zinc-700 text-xs font-bold ml-3 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {isLoadingData ? (
              <div className="space-y-4 py-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={`course-skel-${i}`}
                    className="border border-zinc-200/90 rounded-2xl p-5 bg-white shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-48 bg-zinc-200/70 rounded-md animate-pulse" />
                      <div className="h-6 w-20 bg-zinc-200/70 rounded-full animate-pulse" />
                    </div>
                    <div className="h-4 w-3/4 bg-zinc-100 rounded-md animate-pulse" />
                  </div>
                ))}
              </div>
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
                    if (cursoSortOrder === 'titulo') {
                      const titA = a.curso?.titulo || '';
                      const titB = b.curso?.titulo || '';
                      return titA.localeCompare(titB, 'es', { sensitivity: 'base' });
                    }
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

                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                        {/* Botón Ver Detalle */}
                        <button
                          type="button"
                          onClick={() => setCursoParaVerDetalle(pc)}
                          className="h-8.5 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-98 text-zinc-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Info className="w-3.5 h-3.5 text-zinc-500" />
                          Ver detalle
                        </button>

                        {/* Botón Comencé a Cursar (solo si está asignado) */}
                        {pc.estado === 'asignado' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleConfirmarInicioCurso(
                                pc.id,
                                pc.curso?.titulo || 'la capacitación'
                              )
                            }
                            disabled={confirmandoCursoId === pc.id}
                            className="h-8.5 px-3.5 rounded-xl bg-brand-800 hover:bg-brand-900 active:scale-98 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                          >
                            {confirmandoCursoId === pc.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Confirmando...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Comencé a cursar
                              </>
                            )}
                          </button>
                        )}

                        {/* Botón No podré asistir (si está asignado) */}
                        {pc.estado === 'asignado' && (
                          <button
                            type="button"
                            onClick={() => setCursoParaBaja(pc)}
                            className="h-8.5 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Avisar que no podrás asistir a la capacitación"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            No podré asistir
                          </button>
                        )}

                        {/* Botón Darme de baja (si ya está en curso) */}
                        {pc.estado === 'en_curso' && (
                          <button
                            type="button"
                            onClick={() => setCursoParaBaja(pc)}
                            className="h-8.5 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-zinc-600 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Informar baja de la cursada"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Darme de baja
                          </button>
                        )}

                        {pc.estado === 'en_curso' && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-full shrink-0">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Cursando actualmente
                          </div>
                        )}

                        {pc.estado === 'completado' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-[#D9EEDF] px-3 py-1.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acreditado
                          </div>
                        )}
                      </div>
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

      {/* Modal: Ficha Detallada de la Capacitación */}
      {cursoParaVerDetalle && (
        <CourseDetailModal
          isOpen={Boolean(cursoParaVerDetalle)}
          asignacion={cursoParaVerDetalle}
          onClose={() => setCursoParaVerDetalle(null)}
        />
      )}

      {/* ConfirmDialog: Motivo de imposibilidad o baja de curso */}
      {cursoParaBaja && (
        <ConfirmDialog
          isOpen={Boolean(cursoParaBaja)}
          title={
            cursoParaBaja.estado === 'asignado'
              ? '¿No podrás asistir a la capacitación?'
              : '¿Dar de baja la cursada?'
          }
          description={`Se notificará a la Oficina de Empleo de Funes sobre tu situación para la capacitación "${cursoParaBaja.curso?.titulo || 'Capacitación Municipal'}".`}
          confirmText="Confirmar baja"
          cancelText="Volver"
          variant="destructive"
          requireReason={true}
          reasonLabel="Motivo de la baja o imposibilidad de cursar *"
          reasonPlaceholder="Ej. Conseguí empleo / Incompatibilidad de horarios / Problemas de traslado..."
          isLoading={isSubmittingBaja}
          onConfirm={handleConfirmarBajaCurso}
          onClose={() => {
            if (!isSubmittingBaja) setCursoParaBaja(null);
          }}
        />
      )}
    </div>
  );
}

