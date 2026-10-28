'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Briefcase,
  Building2,
  GraduationCap,
  TrendingUp,
  MapPin,
  XCircle,
  FileText,
  Clock,
  RefreshCw,
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
        <p className="text-sm font-medium text-slate-600">Calculando estadísticas e indicadores municipales...</p>
      </div>
    );
  }

  const { postulantes, ofertas, intermediacion, capacitacion, empresas } = stats;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Barra superior de actualización */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[var(--color-brand-800)]" />
            Tablero de Estadísticas de Gestión e Inserción Laboral
          </h2>
          <p className="text-sm text-slate-600">
            Métricas oficiales agregadas basadas en registros del Portal de Empleo de la Municipalidad de Funes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar Datos'}
        </Button>
      </div>

      {/* SECCIÓN 1: Residentes de Funes e Inserción Local */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[var(--color-brand-800)]" />
          Padrón de Postulantes e Impacto Local (Prioridad Funes)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-[var(--color-brand-800)] bg-white shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Postulantes</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{postulantes.total}</p>
            <p className="text-xs text-slate-500 mt-1">Perfiles activos registrados</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-600 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Residentes de Funes</p>
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                {postulantes.porcentajeFunes}% del total
              </span>
            </div>
            <p className="text-3xl font-extrabold text-emerald-950 mt-2">{postulantes.residentesFunes}</p>
            <p className="text-xs text-slate-500 mt-1">Vecinos de la ciudad</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-blue-600 bg-white shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Otras Localidades</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{postulantes.otrasLocalidades}</p>
            <p className="text-xs text-slate-500 mt-1">Zonas y ciudades aledañas</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-600 bg-white shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-900">Inserciones Efectivas</p>
            <p className="text-3xl font-extrabold text-purple-950 mt-2">{intermediacion.contratados}</p>
            <p className="text-xs text-slate-500 mt-1">Contrataciones confirmadas</p>
          </Card>
        </div>

        {/* Barra de progreso de prioridad local */}
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
            <span>Representación local en el portal</span>
            <span>{postulantes.porcentajeFunes}% Vecinos de Funes</span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-800)] transition-all duration-500"
              style={{ width: `${postulantes.porcentajeFunes}%` }}
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Embudo Operativo de Intermediación Municipal */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[var(--color-brand-800)]" />
          Embudo de Intermediación de la Oficina de Empleo
        </h3>
        <Card className="p-5 bg-white shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Postulaciones</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{intermediacion.totalPostulaciones}</p>
              <span className="text-[11px] text-slate-400">Total recibidas</span>
            </div>
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-xs font-semibold text-amber-700 uppercase">En Revisión</span>
              <p className="text-2xl font-bold text-amber-900 mt-1">{intermediacion.enRevision}</p>
              <span className="text-[11px] text-slate-400">Por filtrar</span>
            </div>
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-xs font-semibold text-blue-700 uppercase">Preseleccionados</span>
              <p className="text-2xl font-bold text-blue-900 mt-1">{intermediacion.preseleccionados}</p>
              <span className="text-[11px] text-slate-400">Cumplen requisitos</span>
            </div>
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-xs font-semibold text-indigo-700 uppercase">Entrevistas</span>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{intermediacion.entrevistasRegistradas}</p>
              <span className="text-[11px] text-slate-400">Previas realizadas</span>
            </div>
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Derivados</span>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{intermediacion.presentadosAEmpresa}</p>
              <span className="text-[11px] text-slate-400">Enviados a empresas</span>
            </div>
            <div className="pt-2 sm:pt-0 sm:px-2">
              <span className="text-xs font-semibold text-purple-700 uppercase">Contratados</span>
              <p className="text-2xl font-bold text-purple-900 mt-1">{intermediacion.contratados}</p>
              <span className="text-[11px] text-purple-600 font-semibold">Exitosas</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500" />
              Rechazados por Empresas con motivo: <strong>{intermediacion.rechazadosPorEmpresa}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Retirados voluntariamente por el postulante: <strong>{intermediacion.retiradosPorPostulante}</strong>
            </span>
          </div>
        </Card>
      </div>

      {/* SECCIÓN 3: Gestión de Ofertas, Empresas y Capacitaciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ofertas */}
        <Card className="p-5 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-brand-800)]" />
              Ofertas Laborales
            </h4>
            <span className="text-xs font-bold text-slate-500">Total: {ofertas.total}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Publicadas activas</span>
              <strong className="text-emerald-700">{ofertas.publicadas}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Pendientes de revisión</span>
              <strong className="text-amber-700">{ofertas.pendientesRevision}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Borradores empresa</span>
              <strong className="text-slate-700">{ofertas.borradores}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Finalizadas con éxito</span>
              <strong className="text-blue-700">{ofertas.finalizadas}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Dadas de baja (con motivo)</span>
              <strong className="text-slate-500">{ofertas.dadasDeBaja}</strong>
            </div>
          </div>
        </Card>

        {/* Empresas */}
        <Card className="p-5 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--color-brand-800)]" />
              Empresas Registradas
            </h4>
            <span className="text-xs font-bold text-slate-500">Total: {empresas.total}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Aprobadas / Verificadas</span>
              <strong className="text-emerald-700">{empresas.aprobadas}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Pendientes de validación</span>
              <strong className="text-amber-700">{empresas.pendientes}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Rechazadas con motivo</span>
              <strong className="text-rose-700">{empresas.rechazadas}</strong>
            </div>
          </div>
        </Card>

        {/* Capacitación */}
        <Card className="p-5 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[var(--color-brand-800)]" />
              Cursos y Formación
            </h4>
            <span className="text-xs font-bold text-slate-500">Total: {capacitacion.totalCursos}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Cursos municipales activos</span>
              <strong className="text-emerald-700">{capacitacion.cursosActivos}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Postulantes derivados</span>
              <strong className="text-indigo-700">{capacitacion.postulantesDerivadosACursos}</strong>
            </div>
            <div className="pt-2 text-xs text-slate-500">
              Derivaciones realizadas desde la Oficina de Empleo para mejorar la empleabilidad local.
            </div>
          </div>
        </Card>
      </div>

      {/* SECCIÓN 4: Distribución de Ofertas e Inserciones por Rubro */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--color-brand-800)]" />
          Demanda y Contrataciones por Rubro Laboral
        </h3>
        <Card className="p-5 bg-white shadow-xs overflow-x-auto">
          {rubroStats.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No hay datos de rubros registrados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="pb-3">Rubro o Sector</th>
                  <th className="pb-3 text-center">Ofertas Creadas</th>
                  <th className="pb-3 text-center">Inserciones Logradas</th>
                  <th className="pb-3 text-right">Efectividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rubroStats.map((item) => {
                  const efectividad = item.totalOfertas > 0
                    ? Math.round((item.totalContratados / item.totalOfertas) * 100)
                    : 0;

                  return (
                    <tr key={item.rubroId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-medium text-slate-900">{item.nombreRubro}</td>
                      <td className="py-2.5 text-center text-slate-700">{item.totalOfertas}</td>
                      <td className="py-2.5 text-center font-bold text-emerald-800">{item.totalContratados}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${
                          item.totalContratados > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.totalContratados > 0 ? `${efectividad}%` : '0'}
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
