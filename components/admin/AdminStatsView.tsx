'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Briefcase,
  Building2,
  GraduationCap,
  TrendingUp,
  MapPin,
  XCircle,
  Clock,
  RefreshCw,
  Users,
  CheckCircle2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getMunicipalStats, getRubroDistributionStats, MunicipalStats, RubroDistributionStat } from '@/lib/stats';

export function AdminStatsView() {
  const [stats, setStats] = useState<MunicipalStats | null>(null);
  const [rubroStats, setRubroStats] = useState<RubroDistributionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [sData, rData] = await Promise.all([
        getMunicipalStats(),
        getRubroDistributionStats(),
      ]);
      setStats(sData);
      setRubroStats(rData);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isMounted) return;
      await loadData();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="w-8 h-8 text-[var(--color-brand-800)] animate-spin mb-3" />
        <p className="text-sm font-medium text-zinc-600">Calculando estadísticas e indicadores municipales...</p>
      </div>
    );
  }

  const { postulantes, ofertas, intermediacion, capacitacion, empresas } = stats;

  return (
    <div className="space-y-6 animate-fadeIn pb-8 select-none">
      {/* Barra superior de actualización informativa */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-200/90">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-brand-800)]" />
            Estadísticas y Métricas de Gestión Municipal
          </h2>
          <p className="text-xs text-zinc-500">
            Métricas oficiales y consolidadas basadas en el Padrón Municipal y la Oficina de Empleo de Funes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto gap-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar Datos'}
        </Button>
      </div>

      {/* ============================================================== */}
      {/* BLOQUE 1: INDICADORES CLAVE E IMPACTO LOCAL EN FUNES          */}
      {/* ============================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[var(--color-brand-800)]" />
            Impacto local y cobertura territorial (Funes)
          </h3>
          <span className="text-[11px] text-zinc-500 font-medium">Prioridad de inserción ciudadana</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* 1. Vecinos de Funes */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-center justify-between gap-3 cursor-default">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block truncate">
                Residentes de Funes
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-emerald-950 tabular-nums leading-none">
                  {postulantes.residentesFunes}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md leading-none border border-emerald-300/50">
                  {postulantes.porcentajeFunes}% del padrón
                </span>
              </div>
              <span className="text-[11px] text-emerald-700/90 block truncate mt-1">
                Vecinos con domicilio en la ciudad
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
          </div>

          {/* 2. Total Padrón Activo */}
          <div className="p-3.5 rounded-xl border border-zinc-200/90 bg-white flex items-center justify-between gap-3 cursor-default">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block truncate">
                Padrón Activo Total
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-zinc-900 tabular-nums leading-none">
                  {postulantes.total}
                </span>
                <span className="text-[10px] font-medium text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded-md leading-none">
                  {postulantes.otrasLocalidades} otras zonas
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 block truncate mt-1">
                Perfiles laborales habilitados
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-50 text-zinc-600 border border-zinc-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* 3. Inserciones Confirmadas */}
          <div className="p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/30 flex items-center justify-between gap-3 cursor-default">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block truncate">
                Inserciones Efectivas
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-purple-950 tabular-nums leading-none">
                  {intermediacion.contratados}
                </span>
                <span className="text-[10px] font-bold text-purple-800 bg-purple-100/90 px-1.5 py-0.5 rounded-md leading-none border border-purple-300/50">
                  Contratados
                </span>
              </div>
              <span className="text-[11px] text-purple-700/90 block truncate mt-1">
                Puestos cubiertos con éxito
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-800 border border-purple-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* 4. Vacantes Activas Publicadas */}
          <div className="p-3.5 rounded-xl border border-zinc-200/90 bg-white flex items-center justify-between gap-3 cursor-default">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block truncate">
                Ofertas Publicadas
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-zinc-900 tabular-nums leading-none">
                  {ofertas.publicadas}
                </span>
                <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md leading-none border border-emerald-200">
                  En convocatoria
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 block truncate mt-1">
                Búsquedas laborales abiertas
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-50 text-zinc-600 border border-zinc-200 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Barra compacta de representatividad territorial */}
        <div className="mt-3 p-3 bg-zinc-50/80 border border-zinc-200/90 rounded-xl">
          <div className="flex justify-between text-xs font-semibold text-zinc-700 mb-1.5">
            <span>Representación comunitaria en el padrón laboral</span>
            <span className="text-emerald-800 font-bold">{postulantes.porcentajeFunes}% Domiciliados en Funes</span>
          </div>
          <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-800)]"
              style={{ width: `${postulantes.porcentajeFunes}%` }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BLOQUE 2: CIRCUITO Y EMBUDO DE INTERMEDIACIÓN MUNICIPAL        */}
      {/* ============================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[var(--color-brand-800)]" />
            Embudo del circuito de intermediación municipal
          </h3>
          <span className="text-[11px] text-zinc-500 font-medium">Desde la inscripción hasta la inserción</span>
        </div>

        <Card className="p-4 bg-white border-zinc-200/90 cursor-default">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
            {/* 1. Recibidas */}
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                Total Recibidas
              </span>
              <p className="text-xl font-extrabold text-zinc-900 mt-0.5 tabular-nums">
                {intermediacion.totalPostulaciones}
              </p>
              <span className="text-[10px] text-zinc-500 font-medium">Inscripciones registradas</span>
            </div>

            {/* 2. En Revisión Técnica */}
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                En Evaluación
              </span>
              <p className="text-xl font-extrabold text-amber-900 mt-0.5 tabular-nums">
                {intermediacion.enRevision + intermediacion.postuladasNuevas}
              </p>
              <span className="text-[10px] text-zinc-500 font-medium">Revisión de perfil y CV</span>
            </div>

            {/* 3. Preseleccionados */}
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                Preseleccionados
              </span>
              <p className="text-xl font-extrabold text-blue-900 mt-0.5 tabular-nums">
                {intermediacion.preseleccionados}
              </p>
              <span className="text-[10px] text-zinc-500 font-medium">Aptos técnicamente</span>
            </div>

            {/* 4. Entrevistados */}
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                Entrevistados
              </span>
              <p className="text-xl font-extrabold text-indigo-900 mt-0.5 tabular-nums">
                {intermediacion.entrevistasRegistradas}
              </p>
              <span className="text-[10px] text-zinc-500 font-medium">Coordinadas o cursadas</span>
            </div>

            {/* 5. Derivados a Empresa */}
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Presentados
              </span>
              <p className="text-xl font-extrabold text-emerald-900 mt-0.5 tabular-nums">
                {intermediacion.presentadosAEmpresa}
              </p>
              <span className="text-[10px] text-zinc-500 font-medium">Derivados a empresas</span>
            </div>

            {/* 6. Contratados */}
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                Contratados
              </span>
              <p className="text-xl font-extrabold text-purple-900 mt-0.5 tabular-nums">
                {intermediacion.contratados}
              </p>
              <span className="text-[10px] text-purple-700 font-bold">Inserciones logradas</span>
            </div>
          </div>

          {/* Métricas complementarias de resolución */}
          <div className="mt-3.5 pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              Rechazos fundados por empresa empleadora: <strong className="text-zinc-900 font-semibold">{intermediacion.rechazadosPorEmpresa}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              Postulaciones retiradas por propia voluntad: <strong className="text-zinc-900 font-semibold">{intermediacion.retiradosPorPostulante}</strong>
            </span>
          </div>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* BLOQUE 3: MERCADO Y ACTORES (OFERTAS, EMPRESAS, CAPACITACIONES) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Ofertas laborales */}
        <Card className="p-4 bg-white border-zinc-200/90 space-y-2.5 cursor-default">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--color-brand-800)]" />
              Ofertas Laborales
            </h4>
            <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
              Total: {ofertas.total}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Publicadas activas</span>
              <strong className="text-emerald-700 font-bold">{ofertas.publicadas}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Pendientes de revisión</span>
              <strong className="text-amber-700 font-bold">{ofertas.pendientesRevision}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Borradores empresa</span>
              <strong className="text-zinc-700 font-semibold">{ofertas.borradores}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Finalizadas con éxito</span>
              <strong className="text-blue-700 font-semibold">{ofertas.finalizadas}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Dadas de baja</span>
              <strong className="text-zinc-500 font-medium">{ofertas.dadasDeBaja}</strong>
            </div>
          </div>
        </Card>

        {/* Empresas registradas */}
        <Card className="p-4 bg-white border-zinc-200/90 space-y-2.5 cursor-default">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[var(--color-brand-800)]" />
              Empresas y Empleadores
            </h4>
            <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
              Total: {empresas.total}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Aprobadas / Verificadas</span>
              <strong className="text-emerald-700 font-bold">{empresas.aprobadas}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Pendientes de validación</span>
              <strong className="text-amber-700 font-bold">{empresas.pendientes}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Rechazadas con motivo</span>
              <strong className="text-rose-700 font-semibold">{empresas.rechazadas}</strong>
            </div>
            <div className="pt-2 text-[11px] text-zinc-500 leading-relaxed">
              Supervisión de personerías, CUIT y verificación documental municipal.
            </div>
          </div>
        </Card>

        {/* Cursos y Formación */}
        <Card className="p-4 bg-white border-zinc-200/90 space-y-2.5 cursor-default">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[var(--color-brand-800)]" />
              Formación Laboral
            </h4>
            <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
              Total: {capacitacion.totalCursos}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Cursos municipales activos</span>
              <strong className="text-emerald-700 font-bold">{capacitacion.cursosActivos}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-50">
              <span className="text-zinc-600">Postulantes derivados</span>
              <strong className="text-indigo-700 font-bold">{capacitacion.postulantesDerivadosACursos}</strong>
            </div>
            <div className="pt-2 text-[11px] text-zinc-500 leading-relaxed">
              Acciones de capacitación para mejorar la calificación de vecinos de Funes.
            </div>
          </div>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* BLOQUE 4: DEMANDA Y CONTRATACIONES POR RUBRO PRODUCTIVO        */}
      {/* ============================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-[var(--color-brand-800)]" />
            Demanda laboral e inserciones por rubro productivo
          </h3>
          <span className="text-[11px] text-zinc-500 font-medium">Ordenado por mayor inserción y demanda</span>
        </div>

        <Card className="p-4 bg-white border-zinc-200/90 overflow-x-auto cursor-default">
          {rubroStats.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">No hay datos de rubros registrados actualmente.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] font-bold uppercase text-zinc-500 tracking-wider">
                  <th className="pb-2.5">Sector / Rubro</th>
                  <th className="pb-2.5 text-center">Ofertas publicadas</th>
                  <th className="pb-2.5 text-center">Inserciones logradas</th>
                  <th className="pb-2.5 text-right">Efectividad de inserción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rubroStats.map((item) => {
                  const efectividad = item.totalOfertas > 0
                    ? Math.round((item.totalContratados / item.totalOfertas) * 100)
                    : 0;

                  return (
                    <tr key={item.rubroId} className="transition-none">
                      <td className="py-2 font-medium text-zinc-900">{item.nombreRubro}</td>
                      <td className="py-2 text-center text-zinc-700">{item.totalOfertas}</td>
                      <td className="py-2 text-center font-bold text-emerald-800">{item.totalContratados}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md font-semibold ${
                          item.totalContratados > 0
                            ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300/50'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {item.totalContratados > 0 ? `${efectividad}%` : '0%'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
