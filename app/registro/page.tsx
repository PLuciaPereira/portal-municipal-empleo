'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Image from 'next/image';
import { ShieldCheckIcon } from '@/components/ui/Icons';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/ofertas';

  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    password: '',
    esResidenteFunes: true,
    barrio: '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setError('Por favor completá tu nombre y apellido.');
      return;
    }
    if (!formData.dni.trim()) {
      setError('Por favor ingresá tu DNI.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Por favor ingresá un correo electrónico válido.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const res = await register({
      nombre: formData.nombre,
      apellido: formData.apellido,
      dni: formData.dni,
      telefono: formData.telefono,
      email: formData.email,
      es_residente_funes: formData.esResidenteFunes,
      barrio: formData.barrio,
    });

    if (res.success) {
      router.push(redirectUrl);
    } else {
      setError(res.error || 'No se pudo crear la cuenta.');
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
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
            Registro de Postulante
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600">
            Oficina de Empleo &bull; Municipalidad de Funes
          </p>
        </div>
      </div>

      <Card className="border-zinc-200/90 shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Al registrarte podrás postularte a las ofertas vigentes y formar parte de la base oficial de empleo de Funes. Tu información no es pública ni se comparte sin previa intermediación municipal.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre *"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
              <Input
                label="Apellido *"
                placeholder="Tu apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="DNI *"
                placeholder="Sin puntos"
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                required
              />
              <Input
                label="Teléfono / WhatsApp *"
                placeholder="Ej: 341 555-0123"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Correo Electrónico *"
                type="email"
                placeholder="tu-correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Contraseña *"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {/* Residencia Funes */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-800">
                ¿Residís actualmente en la ciudad de Funes?
              </label>
              <div className="flex items-center gap-6 mt-1">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="radio"
                    name="residente"
                    checked={formData.esResidenteFunes}
                    onChange={() => setFormData({ ...formData, esResidenteFunes: true })}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Sí, vivo en Funes</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="radio"
                    name="residente"
                    checked={!formData.esResidenteFunes}
                    onChange={() => setFormData({ ...formData, esResidenteFunes: false })}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>No (Localidad vecina)</span>
                </label>
              </div>
            </div>

            {formData.esResidenteFunes && (
              <Input
                label="Barrio de Funes"
                placeholder="Ej: Cantegril, Don Mateo, Centro, Funes City..."
                value={formData.barrio}
                onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Crear Cuenta y Continuar
            </Button>
          </form>

          <div className="text-center pt-2 text-xs text-zinc-600 border-t border-zinc-100">
            ¿Ya tenés una cuenta registrada?{' '}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className="font-bold text-emerald-700 hover:text-emerald-900 underline"
            >
              Iniciá Sesión acá
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
