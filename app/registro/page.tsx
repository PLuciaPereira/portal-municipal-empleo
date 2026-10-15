'use client';

import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { TermsAndPrivacyModal } from '@/components/shared/TermsAndPrivacyModal';
import {
  formatDni,
  validateDni,
  validateEmail,
  validatePhone,
  validatePassword,
} from '@/lib/validators';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

/**
 * Panel lateral institucional brand-800
 * Fijo a 420px (480px en xl), sticky en desktop y compacto en mobile (sin índice).
 */
function RegistroPostulanteAside() {
  return (
    <aside className="bg-brand-800 text-white p-6 sm:p-10 lg:p-12 flex flex-col gap-8 lg:justify-between">
      <div className="space-y-8 lg:sticky lg:top-24">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 text-white shadow-md shadow-brand-900/10 p-2.5 ring-4 ring-brand-700/60">
            <User className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Registro de Postulantes
            </h1>
            <p className="text-sm text-brand-200 leading-relaxed">
              Creá tu cuenta para acceder a las búsquedas laborales vigentes y recibir acompañamiento de la Oficina de Empleo.
            </p>
          </div>
        </div>

        {/* Índice informativo de secciones (solo desktop, no intercepta foco) */}
        <ol
          className="hidden lg:block space-y-4"
          aria-label="Secciones del registro"
          tabIndex={-1}
        >
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border bg-white/10 text-brand-200 border-white/30">
              1
            </span>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                Datos del postulante
              </p>
              <p className="text-xs text-brand-200">Identificación y contacto</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border bg-white/10 text-brand-200 border-white/30">
              2
            </span>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                Datos de acceso
              </p>
              <p className="text-xs text-brand-200">Correo y contraseña</p>
            </div>
          </li>
        </ol>
      </div>

      <div className="text-[11px] text-brand-200/80 leading-relaxed">
        Gobierno de la Ciudad de Funes &bull; Secretaría de Desarrollo Económico
      </div>
    </aside>
  );
}

/**
 * Franja de enlaces al pie de la columna derecha
 */
