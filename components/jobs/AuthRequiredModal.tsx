'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';
import {
  XMarkIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  jobTitle: string;
  jobId: string;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  jobTitle,
  jobId,
}) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Por favor ingresá tu correo electrónico.');
      return;
    }

    if (!password) {
      setError('Por favor ingresá tu contraseña.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      onLoginSuccess();
    } else {
      setError(res.error || 'No se pudo iniciar sesión.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Cerrar ventana"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-brand-800 flex items-center justify-center p-2 shadow-xs">
            <Image
              src="/escudo-funes-blanco.png"
              alt="Escudo Oficial de la Municipalidad de Funes"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
              Registro Obligatorio
            </span>
            <h3 className="text-xl font-bold text-zinc-900 leading-tight">
              Iniciá sesión para postularte
            </h3>
            <p className="text-xs text-zinc-600 mt-1">
              Para postularte a <strong className="text-zinc-800">{jobTitle}</strong> debés contar con una cuenta activa en el Portal de Empleo.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Formulario de Login Rápido */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu-correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Iniciar Sesión y Continuar
            </Button>
          </form>

          {/* Enlace para registrarse si no tiene cuenta */}
          <div className="text-center pt-2 text-xs text-zinc-600 border-t border-zinc-100">
            ¿Todavía no tenés una cuenta en el portal?{' '}
            <Link
              href={`/registro?redirect=/ofertas/${jobId}`}
              onClick={onClose}
              className="font-bold text-emerald-700 hover:text-emerald-900 underline"
            >
              Registrate como Postulante
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
