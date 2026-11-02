'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/database';
import { AlertCircle, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const isRecovered = searchParams.get('recovered') === '1';

  const { user, login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTargetUrlForRole = (role?: UserRole): string => {
    if (
      redirectUrl &&
      redirectUrl.startsWith('/') &&
      !redirectUrl.startsWith('//') &&
      !redirectUrl.startsWith('/login') &&
      !redirectUrl.startsWith('/registro')
    ) {
      if (redirectUrl.startsWith('/postulante') && role === 'postulante') return redirectUrl;
      if (redirectUrl.startsWith('/empresa') && role === 'empresa') return redirectUrl;
      if (redirectUrl.startsWith('/admin') && role === 'admin') return redirectUrl;
      if (redirectUrl.startsWith('/ofertas')) return redirectUrl;
    }

    if (role === 'empresa') return '/empresa';
    if (role === 'admin') return '/admin';
    return '/postulante';
  };

  // Validación reactiva: si el usuario ya está autenticado, redirigir automáticamente
  // y sustituir /login en el historial para evitar rebotes al pulsar la flecha "Atrás"
  useEffect(() => {
    if (!isLoading && user) {
      const target = getTargetUrlForRole(user.rol);
      router.replace(target);
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Por favor ingresá tu correo electrónico o número de DNI.');
      return;
    }

    if (!password) {
      setError('Por favor ingresá tu contraseña.');
      return;
    }

    const res = await login(identifier, password);
    if (res.success) {
      const target = getTargetUrlForRole(res.role);
      router.replace(target);
    } else {
      setError(res.error || 'Credenciales incorrectas.');
    }
  };

  // Si ya existe sesión activa confirmada, mostrar indicador de redirección limpia
  if (!isLoading && user) {
    return (
      <div className="w-full bg-white border border-[#dfe8e2] rounded-[24px] shadow-[0_16px_44px_rgba(11,93,59,0.10)] p-8 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-brand-800 animate-spin" />
        <p className="text-sm font-medium text-[#14231c]">Redirigiendo a tu panel...</p>
      </div>
    );
  }

  return (
    <>
      {/* Encabezado sobre la tarjeta */}
      <div className="flex flex-col items-center gap-2 text-center w-full px-2">
        <span className="text-xs font-bold tracking-[0.1em] uppercase text-brand-800">
          Oficina de Empleo · Municipalidad de Funes
        </span>
        <h1
          className="w-full text-center font-extrabold tracking-[-0.02em] text-[#14231c] leading-tight whitespace-normal min-[440px]:whitespace-nowrap sm:whitespace-nowrap"
          style={{
            fontSize: 'clamp(20px, 5.2vw, 27px)',
          }}
        >
          Ingresar al Portal de Empleo
        </h1>
      </div>

      {/* Tarjeta blanca con bordes redondeados y sombra sutil verdosa */}
      <div className="w-full bg-white border border-[#dfe8e2] rounded-[24px] shadow-[0_16px_44px_rgba(11,93,59,0.10)] overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-5">
          {isRecovered && !error && (
            <div
              role="status"
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
              <span>¡Tu contraseña ha sido restablecida con éxito! Ya podés iniciar sesión con tu nueva clave.</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Correo Electrónico o DNI */}
          <div className="flex flex-col gap-2">
            <label htmlFor="identifier" className="text-sm font-semibold text-[#14231c]">
              Correo electrónico o DNI
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="tu@correo.com o tu número de DNI"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full h-[52px] px-4 rounded-xl border border-[#d5ddd8] bg-[#fbfcfb] text-[15px] text-[#14231c] placeholder:text-[#8a978f] focus:outline-none focus:ring-3 focus:ring-[#b7e0c9] focus:border-[#075a36] transition-all"
            />
          </div>

          {/* Campo Contraseña */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-semibold text-[#14231c]">
                Contraseña
              </label>
              <Link
                href="/recuperar-password"
                className="text-[13px] font-medium text-brand-800 hover:text-brand-900 hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[52px] pl-4 pr-12 rounded-xl border border-[#d5ddd8] bg-[#fbfcfb] text-[15px] text-[#14231c] placeholder:text-[#8a978f] focus:outline-none focus:ring-3 focus:ring-[#b7e0c9] focus:border-[#075a36] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-1.5 top-1.5 w-10 h-10 rounded-lg flex items-center justify-center text-[#5a6a62] hover:text-[#14231c] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-800/20 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Botón Iniciar sesión */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[52px] rounded-full bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white font-bold text-base cursor-pointer transition-colors duration-150 flex items-center justify-center shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        {/* Franja al pie de la tarjeta */}
        <div className="border-t border-[#e3ebe6] bg-[#f8fbf9] px-6 sm:px-8 py-5 flex flex-col gap-2.5 text-center text-sm text-[#4a5a52]">
          <p className="m-0 leading-normal">
            ¿No tenés cuenta aún?{' '}
            <Link
              href="/registro"
              className="font-semibold text-brand-800 hover:text-brand-900 hover:underline transition-colors"
            >
              Registrate como postulante
            </Link>
          </p>
          <p className="m-0 leading-normal">
            ¿Tenés una empresa en Funes?{' '}
            <Link
              href="/registro/empresa"
              className="font-semibold text-brand-800 hover:text-brand-900 hover:underline transition-colors"
            >
              Registrá tu empresa acá
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="portal-fullpage-layout relative w-full flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-[#eef5f0] px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Marca de agua decorativa: Logo oficial de Funes de trazo fino */}
      <Image
        src="/favicon-funes.png"
        alt=""
        aria-hidden="true"
        width={480}
        height={501}
        priority
        className="absolute -right-24 -bottom-24 sm:-right-32 sm:-bottom-32 w-[340px] sm:w-[480px] h-auto pointer-events-none select-none z-0 mix-blend-multiply"
        style={{ opacity: 0.07 }}
      />

      <Image
        src="/favicon-funes.png"
        alt=""
        aria-hidden="true"
        width={320}
        height={334}
        priority
        className="absolute -left-16 -top-12 sm:-left-24 sm:-top-16 w-[220px] sm:w-[300px] h-auto pointer-events-none select-none z-0 mix-blend-multiply"
        style={{ opacity: 0.07 }}
      />

      <div className="relative z-10 w-full max-w-[460px] mx-auto flex flex-col items-center gap-6">
        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-brand-800 border-t-transparent rounded-full" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
