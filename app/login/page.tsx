'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Image from 'next/image';
import {
  ShieldCheckIcon,
  BuildingIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const { login, loginAsDemo, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getTargetUrlForRole = (role?: UserRole): string => {
    if (
      redirectUrl &&
      redirectUrl.startsWith('/') &&
      !redirectUrl.startsWith('//') &&
      !redirectUrl.startsWith('/login') &&
      !redirectUrl.startsWith('/registro')
    ) {
      // Validar que la ruta de redirección pertenezca a su rol si es una ruta protegida
      if (redirectUrl.startsWith('/postulante') && role === 'postulante') return redirectUrl;
      if (redirectUrl.startsWith('/empresa') && role === 'empresa') return redirectUrl;
      if (redirectUrl.startsWith('/admin') && (role === 'admin' || role === 'municipalidad')) return redirectUrl;
      if (redirectUrl.startsWith('/ofertas')) return redirectUrl;
    }

    if (role === 'empresa') return '/empresa';
    if (role === 'admin' || role === 'municipalidad') return '/admin';
    return '/postulante';
  };

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
      const target = getTargetUrlForRole(res.role);
      router.push(target);
    } else {
      setError(res.error || 'Credenciales incorrectas.');
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    loginAsDemo(role);
    const target = getTargetUrlForRole(role);
    router.push(target);
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-brand-800 flex items-center justify-center p-2.5 mx-auto shadow-sm">
          <Image
            src="/escudo-funes-blanco.png"
            alt="Escudo Oficial de la Municipalidad de Funes"
            width={48}
            height={48}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            Ingresar al Portal de Empleo
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600">
            Oficina de Empleo &bull; Municipalidad de Funes
          </p>
        </div>
      </div>

      <Card className="border-zinc-200/90 shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Accesos Demo Rápidos para Testing */}
          <div className="pt-4 border-t border-zinc-100 space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 text-center">
              Acceso rápido de prueba:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('postulante')}
                className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Postulante: Lucía Fernández (lucia.vecina@funes.gob.ar)</span>
                <CheckCircleIcon className="w-4 h-4 text-emerald-700 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('empresa')}
                className="py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Empresa: Funes Mall / NovaTech (contacto@novatechfunes.com.ar)</span>
                <BuildingIcon className="w-4 h-4 text-sky-700 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="py-1.5 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Oficina de Empleo / Admin (admin@funes.gob.ar)</span>
                <ShieldCheckIcon className="w-4 h-4 text-zinc-700 shrink-0" />
              </button>
            </div>
          </div>

          <div className="text-center pt-2 space-y-1.5 text-xs text-zinc-600 border-t border-zinc-100">
            <div>
              ¿No tenés cuenta aún?{' '}
              <Link
                href="/registro"
                className="font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                Registrate como Postulante
              </Link>
            </div>
            <div>
              ¿Tenés una empresa en Funes?{' '}
              <Link
                href="/registro/empresa"
                className="font-bold text-sky-700 hover:text-sky-900 underline"
              >
                Registrá tu Empresa acá
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
