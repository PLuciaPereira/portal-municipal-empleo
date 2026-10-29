'use client';

import React, { useState, useMemo } from 'react';
import { Empresa, EstadoEmpresa } from '@/types/database';
import { CompanyStatusBadge } from './CompanyStatusBadge';
import { CompanyDetailModal } from './CompanyDetailModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  MapPin,
  Mail,
  AlertCircle,
  Check,
  Building,
} from 'lucide-react';
import { aprobarEmpresa, rechazarEmpresa } from '@/lib/admin';

interface CompaniesTableProps {
  empresas: Empresa[];
  loading?: boolean;
  onRefresh: () => void;
}

type FilterEstado = EstadoEmpresa | 'todas';

export function CompaniesTable({ empresas, loading, onRefresh }: CompaniesTableProps) {
  const [filterEstado, setFilterEstado] = useState<FilterEstado>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [empresaToApprove, setEmpresaToApprove] = useState<Empresa | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const [empresaToReject, setEmpresaToReject] = useState<Empresa | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // Estados de acción
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Filtrado reactivo en cliente para respuesta inmediata
  const filteredEmpresas = useMemo(() => {
    return empresas.filter((emp) => {
      // Filtro de estado
      if (filterEstado !== 'todas' && emp.estado !== filterEstado) {
        return false;
      }
      // Filtro de texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (emp.nombre_fantasia || '').toLowerCase().includes(q);
        const matchesRazon = (emp.razon_social || '').toLowerCase().includes(q);
        const matchesCuit = (emp.cuit || '').toLowerCase().includes(q);
        const matchesLocalidad = (emp.localidad || '').toLowerCase().includes(q);
        const matchesRubro = (emp.rubro || '').toLowerCase().includes(q);
        return matchesName || matchesRazon || matchesCuit || matchesLocalidad || matchesRubro;
      }
      return true;
    });
  }, [empresas, filterEstado, searchTerm]);

  // Contadores por estado
  const counts = useMemo(() => {
    return {
      todas: empresas.length,
      pendientes: empresas.filter((e) => e.estado === 'pendiente').length,
      aprobadas: empresas.filter((e) => e.estado === 'aprobada').length,
      rechazadas: empresas.filter((e) => e.estado === 'rechazada').length,
    };
  }, [empresas]);

  // Manejar apertura de modal de detalle
  const handleOpenDetail = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setIsDetailModalOpen(true);
  };

  // Solicitar confirmación de Aprobación
  const handleInitiateApprove = (empresa: Empresa) => {
    setEmpresaToApprove(empresa);
    setIsApproveDialogOpen(true);
  };

  // Ejecutar Aprobación
  const handleConfirmApprove = async () => {
    if (!empresaToApprove) return;
    setActionLoading(true);
    setFeedback(null);

    const res = await aprobarEmpresa(empresaToApprove.id);
    setActionLoading(false);
    setIsApproveDialogOpen(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `La empresa "${empresaToApprove.nombre_fantasia || empresaToApprove.razon_social}" fue aprobada exitosamente y quedó habilitada para operar.`,
      });
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      onRefresh();
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'No se pudo aprobar la empresa.',
      });
    }
  };

  // Solicitar confirmación de Rechazo
  const handleInitiateReject = (empresa: Empresa) => {
    setEmpresaToReject(empresa);
    setIsRejectDialogOpen(true);
  };

  // Ejecutar Rechazo
  const handleConfirmReject = async (motivo?: string) => {
    if (!empresaToReject) return;
    if (!motivo || !motivo.trim()) {
      setFeedback({
        type: 'error',
        message: 'Debe ingresar un motivo obligatorio para el rechazo.',
      });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    const res = await rechazarEmpresa(empresaToReject.id, motivo);
    setActionLoading(false);
    setIsRejectDialogOpen(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `La empresa "${empresaToReject.nombre_fantasia || empresaToReject.razon_social}" fue rechazada y se registró el motivo correspondiente.`,
      });
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      onRefresh();
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'No se pudo procesar el rechazo de la empresa.',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Mensaje de feedback */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        {/* Pestañas de estado */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterEstado('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filterEstado === 'todas'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Todas ({counts.todas})
          </button>

          <button
            onClick={() => setFilterEstado('pendiente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterEstado === 'pendiente'
                ? 'bg-amber-100/80 text-amber-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendientes ({counts.pendientes})
          </button>

          <button
            onClick={() => setFilterEstado('aprobada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterEstado === 'aprobada'
                ? 'bg-emerald-100/80 text-emerald-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aprobadas ({counts.aprobadas})
          </button>

          <button
            onClick={() => setFilterEstado('rechazada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterEstado === 'rechazada'
                ? 'bg-rose-100/80 text-rose-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rechazadas ({counts.rechazadas})
          </button>
        </div>

        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por razón social, CUIT, rubro..."
            className="pl-9 h-10 text-xs w-full bg-zinc-50 border-zinc-200"
          />
        </div>
      </div>

      {/* Tabla de Empresas */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm space-y-3">
            <div className="w-8 h-8 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Cargando padrón de empresas...</p>
          </div>
        ) : filteredEmpresas.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                filterEstado === 'pendiente'
                  ? 'No hay empresas pendientes'
                  : 'No se encontraron empresas'
              }
              description={
                searchTerm
                  ? `No hay empresas que coincidan con la búsqueda "${searchTerm}".`
                  : filterEstado === 'pendiente'
                  ? 'Todas las altas comerciales han sido revisadas.'
                  : 'No existen registros de empresas en esta categoría.'
              }
              action={
                searchTerm
                  ? {
                      label: 'Limpiar búsqueda',
                      onClick: () => setSearchTerm(''),
                      variant: 'outline',
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4">CUIT y Rubro</th>
                  <th className="py-3.5 px-4">Ubicación y Contacto</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Fecha de Alta</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredEmpresas.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-zinc-50/60 transition-colors group"
                  >
                    {/* Empresa */}
                    <td className="py-3.5 px-4 font-medium text-zinc-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-900 flex items-center justify-center font-bold shrink-0">
                          <Building className="w-4 h-4 text-brand-800" />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 block leading-tight">
                            {emp.nombre_fantasia || emp.razon_social}
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            {emp.razon_social}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* CUIT & Rubro */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-zinc-800 block font-semibold text-[11px]">
                        {emp.cuit}
                      </span>
                      <span className="text-[11px] text-zinc-500 block truncate max-w-[150px]">
                        {emp.rubro || 'Sin rubro'}
                      </span>
                    </td>

                    {/* Ubicación & Contacto */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-zinc-800 font-medium">
                        <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>{emp.localidad}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{emp.email_contacto}</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4">
                      <CompanyStatusBadge estado={emp.estado} />
                    </td>

                    {/* Fecha de Alta */}
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px] whitespace-nowrap">
                      {new Date(emp.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(emp)}
                          className="h-8 px-2 text-zinc-600 hover:text-zinc-900 gap-1 text-xs"
                          title="Ver ficha completa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ficha</span>
                        </Button>

                        {/* Si está pendiente: opciones de Aprobar o Rechazar */
                        emp.estado === 'pendiente' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleInitiateApprove(emp)}
                              disabled={actionLoading}
                              className="h-8 px-2.5 bg-brand-800 hover:bg-brand-900 text-xs gap-1"
                              title="Aprobar empresa"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Aprobar</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleInitiateReject(emp)}
                              disabled={actionLoading}
                              className="h-8 px-2.5 text-xs gap-1"
                              title="Rechazar empresa"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Rechazar</span>
                            </Button>
                          </>
                        )}

                        {/* Si ya está aprobada: no puede volver a aprobarse, solo dar de baja / inhabilitar si fuera necesario */}
                        {emp.estado === 'aprobada' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleInitiateReject(emp)}
                            disabled={actionLoading}
                            className="h-8 px-2.5 text-xs gap-1"
                            title="Inhabilitar / Rechazar empresa"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Inhabilitar</span>
                          </Button>
                        )}

                        {/* Si está rechazada: estado terminal. No permite aprobar ni volver a rechazar sin reactivación explícita */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle Completo de la Empresa */}
      <CompanyDetailModal
        empresa={selectedEmpresa}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onApprove={(emp) => {
          setIsDetailModalOpen(false);
          handleInitiateApprove(emp);
        }}
        onReject={(emp) => {
          setIsDetailModalOpen(false);
          handleInitiateReject(emp);
        }}
      />

      {/* ConfirmDialog: Aprobación */}
      <ConfirmDialog
        isOpen={isApproveDialogOpen}
        onClose={() => setIsApproveDialogOpen(false)}
        onConfirm={handleConfirmApprove}
        title="¿Aprobar habilitación de la empresa?"
        description={
          empresaToApprove
            ? `La empresa "${empresaToApprove.nombre_fantasia || empresaToApprove.razon_social}" (CUIT ${empresaToApprove.cuit}) quedará aprobada formalmente. Podrá crear y publicar ofertas laborales y recibir candidatos derivados de la Oficina de Empleo.`
            : ''
        }
        confirmText="Aprobar Empresa"
        variant="primary"
        isLoading={actionLoading}
      />

      {/* ConfirmDialog: Rechazo con Motivo Obligatorio */}
      <ConfirmDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        title="Rechazar solicitud de empresa"
        description={
          empresaToReject
            ? `Ingrese el motivo formal del rechazo para la empresa "${empresaToReject.nombre_fantasia || empresaToReject.razon_social}". El motivo quedará registrado institucionalmente y será notificado a la empresa.`
            : ''
        }
        confirmText="Confirmar Rechazo"
        variant="destructive"
        requireReason={true}
        reasonLabel="Motivo del Rechazo (Obligatorio)"
        reasonPlaceholder="Ej: El CUIT ingresado no se encuentra vigente o la actividad no coincide con el rubro declarado..."
        isLoading={actionLoading}
      />
    </div>
  );
}
