'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getAdministradoresAdmin,
  desactivarAdmin,
  reactivarAdmin,
  AdminUserItem,
} from '@/lib/admin';
import { crearNuevoAdminAction, actualizarDatosAdminAction } from '@/app/admin/actions';
import { AdminFormModal } from './AdminFormModal';
import { AdminEditModal } from './AdminEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  UserCog,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  UserCheck,
  ShieldAlert,
  Pencil,
} from 'lucide-react';

export function AdminsManager() {
  const { user } = useAuth();

  const [administradores, setAdministradores] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Modales
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<AdminUserItem | null>(null);
  const [adminToDeactivate, setAdminToDeactivate] = useState<AdminUserItem | null>(null);
  const [adminToReactivate, setAdminToReactivate] = useState<AdminUserItem | null>(null);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdministradoresAdmin({
        filtro: filtroEstado,
        query: search,
      });
      setAdministradores(data);
    } catch (err) {
      console.error('Error cargando administradores:', err);
      notify('error', 'No se pudo cargar la lista de administradores.');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, search]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  // Manejo de Desactivación (Baja Lógica)
  const handleConfirmDeactivate = async () => {
    if (!adminToDeactivate) return;

    // Validación preventiva en UI: No auto-desactivarse
    if (adminToDeactivate.id === user?.id) {
      notify('error', 'Operación denegada: Un administrador no puede desactivar su propia cuenta.');
      setAdminToDeactivate(null);
      return;
    }

    const res = await desactivarAdmin(adminToDeactivate.id);
    if (res.success) {
      notify('success', `Administrador ${adminToDeactivate.nombre} desactivado con éxito.`);
      void loadAdmins();
    } else {
      notify('error', res.error || 'No se pudo desactivar el administrador.');
    }
    setAdminToDeactivate(null);
  };

  // Manejo de Reactivación
  const handleConfirmReactivate = async () => {
    if (!adminToReactivate) return;

    const res = await reactivarAdmin(adminToReactivate.id);
    if (res.success) {
      notify('success', `Administrador ${adminToReactivate.nombre} reactivado con éxito.`);
      void loadAdmins();
    } else {
      notify('error', res.error || 'No se pudo reactivar el administrador.');
    }
    setAdminToReactivate(null);
  };

  // Contadores
  const totalActivos = useMemo(
    () => administradores.filter((a) => a.activo && !a.deleted_at).length,
    [administradores]
  );
  const totalInactivos = useMemo(
    () => administradores.filter((a) => !a.activo || a.deleted_at).length,
    [administradores]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Notificación de feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Cabecera del Equipo de Administradores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900">
              Equipo de la Oficina de Empleo
            </h3>
            <Badge variant="blue" className="text-[10px]">
              Gestión Entre Pares
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Administración horizontal de cuentas del personal municipal. Ningún administrador puede darse de baja a sí mismo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalCreateOpen(true)}
            className="bg-brand-800 hover:bg-brand-900 text-white gap-1.5 shadow-2xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Administrador</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAdmins()}
            title="Recargar equipo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="sm:col-span-3 relative">
          <Input
            type="text"
            placeholder="Buscar administrador por nombre, apellido o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-9"
          />
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
        </div>

        <div>
          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value as 'todos' | 'activos' | 'inactivos')
            }
            className="w-full h-9 text-xs rounded-xl border border-zinc-200 bg-white px-2.5 text-zinc-700 focus:outline-hidden focus:border-brand-500 font-medium"
          >
            <option value="todos">Todos los administradores ({administradores.length})</option>
            <option value="activos">Sólo Activos ({totalActivos})</option>
            <option value="inactivos">Inactivos ({totalInactivos})</option>
          </select>
        </div>
      </div>

      {/* Tabla de Administradores */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-800" />
          Cargando equipo administrativo...
        </div>
      ) : administradores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center space-y-3">
          <UserCog className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900">
            No se encontraron administradores
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            No hay registros que coincidan con los criterios de búsqueda seleccionados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Administrador / DNI</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Fecha de Alta</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {administradores.map((admin) => {
                  const isCurrent = admin.id === user?.id;
                  const isActivo = admin.activo && !admin.deleted_at;

                  return (
                    <tr
                      key={admin.id}
                      className={`hover:bg-zinc-50/60 transition-colors ${
                        isCurrent ? 'bg-brand-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-zinc-900">
                            {admin.apellido ? `${admin.apellido}, ` : ''}
                            {admin.nombre}
                          </p>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded-md bg-brand-100 text-brand-900 text-[10px] font-bold">
                              Tu cuenta
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                          {admin.dni && <span>DNI: {admin.dni}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-600">
                        {admin.telefono || <span className="text-zinc-400 italic">-</span>}
                      </td>

                      <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>
                            {new Date(admin.created_at).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isActivo ? (
                          <Badge variant="emerald" className="text-[10px] font-bold">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="zinc" className="text-[10px] font-bold">
                            Inactivo
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón Editar Datos */}
                          <button
                            onClick={() => setAdminToEdit(admin)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Editar datos del administrador"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Acciones de baja / reactivación (bloqueada silenciosamente para cuenta propia) */}
                          {!isCurrent && (
                            isActivo ? (
                              <button
                                onClick={() => setAdminToDeactivate(admin)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                                title="Dar de baja lógica a este administrador"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Desactivar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setAdminToReactivate(admin)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                                title="Reactivar cuenta de este administrador"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivar</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Alta de Nuevo Administrador */}
      <AdminFormModal
        isOpen={modalCreateOpen}
        onClose={() => setModalCreateOpen(false)}
        onSuccess={() => {
          notify('success', 'Nuevo administrador creado con éxito.');
          void loadAdmins();
        }}
        onSave={crearNuevoAdminAction}
      />

      {/* Modal: Edición de Administrador */}
      <AdminEditModal
        isOpen={Boolean(adminToEdit)}
        onClose={() => setAdminToEdit(null)}
        admin={adminToEdit}
        onSuccess={() => {
          notify('success', 'Datos del administrador actualizados con éxito.');
          void loadAdmins();
        }}
        onSave={actualizarDatosAdminAction}
      />

      {/* ConfirmDialog: Desactivación de Administrador */}
      <ConfirmDialog
        isOpen={Boolean(adminToDeactivate)}
        title="¿Desactivar administrador municipal?"
        description={`La cuenta de ${adminToDeactivate?.nombre} ${adminToDeactivate?.apellido || ''} quedará inactiva y no podrá acceder al panel operativo. Los registros históricos y trazabilidad se conservan intactos.`}
        confirmText="Sí, desactivar cuenta"
        cancelText="Volver"
        variant="destructive"
        onConfirm={handleConfirmDeactivate}
        onClose={() => setAdminToDeactivate(null)}
      />

      {/* ConfirmDialog: Reactivación de Administrador */}
      <ConfirmDialog
        isOpen={Boolean(adminToReactivate)}
        title="¿Reactivar administrador municipal?"
        description={`Se restaurará el acceso operativo al panel de la Oficina de Empleo para ${adminToReactivate?.nombre} ${adminToReactivate?.apellido || ''}.`}
        confirmText="Sí, reactivar cuenta"
        cancelText="Volver"
        variant="primary"
        onConfirm={handleConfirmReactivate}
        onClose={() => setAdminToReactivate(null)}
      />
    </div>
  );
}
