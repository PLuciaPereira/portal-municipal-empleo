'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { solicitarRecuperoPasswordAction, RecuperoResult } from '@/app/auth/actions';
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Building2, HelpCircle } from 'lucide-react';

function RecuperarPasswordForm() {
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error');

  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecuperoResult | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (initialError === 'link_expirado') {
      return 'El enlace de recuperación ha expirado, ya fue utilizado o es inválido. Por favor solicitá uno nuevo.';
    }
    return null;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Por favor ingresá tu correo electrónico o número de DNI.');
      return;
    }

    setIsLoading(true);
    try {
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : '';

      const res = await solicitarRecuperoPasswordAction(trimmed, origin);
      if (!res.success) {
        setError(res.message || 'No se pudo procesar la solicitud.');
      } else {
        setResult(res);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar la solicitud.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Encabezado institucional sobre la tarjeta */}
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
          Recuperar Contraseña
        </h1>
      </div>

      {/* Tarjeta principal con bordes redondeados y sombra verde sutil */}
      <div className="w-full bg-white border border-[#dfe8e2] rounded-[24px] shadow-[0_16px_44px_rgba(11,93,59,0.10)] overflow-hidden">
        {result?.status === 'asistido_requiere_oficina' ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-1">
              <Building2 className="w-8 h-8" aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold text-[#14231c]">
              Legajo de Registro Asistido
            </h2>

            <p className="text-sm text-[#4a5a52] leading-relaxed">
              Tu legajo laboral fue registrado de manera presencial en la <strong>Oficina de Empleo</strong> sin una casilla de correo electrónico personal vinculada.
            </p>

            <div className="w-full bg-[#fbfbfa] border border-[#eee8d5] rounded-xl p-4 text-xs text-[#524a3a] text-left flex flex-col gap-2">
              <span className="font-bold text-[#14231c]">¿Cómo generar o blanquear tu contraseña?</span>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  <strong>Atención presencial:</strong> Acercate con tu DNI a la Oficina de Empleo Municipal de Funes de <strong>Lunes a Viernes de 7:00 a 13:00 hs</strong>.
                </li>
                <li>
                  <strong>Por correo o consulta:</strong> Escribinos a <a href="mailto:empleo@funes.gob.ar" className="text-brand-800 underline font-medium">empleo@funes.gob.ar</a> adjuntando foto de tu DNI para vincular tu correo personal.
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="mt-2 text-xs font-semibold text-brand-800 hover:text-brand-900 hover:underline cursor-pointer focus:outline-none transition-colors"
            >
              Consultar con otro correo o DNI
            </button>
          </div>
        ) : result?.status === 'email_sent' ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-800 mb-1">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold text-[#14231c]">
              ¡Enlace de recuperación enviado!
            </h2>

            <p className="text-sm text-[#4a5a52] leading-relaxed max-w-sm">
              {result.maskedEmail ? (
                <>
                  Enviamos las instrucciones a la casilla asociada a tu DNI:{' '}
                  <span className="inline-block px-2.5 py-1 mt-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold text-[15px]">
                    {result.maskedEmail}
                  </span>
                </>
              ) : (
                <>
                  Te enviamos un correo con las instrucciones y el enlace para restablecer tu contraseña a tu casilla registrada.
                </>
              )}
            </p>

            <div className="w-full bg-[#f8fbf9] border border-[#e3ebe6] rounded-xl p-4 text-xs text-[#5a6a62] text-left flex flex-col gap-1.5 mt-2">
              <span className="font-bold text-[#14231c]">¿No recibiste el correo?</span>
              <ul className="list-disc list-inside space-y-1">
                <li>Revisá la carpeta de correo no deseado o Spam.</li>
                <li>Verificá haber escrito tus datos correctamente.</li>
                <li>El enlace tiene una vigencia limitada por razones de seguridad.</li>
              </ul>
            </div>

            <p className="text-xs text-[#5a6a62] mt-2">
              ¿Ingresaste mal tus datos?{' '}
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="font-semibold text-brand-800 hover:text-brand-900 hover:underline cursor-pointer focus:outline-none transition-colors"
              >
                Volver a intentar
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-5">
            <p className="text-sm text-[#4a5a52] leading-relaxed">
              Ingresá tu correo electrónico o tu número de DNI. Si contás con una cuenta activa, te enviaremos las instrucciones de restablecimiento.
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

            {/* Campo Correo Electrónico o DNI */}
            <div className="flex flex-col gap-2">
              <label htmlFor="identifier" className="text-sm font-semibold text-[#14231c]">
                Correo electrónico o DNI
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="tu@correo.com o tu número de DNI"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full h-[52px] pl-11 pr-4 rounded-xl border border-[#d5ddd8] bg-[#fbfcfb] text-[15px] text-[#14231c] placeholder:text-[#8a978f] focus:outline-none focus:ring-3 focus:ring-[#b7e0c9] focus:border-[#075a36] transition-all"
                />
                <Mail
                  className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8a978f] pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Botón Solicitar recuperación */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[52px] rounded-full bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white font-bold text-base cursor-pointer transition-colors duration-150 flex items-center justify-center shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Verificando...</span>
                </>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </button>
          </form>
        )}

        {/* Franja al pie de la tarjeta */}
        <div className="border-t border-[#e3ebe6] bg-[#f8fbf9] px-6 sm:px-8 py-5 flex items-center justify-center text-sm text-[#4a5a52]">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-brand-800 hover:text-brand-900 hover:underline transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver a Iniciar sesión
          </Link>
        </div>
      </div>
    </>
  );
}

export default function RecuperarPasswordPage() {
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
        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-brand-800 border-t-transparent rounded-full" />
            </div>
          }
        >
          <RecuperarPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
