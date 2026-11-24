'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Empresa, EstadoEmpresa } from '@/types/database';
import { CompanyStatusBadge } from './CompanyStatusBadge';
import { CompanyDetailModal } from './CompanyDetailModal';
import { AdminCompanyEditModal } from './AdminCompanyEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
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
  Pencil,
  ArrowUpDown,
} from 'lucide-react';
import { aprobarEmpresa, rechazarEmpresa } from '@/lib/admin';

interface CompaniesTableProps {
  empresas: Empresa[];
  loading?: boolean;
  onRefresh: () => void;
}

type FilterEstado = EstadoEmpresa | 'todas';

export function CompaniesTable({ empresas, loading, onRefresh }: CompaniesTableProps) {
  const [filterEstado, setFilterEstado] = useState<FilterEstado>('pendiente');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'recientes' | 'antiguas' | 'titulo'>('recientes');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 5;

  // Resetear a primera página al cambiar filtros o criterio de orden
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, sortOrder]);

  // Modales
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [empresaToApprove, setEmpresaToApprove] = useState<Empresa | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const [empresaToReject, setEmpresaToReject] = useState<Empresa | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const [empresaToEdit, setEmpresaToEdit] = useState<Empresa | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      // Filtro de texto exhaustivo (nombre, razón social, CUIT, localidad, dirección, rubro, contacto, teléfono, email, sitio web)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (emp.nombre_fantasia || '').toLowerCase().includes(q);
        const matchesRazon = (emp.razon_social || '').toLowerCase().includes(q);
        const matchesCuit = (emp.cuit || '').toLowerCase().includes(q);
        const matchesLocalidad = (emp.localidad || '').toLowerCase().includes(q);
        const matchesDireccion = (emp.direccion || '').toLowerCase().includes(q);
        const matchesRubro = (emp.rubro || '').toLowerCase().includes(q);
        const matchesContacto = (emp.persona_contacto || '').toLowerCase().includes(q);
        const matchesTelefono = (emp.telefono || '').toLowerCase().includes(q);
        const matchesEmail = (emp.email_contacto || '').toLowerCase().includes(q);
        const matchesSitio = (emp.sitio_web || '').toLowerCase().includes(q);
        const matchesDesc = (emp.descripcion || '').toLowerCase().includes(q);
        return (
          matchesName ||
          matchesRazon ||
          matchesCuit ||
          matchesLocalidad ||
          matchesDireccion ||
          matchesRubro ||
          matchesContacto ||
          matchesTelefono ||
          matchesEmail ||
          matchesSitio ||
          matchesDesc
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'titulo') {
        const nameA = a.nombre_fantasia || a.razon_social || '';
        const nameB = b.nombre_fantasia || b.razon_social || '';
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      }
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (sortOrder === 'antiguas') {
        return timeA - timeB;
      }
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [empresas, filterEstado, searchTerm, sortOrder]);

  const totalPages = Math.ceil(filteredEmpresas.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEmpresas = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredEmpresas.slice(start, start + PAGE_SIZE);
  }, [filteredEmpresas, safeCurrentPage, PAGE_SIZE]);

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
    // Abrir modal de edición de datos de la empresa (Admin)
  const handleOpenEdit = (empresa: Empresa) => {
    setEmpresaToEdit(empresa);
    setIsEditModalOpen(true);
  };

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
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-zinc-200 shadow-xs mb-3">
        {/* Pestañas de estado */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-lg overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterEstado('pendiente')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'pendiente'
                ? counts.pendientes > 0
                  ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300/80 shadow-xs ring-1 ring-amber-400/20'
                  : 'bg-white text-zinc-900 shadow-xs'
                : counts.pendientes > 0
                ? 'bg-amber-50/80 text-amber-900 hover:bg-amber-100/80 border border-amber-200/70'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock
              className={`w-3.5 h-3.5 ${
                counts.pendientes > 0 ? 'text-amber-700' : 'text-zinc-500'
              }`}
            />
            <span>Pendientes</span>
            {counts.pendientes > 0 ? (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shadow-2xs ${
                  filterEstado === 'pendiente'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-200 text-amber-950'
                }`}
              >
                {counts.pendientes}
              </span>
            ) : (
              <span className="text-zinc-400 font-normal">({counts.pendientes})</span>
            )}
          </button>

          <button
            onClick={() => setFilterEstado('aprobada')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'aprobada'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aprobadas ({counts.aprobadas})
          </button>

          <button
            onClick={() => setFilterEstado('rechazada')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterEstado === 'rechazada'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rechazadas ({counts.rechazadas})
          </button>

          <button
            onClick={() => setFilterEstado('todas')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filterEstado === 'todas'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Todas ({counts.todas})
          </button>
        </div>

        {/* Buscador y Selector de Orden */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por empresa, CUIT, contacto, email, teléfono, rubro o localidad..."
              className="pl-8 h-8 text-xs w-full bg-zinc-50 border-zinc-200"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 px-2 h-8 rounded-lg border border-zinc-200 text-xs shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-medium hidden sm:inline">Orden:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'recientes' | 'antiguas' | 'titulo')}
              className="bg-transparent text-zinc-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="recientes">Más reciente primero</option>
              <option value="antiguas">Más antiguo primero</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Empresas */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
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
          <div className="overflow-x-auto scroll-smooth">
            <table className="w-full min-w-[950px] text-left text-xs">
              <thead className="bg-zinc-50/80 text-zinc-600 border-b border-zinc-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Empresa</th>
                  <th className="py-3 px-3">CUIT y Rubro</th>
                  <th className="py-3 px-3">Ubicación y contacto</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Fecha de alta</th>
                  {/* Columnas independientes sin título de encabezado */}
                  <th className="py-3 px-1.5 w-24 text-center"></th>
                  <th className="py-3 px-1.5 w-24 text-center"></th>
                  <th className="py-3 px-1.5 w-28 text-center"></th>
                  <th className="py-3 px-1.5 w-32 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {paginatedEmpresas.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-zinc-50/60 transition-colors group"
                  >
                    {/* Empresa */}
                    <td className="py-3 px-3.5 font-medium text-zinc-900">
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
                    <td className="py-3 px-3">
                      <span className="font-mono text-zinc-800 block font-semibold text-[11px]">
                        {emp.cuit}
                      </span>
                      <span className="text-[11px] text-zinc-500 block truncate max-w-[150px]">
                        {emp.rubro || 'Sin rubro'}
                      </span>
                    </td>

                    {/* Ubicación & Contacto */}
                    <td className="py-3 px-3 space-y-0.5">
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
                    <td className="py-3 px-3 whitespace-nowrap">
                      <CompanyStatusBadge estado={emp.estado} />
                    </td>

                    {/* Fecha de alta */}
                    <td className="py-3 px-3 text-zinc-500 text-[11px] whitespace-nowrap">
                      {new Date(emp.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Columna Acción 1: Ficha */}
                    <td className="py-3 px-1.5 text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetail(emp)}
                        className="h-8 px-2.5 text-zinc-600 hover:text-zinc-900 gap-1 text-xs w-full justify-center"
                        title="Ver ficha completa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ficha</span>
                      </Button>
                    </td>

                    {/* Columna Acción 2: Editar */}
                    <td className="py-3 px-1.5 text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(emp)}
                        className="h-8 px-2.5 text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50 gap-1 text-xs w-full justify-center"
                        title="Editar datos de la empresa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </Button>
                    </td>

                    {/* Columna Acción 3: Aprobar */}
                    <td className="py-3 px-1.5 text-center whitespace-nowrap">
                      {emp.estado === 'pendiente' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleInitiateApprove(emp)}
                          disabled={actionLoading}
                          className="h-8 px-2.5 bg-brand-800 hover:bg-brand-900 text-xs gap-1 w-full justify-center"
                          title="Aprobar empresa"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprobar</span>
                        </Button>
                      ) : (
                        <span className="text-zinc-300 select-none">-</span>
                      )}
                    </td>

                    {/* Columna Acción 4: Rechazar / Inhabilitar */}
                    <td className="py-3 px-1.5 text-center whitespace-nowrap">
                      {emp.estado === 'pendiente' ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleInitiateReject(emp)}
                          disabled={actionLoading}
                          className="h-8 px-2.5 text-xs gap-1 w-full justify-center"
                          title="Rechazar empresa"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </Button>
                      ) : emp.estado === 'aprobada' ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleInitiateReject(emp)}
                          disabled={actionLoading}
                          className="h-8 px-2.5 text-xs gap-1 w-full justify-center"
                          title="Inhabilitar / Rechazar empresa"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inhabilitar</span>
                        </Button>
                      ) : (
                        <span className="text-zinc-300 select-none">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {filteredEmpresas.length > PAGE_SIZE && (
          <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredEmpresas.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
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
        onEdit={(emp) => {
          setIsDetailModalOpen(false);
          handleOpenEdit(emp);
        }}
      />

      {/* Modal de Edición Administrativa de la Empresa */}
      <AdminCompanyEditModal
        isOpen={isEditModalOpen}
        empresa={empresaToEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setEmpresaToEdit(null);
        }}
        onSuccess={(updated) => {
          setFeedback({
            type: 'success',
            message: "Los datos de la empresa fueron actualizados exitosamente.",
          });
          onRefresh();
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
