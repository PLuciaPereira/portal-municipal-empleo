'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
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
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('perfil');
  const [profileFull, setProfileFull] = useState<PostulanteProfileFull | null>(null);
  const [applications, setApplications] = useState<PostulacionConDetalle[]>([]);
  const [courses, setCourses] = useState<PostulanteCurso[]>([]);
  const [availableRubros, setAvailableRubros] = useState<Rubro[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

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
  const activeApplicationsCount = applications.filter(
    (app) => app.estado !== 'retirado_por_postulante'
  ).length;

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#10231B]">
      {/* 1. Banda Verde Superior Institucional Funes */}
      <section className="bg-gradient-to-r from-[#06402B] to-[#0A3D2A] text-white pt-10 pb-8 border-b border-[#04281B]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-[760px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDEFE3]/20 border border-[#DDEFE3]/30 text-[#E8F5EE] text-xs font-semibold">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#DDEFE3] text-[#06402B] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  Postulante Activo
                </span>
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight font-display text-white">
                Mi Portal de Postulante
              </h1>
              <p className="mt-2 text-[#D6EADD] text-sm sm:text-base leading-relaxed max-w-[620px]">
                Gestioná tu perfil laboral, administrá tus currículums vitae y hacé el seguimiento continuo de tus postulaciones ante la Oficina de Empleo de Funes.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/ofertas"
                className="min-h-[46px] px-6 rounded-full bg-[#F2B84B] hover:bg-[#E5AC41] text-[#2B1D00] font-bold text-sm inline-flex items-center gap-2 transition-all shadow-sm hover:-translate-y-0.5"
              >
                <Search className="w-4 h-4 stroke-[2.4]" />
                Explorar Ofertas Laborales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Barra de Navegación por Pestañas (Sticky, navegación dinámica sin recarga) */}
      <div className="bg-white border-b border-[#E0E8E1]">
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
              <User className="w-4 h-4" />
              Mi Perfil
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'postulaciones'}
              onClick={() => setActiveTab('postulaciones')}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'postulaciones'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Mis Postulaciones
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'postulaciones'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#DDEFE3] text-[#0A3D2A]'
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
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cursos'
                  ? 'bg-[#0E4D36] text-white shadow-xs'
                  : 'text-[#4B6256] hover:text-[#10231B] hover:bg-[#F4F8F4]'
              }`}
            >
              <Award className="w-4 h-4" />
              Mis Cursos y Capacitaciones
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'cursos'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {courses.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Contenedor de Contenido Principal */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        
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
          <div className="flex flex-col lg:flex-row items-start gap-6">
            
            {/* Columna Lateral (360px): Datos Personales y Contacto */}
            <aside className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4">
              <section className="bg-white border border-[#E0E8E1] rounded-[24px] overflow-hidden shadow-xs">
                
                {/* Cabecera de la tarjeta con avatar grande */}
                <div className="text-center p-6 bg-gradient-to-b from-[#F4F8F4] to-white border-b border-[#E0E8E1] relative">
                  {displayProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      aria-label="Editar datos personales"
                      title="Editar datos personales"
                      className="absolute top-4 right-4 w-9 h-9 rounded-full border border-[#D3DED5] bg-white text-[#10231B] flex items-center justify-center hover:bg-zinc-50 transition-colors cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-4 h-4 text-[#4B6256]" />
                    </button>
                  )}

                  <div className="w-20 h-20 mx-auto rounded-full bg-[#DDEFE3] text-[#0A3D2A] flex items-center justify-center font-extrabold text-3xl font-display shadow-xs border-2 border-white">
                    {initialLetter}
                  </div>

                  <h3 className="mt-3 font-extrabold text-xl leading-tight text-zinc-900 font-display">
                    {displayProfile?.nombre} {displayProfile?.apellido}
                  </h3>
                  <div className="text-xs text-[#4B6256] mt-0.5 truncate max-w-[260px] mx-auto">
                    {user?.email || 'Postulante registrado'}
                  </div>

                  <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DDEFE3] text-[#0A3D2A] text-xs font-bold">
                    <Sparkles className="w-3 h-3" />
                    Búsqueda activa
                  </div>
                </div>

                {/* Lista de Datos Personales */}
                <div className="p-6 space-y-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">DNI</span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayProfile?.dni || 'No informado'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">Teléfono / WhatsApp</span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayProfile?.telefono || 'No informado'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">Localidad</span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayProfile?.localidad || (displayProfile?.es_residente_funes ? 'Funes' : 'No especificada')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 pt-3 border-t border-[#EEF2EE]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A7064]">Domicilio</span>
                    <span className="font-bold text-sm text-zinc-900">
                      {displayProfile?.direccion || 'No especificado'}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-[#EEF2EE]">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="w-full min-h-[42px] rounded-full border border-[#0E4D36] bg-white text-[#0E4D36] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#F4F8F4] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Actualizar datos personales
                    </button>
                  </div>
                </div>
              </section>

              {/* Leyenda de resguardo municipal */}
              <div className="p-4 rounded-2xl bg-[#E4F1E8] text-[#0A3D2A] text-xs leading-relaxed flex items-start gap-2.5 border border-[#BFE0CB]">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#0E4D36]" />
                <span>
                  Tus datos personales y de contacto están resguardados por la Oficina de Empleo del Gobierno de Funes bajo la política municipal de privacidad.
                </span>
              </div>
            </aside>

            {/* Columna Principal: Trayectoria, Formación y CVs */}
            <main className="w-full flex-1 min-w-0 flex flex-col gap-6">
              
              {/* Tarjeta: Perfil Laboral y Formación */}
              <section className="bg-white border border-[#E0E8E1] rounded-[24px] p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#EEF2EE]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF3EC] text-[#0E4D36] flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 font-display">
                        Perfil Laboral y Formación
                      </h2>
                      <p className="text-xs sm:text-sm text-[#4B6256]">
                        Experiencia previa, disponibilidad y competencias para búsquedas laborales.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-4 py-2 rounded-full border border-[#D3DED5] hover:bg-zinc-50 font-bold text-xs sm:text-sm text-[#10231B] transition-colors cursor-pointer shrink-0"
                  >
                    Editar
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  {/* Resumen de Experiencia */}
                  <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E0E8E1]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A7064] block">
                      Resumen de Experiencia
                    </span>
                    <p className="text-sm mt-1.5 text-zinc-800 leading-relaxed">
                      {displayProfile?.experiencia_resumen ||
                        'Aún no registraste una descripción de tu trayectoria laboral.'}
                    </p>
                  </div>

                  {/* Grid de atributos laborales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex gap-3 items-start p-3.5 rounded-xl border border-[#EEF2EE] bg-white">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF3EC] text-[#0E4D36] flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs text-[#5A7064] font-medium">Nivel educativo</div>
                        <div className="font-bold text-sm text-zinc-900 mt-0.5">
                          {displayProfile?.nivel_educativo || 'No especificado'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3.5 rounded-xl border border-[#EEF2EE] bg-white">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF3EC] text-[#0E4D36] flex items-center justify-center shrink-0 mt-0.5">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs text-[#5A7064] font-medium">Situación actual</div>
                        <div className="font-bold text-sm text-zinc-900 mt-0.5">
                          {displayProfile?.situacion_laboral_actual || 'No informada'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3.5 rounded-xl border border-[#EEF2EE] bg-white">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF3EC] text-[#0E4D36] flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs text-[#5A7064] font-medium">Disponibilidad horaria</div>
                        <div className="font-bold text-sm text-zinc-900 mt-0.5">
                          {displayProfile?.disponibilidad_horaria || 'No informada'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3.5 rounded-xl border border-[#EEF2EE] bg-white">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF3EC] text-[#0E4D36] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs text-[#5A7064] font-medium">Movilidad propia</div>
                        <div className="font-bold text-sm text-zinc-900 mt-0.5">
                          {displayProfile?.movilidad_propia ? 'Con movilidad propia' : 'Sin movilidad propia'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Habilidades y Oficios */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A7064] block mb-2">
                      Habilidades y Oficios Declarados
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {displayProfile?.habilidades && displayProfile.habilidades.length > 0 ? (
                        displayProfile.habilidades.map((h, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full border border-[#D3DED5] text-xs sm:text-sm font-semibold text-zinc-800 bg-[#F8FAF8]"
                          >
                            {h}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Sin habilidades registradas</span>
                      )}
                    </div>
                  </div>

                  {/* Rubros de Interés Laboral */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5A7064] block mb-2">
                      Rubros de Interés en Funes
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {displayProfile?.rubros && displayProfile.rubros.length > 0 ? (
                        displayProfile.rubros.map((r) => (
                          <span
                            key={r.id}
                            className="px-3 py-1 rounded-full bg-[#DDEFE3] text-[#0A3D2A] text-xs sm:text-sm font-bold border border-[#BFE0CB]"
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
              </section>

              {/* Tarjeta: Gestión de Currículums Vitae (CV) */}
              <CurriculumManager
                curriculums={profileFull?.curriculums || []}
                isLoading={isLoadingData}
                onChanged={handleDataChanged}
              />
            </main>
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
          <section className="bg-white border border-[#E0E8E1] rounded-[24px] p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#EEF2EE]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 font-display">
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
              <div className="mt-8 border-[1.5px] border-dashed border-[#C3D1C7] rounded-[20px] p-8 sm:p-12 flex flex-col items-center text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-[20px] bg-[#E4F1E8] text-[#0E4D36] flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 font-display">
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
              <div className="mt-6 divide-y divide-[#E0E8E1] border border-[#E0E8E1] rounded-[18px] overflow-hidden bg-white">
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
