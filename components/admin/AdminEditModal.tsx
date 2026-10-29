'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  X,
  Phone,
  CreditCard,
  AlertCircle,
  Loader2,
  Pencil,
} from 'lucide-react';
import { AdminUserItem } from '@/lib/admin';

interface AdminEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  admin: AdminUserItem | null;
  onSave: (data: {
    id: string;
    nombre: string;
    apellido?: string;
    dni?: string;
    telefono?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function AdminEditModal({
  isOpen,
  onClose,
  onSuccess,
  admin,
  onSave,
}: AdminEditModalProps) {
    useBodyScrollLock(Boolean(isOpen));
const [prevAdminId, setPrevAdminId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (admin && admin.id !== prevAdminId) {
    setPrevAdminId(admin.id);
    setNombre(admin.nombre || '');
    setApellido(admin.apellido || '');
    setDni(admin.dni || '');
    setTelefono(admin.telefono || '');
    setError(null);
  }

  if (!isOpen || !admin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      setError('Por favor completá el nombre del administrador.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await onSave({
      id: admin.id,
      nombre: nombre.trim(),
      apellido: apellido.trim() || undefined,
      dni: dni.trim() || undefined,
      telefono: telefono.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Ocurrió un error al actualizar los datos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Editar Administrador</h2>
              <p className="text-[11px] text-zinc-500">
                Actualizar datos personales y de contacto de la cuenta.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-[11px] text-zinc-600">
            <span className="font-bold text-zinc-700 block">Administrador:</span>
            <span>{admin.nombre} {admin.apellido || ''} {admin.dni ? `· DNI: ${admin.dni}` : ''}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Nombre *</label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Lucas"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Apellido</label>
              <Input
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej. Rossi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-zinc-400" /> DNI
              </label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Ej. 35123456"
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-zinc-400" /> Teléfono
              </label>
              <Input
                type="tel"
                inputMode="numeric"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 3415551234"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="bg-brand-800 hover:bg-brand-900"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
