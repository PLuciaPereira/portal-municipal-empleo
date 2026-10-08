'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Image from 'next/image';
import { BuildingIcon, ShieldCheckIcon, CheckCircleIcon } from '@/components/ui/Icons';

function RegisterEmpresaForm() {
  const router = useRouter();
  const { registerEmpresa, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    razonSocial: '',
    nombreFantasia: '',
    cuit: '',
    rubro: 'Comercio',
    direccion: '',
    localidad: 'Funes',
    telefono: '',
    email: '',
    personaContacto: '',
    sitioWeb: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [successConfirmation, setSuccessConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.razonSocial.trim()) {
      setError('Por favor completá la Razón Social.');
      return;
    }
    if (!formData.cuit.trim() || formData.cuit.replace(/[^0-9]/g, '').length < 10) {
      setError('Por favor ingresá un CUIT válido (11 dígitos).');
      return;
    }
    if (!formData.direccion.trim()) {
      setError('Por favor ingresá la dirección de la empresa o local.');
      return;
    }
    if (!formData.telefono.trim()) {
      setError('Por favor ingresá un teléfono de contacto.');
      return;
    }
    if (!formData.personaContacto.trim()) {
      setError('Por favor ingresá el nombre de la persona responsable o contacto.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Por favor ingresá un correo electrónico corporativo válido.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const res = await registerEmpresa({
      razon_social: formData.razonSocial,
      nombre_fantasia: formData.nombreFantasia || formData.razonSocial,
      cuit: formData.cuit,
      rubro: formData.rubro,
      direccion: formData.direccion,
      localidad: formData.localidad || 'Funes',
      telefono: formData.telefono,
      persona_contacto: formData.personaContacto,
      email: formData.email,
      sitio_web: formData.sitioWeb,
      password: formData.password,
    });

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setSuccessConfirmation(true);
      } else {
        router.push('/empresa');
      }
    } else {
      setError(res.error || 'No se pudo registrar la empresa.');
    }
  };

  if (successConfirmation) {
    return (
      <div className="max-w-md w-full mx-auto space-y-6">
        <Card className="border-sky-200 shadow-sm bg-white">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900">
              ¡Solicitud de Empresa Registrada!
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Te enviamos un correo electrónico a <span className="font-semibold text-zinc-900">{formData.email}</span> para verificar tu cuenta.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 text-left space-y-1">
              <span className="font-bold block">Estado: Pendiente de Aprobación Municipal</span>
              <span>
                Conforme a la normativa municipal, el equipo de la Oficina de Empleo revisará los datos comerciales antes de habilitar la publicación de ofertas laborales.
              </span>
            </div>
            <div className="pt-2">
              <Button href="/login" variant="primary" className="w-full justify-center">
                Ir a Iniciar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
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
            Registro de Empresas y Comercios
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600">
            Oficina de Empleo &bull; Municipalidad de Funes
          </p>
        </div>
      </div>

      <Card className="border-zinc-200/90 shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="p-3.5 bg-sky-50 border border-sky-200/70 rounded-xl text-xs text-sky-950 flex items-start gap-2.5">
            <BuildingIcon className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-sky-900">
                Aprobación y Validación Municipal
              </span>
              <p className="leading-relaxed text-sky-800">
                Toda empresa que se registre en el portal ingresa en estado <strong>Pendiente</strong>. La Oficina de Empleo verifica la autenticidad del comercio o empresa para garantizar oportunidades laborales seguras a los vecinos de Funes.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Razón Social *"
                placeholder="Ej: Funes Retail S.R.L."
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                required
              />
              <Input
                label="Nombre de Fantasía / Comercial"
                placeholder="Ej: Supermercado Funes"
                value={formData.nombreFantasia}
                onChange={(e) => setFormData({ ...formData, nombreFantasia: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="CUIT *"
                placeholder="Ej: 30-71234567-8"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                required
              />
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700">
                  Rubro / Actividad *
                </label>
                <select
                  value={formData.rubro}
                  onChange={(e) => setFormData({ ...formData, rubro: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-zinc-900"
                >
                  <option value="Comercio">Comercio y Atención al Cliente</option>
                  <option value="Gastronomía">Gastronomía y Hotelería</option>
                  <option value="Construcción">Construcción y Obras</option>
                  <option value="Administración">Administración y Finanzas</option>
                  <option value="Logística">Logística y Distribución</option>
                  <option value="Servicios">Servicios Generales</option>
                  <option value="Salud">Salud y Cuidados</option>
                  <option value="Tecnología">Tecnología e Informática</option>
                  <option value="Industria">Industria y Manufactura</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Dirección *"
                placeholder="Ej: Santa Fe 1650"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                required
              />
              <Input
                label="Localidad *"
                placeholder="Funes"
                value={formData.localidad}
                onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Teléfono de Contacto *"
                placeholder="Ej: 341 493-1234"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
              />
              <Input
                label="Persona de Contacto / RRHH *"
                placeholder="Ej: Martín Rodríguez"
                value={formData.personaContacto}
                onChange={(e) => setFormData({ ...formData, personaContacto: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Correo Electrónico de Contacto *"
                type="email"
                placeholder="rrhh@empresa.com.ar"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Contraseña de Acceso *"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Input
              label="Sitio Web o Red Social (opcional)"
              placeholder="https://miempresa.com.ar o instagram.com/miempresa"
              value={formData.sitioWeb}
              onChange={(e) => setFormData({ ...formData, sitioWeb: e.target.value })}
            />

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 flex items-start gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Al registrarte aceptás los términos del servicio de intermediación de la Oficina de Empleo de la Municipalidad de Funes.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Registrar Empresa y Solicitar Aprobación
            </Button>
          </form>

          <div className="text-center pt-2 space-y-1.5 text-xs text-zinc-600 border-t border-zinc-100">
            <div>
              ¿Tu empresa ya está registrada?{' '}
              <Link
                href="/login"
                className="font-bold text-sky-700 hover:text-sky-900 underline"
              >
                Iniciá Sesión acá
              </Link>
            </div>
            <div>
              ¿Sos vecino y buscás empleo?{' '}
              <Link
                href="/registro"
                className="font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                Registrate como Postulante
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterEmpresaPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
          </div>
        }
      >
        <RegisterEmpresaForm />
      </Suspense>
    </div>
  );
}
