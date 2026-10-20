'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge, BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  SearchIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';
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
} from 'lucide-react';

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

  return (
    <PageContainer>
      <PageHeader
        title="Mi Portal de Postulante"
        description="Gestioná tus datos personales y laborales, tus currículums vitae, el seguimiento de tus postulaciones y tus capacitaciones municipales."
        badge={<Badge variant="emerald">Postulante Activo</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {displayProfile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                Editar mi perfil
              </Button>
            )}
            <Button
              href="/ofertas"
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <SearchIcon className="w-4 h-4" />
              Explorar Ofertas Laborales
            </Button>
          </div>
        }
      />

      {/* Aviso sugerido si faltan datos clave en el perfil */}
      {!isLoadingData && isProfileIncomplete && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-900">
                Completá tu perfil laboral para mejorar tu posicionamiento
              </span>
              <span>
                Agregar tu nivel educativo, experiencia, habilidades y rubros de interés ayuda a la Oficina de Empleo de Funes a preseleccionarte más rápido.
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="shrink-0 bg-white"
          >
            Completar ahora
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Perfil Personal y Laboral */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0">
                    {displayProfile?.nombre?.charAt(0) || 'P'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-zinc-900 leading-tight truncate">
                      {displayProfile?.nombre} {displayProfile?.apellido}
                    </h2>
                    <span className="text-xs text-zinc-500 block truncate">
                      {user?.email || 'Postulante registrado'}
                    </span>
                  </div>
                </div>

                {displayProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-brand-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                    title="Editar perfil"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Datos Personales */}
              <div className="space-y-2 pt-3 border-t border-zinc-100 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">DNI:</span>
                  <span className="font-semibold text-zinc-800">
                    {displayProfile?.dni || 'No cargado'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Teléfono / WhatsApp:</span>
                  <span className="font-semibold text-zinc-800">
                    {displayProfile?.telefono || 'No cargado'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Localidad:</span>
                  <span className="font-semibold text-zinc-800">
                    {displayProfile?.localidad ||
                      (displayProfile?.es_residente_funes ? 'Funes' : 'No especificada')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Condición municipal:</span>
                  <Badge
                    variant={displayProfile?.es_residente_funes ? 'emerald' : 'zinc'}
                    size="sm"
                  >
                    {displayProfile?.es_residente_funes
                      ? 'Residente de Funes'
                      : 'Otra localidad'}
                  </Badge>
                </div>
                {displayProfile?.direccion && (
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Domicilio:</span>
                    <span className="font-semibold text-zinc-800 text-right">
                      {displayProfile.direccion}
                    </span>
                  </div>
                )}
              </div>

              {/* Resumen Laboral y Educativo */}
              <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
                <h3 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                  Perfil Laboral y Formación
                </h3>

                <div className="space-y-1.5 text-zinc-600">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-zinc-500 block text-[11px]">
                        Nivel educativo:
                      </span>
                      <span className="font-semibold text-zinc-800">
                        {displayProfile?.nivel_educativo || 'Sin especificar'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-zinc-500 block text-[11px]">
                        Situación actual:
                      </span>
                      <span className="font-semibold text-zinc-800">
                        {displayProfile?.situacion_laboral_actual || 'Sin especificar'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-zinc-500 block text-[11px]">
                        Disponibilidad y movilidad:
                      </span>
                      <span className="font-semibold text-zinc-800">
                        {displayProfile?.disponibilidad_horaria || 'A convenir'} &bull;{' '}
                        {displayProfile?.movilidad_propia
                          ? 'Con movilidad propia'
                          : 'Sin movilidad propia'}
                      </span>
                    </div>
                  </div>
                </div>

                {displayProfile?.experiencia_resumen && (
                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 text-zinc-700">
                    <span className="text-[11px] font-semibold text-zinc-500 block mb-0.5">
                      Resumen de experiencia:
                    </span>
                    <p className="leading-relaxed">{displayProfile.experiencia_resumen}</p>
                  </div>
                )}

                {/* Habilidades */}
                {displayProfile?.habilidades && displayProfile.habilidades.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-zinc-500 block">
                      Habilidades y oficios:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {displayProfile.habilidades.map((hab) => (
                        <Badge key={hab} variant="zinc" size="sm">
                          {hab}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rubros de interés */}
                {profileFull?.rubros && profileFull.rubros.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] text-zinc-500 block">
                      Rubros de interés laboral:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profileFull.rubros.map((rubro) => (
                        <Badge key={rubro.id} variant="emerald" size="sm">
                          {rubro.nombre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="w-full justify-center text-xs"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Actualizar datos de mi perfil
              </Button>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60 text-xs text-emerald-950 flex items-start gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Tus datos privados están resguardados por la Oficina de Empleo de Funes conforme a la política municipal de privacidad.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Gestión de CVs, Historial de Postulaciones y Cursos */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gestión de hasta 5 CVs activos */}
          <CurriculumManager
            curriculums={profileFull?.curriculums || []}
            isLoading={isLoadingData}
            onChanged={handleDataChanged}
          />

          {/* Historial de Postulaciones y Retiro Voluntario */}
          <ApplicationsHistoryList
            applications={applications}
            isLoading={isLoadingData}
            onChanged={handleDataChanged}
          />

          {/* Cursos y Capacitaciones asignadas por la Oficina de Empleo */}
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900">
                      Mis Cursos y Capacitaciones Municipales
                    </h3>
                    <Badge variant="blue" size="sm">
                      {courses.length} {courses.length === 1 ? 'asignado' : 'asignados'}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Trayectos formativos sugeridos o asignados por la Oficina de Empleo para fortalecer tu empleabilidad.
                  </p>
                </div>
              </div>

              {isLoadingData ? (
                <div className="h-20 rounded-xl bg-zinc-100 animate-pulse" />
              ) : courses.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="w-7 h-7 text-brand-800" />}
                  title="No tenés cursos asignados por el momento"
                  description="Cuando un orientador de la Oficina de Empleo de Funes te inscriba o recomiende un taller de formación laboral, aparecerá aquí con su estado de cursado."
                />
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white">
                  {courses.map((pc) => {
                    const badgeConfig =
                      CURSO_STATUS_BADGE[pc.estado] || {
                        label: pc.estado,
                        variant: 'zinc' as const,
                      };
                    const formattedDate = new Date(
                      pc.fecha_asignacion
                    ).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={pc.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900">
                              {pc.curso?.titulo || 'Curso de Formación Laboral'}
                            </span>
                            <Badge variant={badgeConfig.variant} size="sm">
                              {badgeConfig.label}
                            </Badge>
                          </div>

                          {pc.curso?.descripcion && (
                            <p className="text-xs text-zinc-600">
                              {pc.curso.descripcion}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                            {pc.curso?.institucion && (
                              <span>Institución: {pc.curso.institucion}</span>
                            )}
                            {pc.curso?.duracion && (
                              <span>Duración: {pc.curso.duracion}</span>
                            )}
                            <span>Asignado el {formattedDate}</span>
                          </div>

                          {pc.observaciones && (
                            <p className="text-xs text-emerald-800 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 mt-1">
                              Nota de la Oficina de Empleo: {pc.observaciones}
                            </p>
                          )}
                        </div>

                        {pc.estado === 'completado' && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Acreditado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isEditModalOpen && displayProfile && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          profile={displayProfile}
          availableRubros={availableRubros}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={handleDataChanged}
        />
      )}
    </PageContainer>
  );
}