function RegistroPostulanteFooterLinks() {
  return (
    <div className="p-5 sm:p-6 bg-brand-50/40 border-t border-border/70 text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-2 text-center sm:text-left w-full">
      <div>
        ¿Ya tenés una cuenta registrada?{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-800 hover:text-brand-900 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-brand-800 rounded-xs"
        >
          Iniciá sesión acá
        </Link>
      </div>
      <div>
        ¿Buscás personal para tu comercio o empresa?{' '}
        <Link
          href="/registro/empresa"
          className="font-semibold text-brand-800 hover:text-brand-900 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-brand-800 rounded-xs"
        >
          Registrate como Empresa
        </Link>
      </div>
    </div>
  );
}

interface FormErrors {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  email?: string;
  password?: string;
  terminos?: string;
}

function RegisterPostulanteForm() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    direccion: '',
    localidad: '',
    email: '',
    password: '',
    aceptoTerminos: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successConfirmation, setSuccessConfirmation] = useState(false);

  // Modal legal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'terminos' | 'privacidad'>('terminos');

  // Referencias para autofoco al primer campo con error
  const nombreRef = useRef<HTMLInputElement>(null);
  const apellidoRef = useRef<HTMLInputElement>(null);
  const dniRef = useRef<HTMLInputElement>(null);
  const telefonoRef = useRef<HTMLInputElement>(null);
  const direccionRef = useRef<HTMLInputElement>(null);
  const localidadRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const terminosRef = useRef<HTMLInputElement>(null);

  const handleOpenTermsModal = () => {
    setModalTab('terminos');
    setModalOpen(true);
  };

  const handleOpenPrivacyModal = () => {
    setModalTab('privacidad');
    setModalOpen(true);
  };

  const handleAcceptModal = () => {
    setFormData((prev) => ({ ...prev, aceptoTerminos: true }));
    if (errors.terminos) {
      setErrors((prev) => ({ ...prev, terminos: undefined }));
    }
    setModalOpen(false);
    setTimeout(() => {
      terminosRef.current?.focus();
    }, 50);
  };

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPos = input.selectionStart ?? rawValue.length;

    // Conteo de dígitos antes del cursor previo al formateo
    const digitsBefore = rawValue.slice(0, cursorPos).replace(/\D/g, '').length;

    // Limpiar caracteres no numéricos y limitar a 8 dígitos
    const clean = rawValue.replace(/\D/g, '').slice(0, 8);
    const formatted = formatDni(clean);

    setFormData((prev) => ({ ...prev, dni: formatted }));

    if (errors.dni) {
      setErrors((prev) => ({ ...prev, dni: undefined }));
    }

    // Reubicación precisa del cursor tras aplicar la máscara
    requestAnimationFrame(() => {
      let newPos = 0;
      let counted = 0;
      while (newPos < formatted.length && counted < digitsBefore) {
        if (/\d/.test(formatted[newPos])) {
          counted++;
        }
        newPos++;
      }
      input.setSelectionRange(newPos, newPos);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const newErrors: FormErrors = {};

    if (!formData.nombre.trim() || formData.nombre.trim().length < 2) {
      newErrors.nombre = 'Ingresá tu nombre (mínimo 2 letras).';
    }

    if (!formData.apellido.trim() || formData.apellido.trim().length < 2) {
      newErrors.apellido = 'Ingresá tu apellido (mínimo 2 letras).';
    }

    const dniValidation = validateDni(formData.dni);
    if (!dniValidation.isValid) {
      newErrors.dni = dniValidation.message || 'El DNI debe tener 7 u 8 dígitos numéricos válidos.';
    }

    if (!validatePhone(formData.telefono)) {
      newErrors.telefono = 'Ingresá un número de teléfono válido (mínimo 8 dígitos).';
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = 'Ingresá tu dirección de domicilio.';
    }

    if (!formData.localidad.trim()) {
      newErrors.localidad = 'Ingresá la localidad donde residís.';
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Ingresá un correo electrónico válido.';
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = 'La contraseña debe contener al menos 6 caracteres.';
    }

    if (!formData.aceptoTerminos) {
      newErrors.terminos = 'Debés aceptar los términos y condiciones y política de privacidad.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      // Foco al primer campo con error en el orden del formulario
      if (newErrors.nombre) {
        nombreRef.current?.focus();
      } else if (newErrors.apellido) {
        apellidoRef.current?.focus();
      } else if (newErrors.dni) {
        dniRef.current?.focus();
      } else if (newErrors.telefono) {
        telefonoRef.current?.focus();
      } else if (newErrors.direccion) {
        direccionRef.current?.focus();
      } else if (newErrors.localidad) {
        localidadRef.current?.focus();
      } else if (newErrors.email) {
        emailRef.current?.focus();
      } else if (newErrors.password) {
        passwordRef.current?.focus();
      } else if (newErrors.terminos) {
        terminosRef.current?.focus();
      }
      return;
    }

    setErrors({});

    const res = await register({
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      dni: formData.dni.replace(/\D/g, ''),
      telefono: formData.telefono.trim(),
      direccion: formData.direccion.trim(),
      localidad: formData.localidad.trim(),
      email: formData.email.trim(),
      password: formData.password,
      acepta_terminos: true,
    });

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setSuccessConfirmation(true);
      } else {
        router.push('/postulante');
      }
    } else {
      const errorMsg = res.error || 'No se pudo crear la cuenta.';
      const lower = errorMsg.toLowerCase();

      // Mapeo de errores de backend a campos específicos
      if (lower.includes('dni')) {
        setErrors((prev) => ({ ...prev, dni: errorMsg }));
        dniRef.current?.focus();
      } else if (
        lower.includes('correo') ||
        lower.includes('email') ||
        lower.includes('user already registered')
      ) {
        setErrors((prev) => ({ ...prev, email: errorMsg }));
        emailRef.current?.focus();
      } else {
        setGeneralError(errorMsg);
      }
    }
  };

  // Pantalla de confirmación tras el registro
  if (successConfirmation) {
    return (
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] bg-surface">
        <RegistroPostulanteAside />

        <div className="flex flex-col justify-between min-w-0 bg-surface">
          <div className="w-full max-w-xl mx-auto p-6 sm:p-10 lg:p-12 space-y-6 flex-1 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Revisá tu correo electrónico
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Si no tenías una cuenta previa, es posible que recibas instrucciones en{' '}
                <span className="font-semibold text-foreground">{formData.email}</span> para
                confirmar tu registro. Si ya contabas con una cuenta, podés iniciar sesión o
                restablecer tu contraseña.
              </p>
            </div>

            <div className="w-full p-4 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 text-left space-y-1.5">
              <span className="font-bold block">
                Próximos pasos:
              </span>
              <p className="text-brand-800 leading-relaxed">
                Una vez confirmada tu cuenta, podrás ingresar al portal para postularte a las ofertas vigentes y recibir la intermediación oficial de la Oficina de Empleo.
              </p>
            </div>

            <div className="pt-2 w-full sm:w-auto">
              <Button href="/login" variant="primary" size="lg" className="w-full sm:w-auto px-8 justify-center">
                Ir a Iniciar Sesión
              </Button>
            </div>
          </div>

          <RegistroPostulanteFooterLinks />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] bg-surface">
      <RegistroPostulanteAside />

      <div className="flex flex-col justify-between min-w-0 bg-surface">
        <div className="w-full max-w-3xl mx-auto p-6 sm:p-10 lg:p-12 space-y-8">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Completá tu registro
            </h2>
            <span className="text-xs text-muted-foreground">
              <span className="text-destructive font-bold">*</span> Obligatorio
            </span>
          </div>

          {generalError && (
            <div
              role="alert"
              className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            {/* SECCIÓN 1: DATOS DEL POSTULANTE */}
            <section className="space-y-5" aria-labelledby="sec-datos-postulante">
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h3 id="sec-datos-postulante" className="text-base font-bold text-foreground">
                    Datos del postulante
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ingresá tus datos de contacto para que el equipo municipal pueda comunicarse con vos.
                  </p>
                </div>
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  ref={nombreRef}
                  id="nombre"
                  name="nombre"
                  label={
                    <span>
                      Nombre <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  value={formData.nombre}
                  onChange={(e) => {
                    setFormData({ ...formData, nombre: e.target.value });
                    if (errors.nombre) setErrors({ ...errors, nombre: undefined });
                  }}
                  error={errors.nombre}
                  required
                />

                <Input
                  ref={apellidoRef}
                  id="apellido"
                  name="apellido"
                  label={
                    <span>
                      Apellido <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                  value={formData.apellido}
                  onChange={(e) => {
                    setFormData({ ...formData, apellido: e.target.value });
                    if (errors.apellido) setErrors({ ...errors, apellido: undefined });
                  }}
                  error={errors.apellido}
                  required
                />
              </div>

              {/* DNI y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  ref={dniRef}
                  id="dni"
                  name="dni"
                  type="text"
                  inputMode="numeric"
                  label={
                    <span>
                      DNI <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="Ej: 38.123.456"
                  maxLength={10}
                  value={formData.dni}
                  onChange={handleDniChange}
                  hint="7 u 8 dígitos. Se agregan puntos automáticamente."
                  error={errors.dni}
                  required
                />

                <Input
                  ref={telefonoRef}
                  id="telefono"
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  label={
                    <span>
                      Teléfono / Celular <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="Ej: 341 555-0123"
                  leftIcon={<Phone className="w-4 h-4" aria-hidden="true" />}
                  value={formData.telefono}
                  onChange={(e) => {
                    setFormData({ ...formData, telefono: e.target.value });
                    if (errors.telefono) setErrors({ ...errors, telefono: undefined });
                  }}
                  hint="Mínimo 8 dígitos (fijo o celular con código de área)."
                  error={errors.telefono}
                  required
                />
              </div>

              {/* Dirección y Localidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  ref={direccionRef}
                  id="direccion"
                  name="direccion"
                  autoComplete="street-address"
                  label={
                    <span>
                      Dirección <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="Ej: Av. Santa Fe 1820"
                  value={formData.direccion}
                  onChange={(e) => {
                    setFormData({ ...formData, direccion: e.target.value });
                    if (errors.direccion) setErrors({ ...errors, direccion: undefined });
                  }}
                  error={errors.direccion}
                  required
                />

                <Input
                  ref={localidadRef}
                  id="localidad"
                  name="localidad"
                  autoComplete="address-level2"
                  label={
                    <span>
                      Localidad <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="Ej: Funes"
                  value={formData.localidad}
                  onChange={(e) => {
                    setFormData({ ...formData, localidad: e.target.value });
                    if (errors.localidad) setErrors({ ...errors, localidad: undefined });
                  }}
                  error={errors.localidad}
                  required
                />
              </div>
            </section>

            {/* SECCIÓN 2: DATOS DE ACCESO */}
            <section className="space-y-5" aria-labelledby="sec-datos-acceso">
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h3 id="sec-datos-acceso" className="text-base font-bold text-foreground">
                    Datos de acceso
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Credenciales seguras para consultar tus postulaciones y administrar tus datos.
                  </p>
                </div>
              </div>

              {/* Email y Contraseña */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  label={
                    <span>
                      Correo electrónico <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="tu-correo@ejemplo.com"
                  leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  error={errors.email}
                  required
                />

                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  label={
                    <span>
                      Contraseña <span className="text-destructive">*</span>
                    </span>
                  }
                  placeholder="Mínimo 6 caracteres"
                  leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-brand-800 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  hint="Mínimo 6 caracteres alfanuméricos."
                  error={errors.password}
                  required
                />
              </div>

              {/* Checkbox Términos y Condiciones */}
              <div className="pt-1">
                <Checkbox
                  ref={terminosRef}
                  id="terminos"
                  name="terminos"
                  containerClassName="p-4 bg-brand-50/50 border border-brand-100 rounded-xl"
                  checked={formData.aceptoTerminos}
                  onChange={(e) => {
                    setFormData({ ...formData, aceptoTerminos: e.target.checked });
                    if (errors.terminos) {
                      setErrors({ ...errors, terminos: undefined });
                    }
                  }}
                  label={
                    <span>
                      He leído y acepto los{' '}
                      <button
                        type="button"
                        onClick={handleOpenTermsModal}
                        className="font-semibold text-brand-800 hover:text-brand-900 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-brand-800 rounded-xs cursor-pointer"
                      >
                        términos y condiciones
                      </button>{' '}
                      y la{' '}
                      <button
                        type="button"
                        onClick={handleOpenPrivacyModal}
                        className="font-semibold text-brand-800 hover:text-brand-900 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-brand-800 rounded-xs cursor-pointer"
                      >
                        política de privacidad
                      </button>{' '}
                      del servicio público de intermediación laboral de la Municipalidad de Funes.
                    </span>
                  }
                  error={errors.terminos}
                />
              </div>
            </section>

            {/* Botón de acción principal y aviso de confidencialidad */}
            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center"
                isLoading={isLoading}
              >
                Registrarme
              </Button>

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-800 shrink-0" aria-hidden="true" />
                <span>
                  Tu información no es pública ni se comparte sin previa intermediación municipal.
                </span>
              </p>
            </div>
          </form>
        </div>

        {/* Franja de enlaces al pie de la columna derecha */}
        <RegistroPostulanteFooterLinks />
      </div>

      {/* Modal accesible de términos y condiciones */}
      <TermsAndPrivacyModal
        key={modalTab}
        isOpen={modalOpen}
        role="postulante"
        initialTab={modalTab}
        onClose={() => setModalOpen(false)}
        onAccept={handleAcceptModal}
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="portal-fullpage-layout w-full flex-1 flex flex-col min-h-full">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-8 h-8 rounded-full border-2 border-brand-800 border-t-transparent animate-spin" />
          </div>
        }
      >
        <RegisterPostulanteForm />
      </Suspense>
    </div>
  );
}
