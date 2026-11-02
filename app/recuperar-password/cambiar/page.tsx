'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/validators';
import { AlertCircle, Eye, EyeOff, Lock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar que el usuario tenga una sesión activa producto del intercambio de código en /auth/callback
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError || !session) {
          setHasValidSession(false);
        } else {
          setHasValidSession(true);
        }
      } catch (err) {
        console.warn('Error verificando sesión de recuperación:', err);
        if (isMounted) setHasValidSession(false);
      } finally {
        if (isMounted) setIsVerifyingSession(false);
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Por favor ingresá tu nueva contraseña.');
      return;
    }

    if (!validatePassword(password)) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setIsLoading(false);
        if (updateError.message.includes('same_password') || updateError.message.includes('different from the old password')) {
          setError('La nueva contraseña debe ser diferente a la anterior.');
        } else {
          setError(updateError.message || 'No se pudo actualizar la contraseña.');
        }
        return;
      }

      // Por seguridad, cerrar la sesión temporal tras restablecer y exigir inicio formal
      await supabase.auth.signOut();

      // Redirigir a login con aviso de confirmación exitosa
      router.push('/login?recovered=1');
    } catch (err) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar la contraseña.';
      setError(msg);
    }
  };

  return (
    <div className="portal-fullpage-layout relative w-full flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-[#eef5f0] px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Marca de agua decorativa: Logo oficial de Funes */}
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
        {/* Encabezado */}
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
            Nueva contraseña
          </h1>
        </div>

        {/* Tarjeta con formulario */}
        <div className="w-full bg-white border border-[#dfe8e2] rounded-[24px] shadow-[0_16px_44px_rgba(11,93,59,0.10)] overflow-hidden">
          {isVerifyingSession ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-brand-800 border-t-transparent rounded-full" />
              <p className="text-sm text-[#4a5a52]">Verificando enlace de seguridad...</p>
            </div>
          ) : !hasValidSession ? (
            <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-1">
                <AlertTriangle className="w-8 h-8" aria-hidden="true" />
              </div>

              <h2 className="text-xl font-bold text-[#14231c]">
                Enlace no disponible o expirado
              </h2>

              <p className="text-sm text-[#4a5a52] leading-relaxed max-w-sm">
                No detectamos una sesión de recuperación válida. Los enlaces de restablecimiento expiran automáticamente y sólo pueden usarse una única vez.
              </p>

              <div className="flex flex-col gap-3 w-full mt-4">
                <Link
                  href="/recuperar-password"
                  className="w-full h-[48px] rounded-full bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <span>Solicitar un nuevo enlace</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="w-full h-[48px] rounded-full border border-[#d5ddd8] hover:bg-slate-50 text-[#14231c] font-semibold text-sm cursor-pointer transition-colors flex items-center justify-center"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-5">
              <p className="text-sm text-[#4a5a52] leading-relaxed">
                Ingresá tu nueva clave para el portal. Debe contener como mínimo 6 caracteres.
              </p>

              {error && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {/* Nueva contraseña */}
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-semibold text-[#14231c]">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-[52px] pl-11 pr-12 rounded-xl border border-[#d5ddd8] bg-[#fbfcfb] text-[15px] text-[#14231c] placeholder:text-[#8a978f] focus:outline-none focus:ring-3 focus:ring-[#b7e0c9] focus:border-[#075a36] transition-all"
                  />
                  <Lock
                    className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8a978f] pointer-events-none"
                    aria-hidden="true"
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

              {/* Confirmar Contraseña */}
              <div className="flex flex-col gap-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-[#14231c]">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Repetí tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-[52px] pl-11 pr-12 rounded-xl border border-[#d5ddd8] bg-[#fbfcfb] text-[15px] text-[#14231c] placeholder:text-[#8a978f] focus:outline-none focus:ring-3 focus:ring-[#b7e0c9] focus:border-[#075a36] transition-all"
                  />
                  <Lock
                    className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8a978f] pointer-events-none"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-1.5 top-1.5 w-10 h-10 rounded-lg flex items-center justify-center text-[#5a6a62] hover:text-[#14231c] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-800/20 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Indicadores de validación en tiempo real */}
              <div className="flex flex-col gap-1 text-xs text-[#5a6a62] px-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      password.length >= 6 ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  />
                  <span className={password.length >= 6 ? 'text-emerald-700 font-medium' : ''}>
                    Al menos 6 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      password.length > 0 && password === confirmPassword
                        ? 'text-emerald-600'
                        : 'text-slate-300'
                    }`}
                  />
                  <span
                    className={
                      password.length > 0 && password === confirmPassword
                        ? 'text-emerald-700 font-medium'
                        : ''
                    }
                  >
                    Las contraseñas coinciden
                  </span>
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] rounded-full bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white font-bold text-base cursor-pointer transition-colors duration-150 flex items-center justify-center shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Guardando contraseña...</span>
                  </>
                ) : (
                  'Guardar nueva contraseña'
                )}
              </button>
            </form>
          )}

          {/* Pie de tarjeta */}
          <div className="border-t border-[#e3ebe6] bg-[#f8fbf9] px-6 sm:px-8 py-5 flex items-center justify-center text-sm text-[#4a5a52]">
            <Link
              href="/login"
              className="font-semibold text-brand-800 hover:text-brand-900 hover:underline transition-colors"
            >
              Cancelar y volver a Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
