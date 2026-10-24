'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  UserPlus,
  X,
  Mail,
  Lock,
  User,
  Phone,
  CreditCard,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface AdminFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSave: (data: {
    email: string;
    password: string;
    nombre: string;
    apellido?: string;
    dni?: string;
    telefono?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function AdminFormModal({
  isOpen,
  onClose,
  onSuccess,
  onSave,
}: AdminFormModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim() || !nombre.trim()) {
      setError('Por favor completá el correo, la contraseña y el nombre del administrador.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await onSave({
      email: email.trim(),
      password: password.trim(),
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
      setError(res.error || 'Ocurrió un error al crear la cuenta administrativa.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-brand-800" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Alta de Administrador Municipal
              </h2>
              <p className="text-xs text-zinc-500">
                Incorporación de un nuevo miembro par a la Oficina de Empleo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <p>
              Esta cuenta contará con plenos permisos operativos para aprobar empresas, moderar ofertas e intermediar postulantes en nombre de la Municipalidad de Funes.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  required
                  placeholder="Ej. Valeria"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={loading}
                  className="pl-8 text-xs"
                />
                <User className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Apellido
              </label>
              <Input
                type="text"
                placeholder="Ej. Gómez"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                disabled={loading}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                DNI
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Sin puntos"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  disabled={loading}
                  className="pl-8 text-xs"
                />
                <CreditCard className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Teléfono de Contacto
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ej. 341-..."
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={loading}
                  className="pl-8 text-xs"
                />
                <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Correo Electrónico Institucional <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  placeholder="admin@funes.gob.ar"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-8 text-xs"
                />
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Contraseña Inicial Provisoria <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-8 text-xs"
                />
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
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
              className="bg-brand-800 hover:bg-brand-900 text-white min-w-[130px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Administrador'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
