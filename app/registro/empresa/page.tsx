'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { TermsAndPrivacyModal } from '@/components/shared/TermsAndPrivacyModal';
import { getRubros } from '@/lib/jobs';
import { createClient } from '@/lib/supabase/client';
import { FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { Rubro } from '@/types/database';
import {
  formatCuit,
  validateCuitModulo11,
  validateEmail,
  validatePhone,
  validatePassword,
  validateUrl,
} from '@/lib/validators';
import {
  Building2,
  Info,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  ChevronDown,
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

/**
 * Panel lateral institucional (v2c)
 * Fijo a 400px en desktop, sticky y compacto en mobile.
 */
function RegistroEmpresaAside() {
  return (
    <aside className="bg-brand-800 text-white p-6 sm:p-10 lg:p-10 flex flex-col gap-8 lg:justify-between">
      <div className="space-y-8 lg:sticky lg:top-24">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 text-white shadow-md shadow-brand-900/10 p-2.5 ring-4 ring-brand-700/60">
            <Building2 className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Registro de Empresas y Comercios
            </h1>
            <p className="text-sm text-brand-200 leading-relaxed">
              Completá los datos comerciales y de acceso para comenzar a publicar búsquedas laborales en la ciudad de Funes.
            </p>
          </div>
        </div>

        {/* Índice puramente informativo de secciones (solo desktop, no intercepta foco) */}
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
                Datos de la empresa
              </p>
              <p className="text-xs text-brand-200">Identificación y actividad</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border bg-white/10 text-brand-200 border-white/30">
              2
            </span>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                Persona responsable
              </p>
              <p className="text-xs text-brand-200">Quién administra la cuenta</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border bg-white/10 text-brand-200 border-white/30">
              3
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
    </aside>
  );
}

/**
 * Franja de enlaces al pie de la columna derecha
 */
function RegistroEmpresaFooterLinks() {
  return (
    <div className="p-5 sm:p-6 bg-brand-50/40 border-t border-border/70 text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-2 text-center sm:text-left w-full">
      <div>
        ¿Tu empresa ya está registrada?{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-800 hover:text-brand-900 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-brand-800 rounded-xs"
        >
          Iniciá sesión acá
        </Link>
      </div>
      <div>
        ¿Sos vecino y buscás empleo?{' '}
        <Link
          href="/registro"
          className="font-semibold text-brand-800 hover:text-brand-900 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-brand-800 rounded-xs"
        >
          Registrate como Postulante
        </Link>
      </div>
    </div>
  );
}

const sectionGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '22px 24px',
  alignItems: 'start',
};

function RegisterEmpresaForm() {
  const router = useRouter();
  const { registerEmpresa, isLoading } = useAuth();

  // Lista de rubros cargada dinámicamente desde base de datos / mock
  
  // Estado para múltiples documentos opcionales
  const [documentos, setDocumentos] = useState<
    { file: File; nombre: string; tipo: string; id: string }[]
  >([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [isLoadingRubros, setIsLoadingRubros] = useState(true);

  // Estados del formulario
  const [formData, setFormData] = useState({
    razonSocial: '',
    nombreFantasia: '',
    cuit: '',
    rubro: '',
    direccion: '',
    localidad: '',
    telefono: '',
    email: '',
    personaContacto: '',
    sitioWeb: '',
    password: '',
    confirmPassword: '',
    aceptoTerminos: false,
  });

  // Errores inline por campo y general
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Validaciones visuales en caliente
  const [isCuitValid, setIsCuitValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modal legal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'terminos' | 'privacidad'>('terminos');

  // Pantalla de confirmación de registro
  const [successConfirmation, setSuccessConfirmation] = useState(false);

  // Referencias individuales para foco accesible en el primer error
  const razonSocialRef = useRef<HTMLInputElement>(null);
  const cuitRef = useRef<HTMLInputElement>(null);
  const rubroRef = useRef<HTMLSelectElement>(null);
  const direccionRef = useRef<HTMLInputElement>(null);
  const localidadRef = useRef<HTMLInputElement>(null);
  const nombreFantasiaRef = useRef<HTMLInputElement>(null);
  const sitioWebRef = useRef<HTMLInputElement>(null);
  const personaContactoRef = useRef<HTMLInputElement>(null);
  const telefonoRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const terminosRef = useRef<HTMLInputElement>(null);

  // Carga inicial de rubros
  useEffect(() => {
    let isMounted = true;
    getRubros()
      .then((data) => {
        if (isMounted) {
          setRubros(data);
          setIsLoadingRubros(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingRubros(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Manejador de cambio con máscara automática de CUIT
  
  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`El archivo ${f.name} supera el límite de 5MB.`);
        return false;
      }
      return true;
    });

    const newDocs = validFiles.map((f) => ({
      file: f,
      nombre: f.name,
      tipo: f.name.toLowerCase().includes('cuit') ? 'Constancia CUIT' : 'Documentación societaria / comercial',
      id: Math.random().toString(36).substring(2, 9),
    }));

    setDocumentos((prev) => [...prev, ...newDocs]);
  };

  const handleRemoveDoc = (id: string) => {
    setDocumentos((prev) => prev.filter((d) => d.id !== id));
  };

  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCuit(e.target.value);
    setFormData((prev) => ({ ...prev, cuit: formatted }));

    if (errors.cuit) {
      setErrors((prev) => ({ ...prev, cuit: undefined }));
    }

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 11) {
      const res = validateCuitModulo11(formatted);
      if (!res.isValid) {
        setErrors((prev) => ({ ...prev, cuit: res.message }));
        setIsCuitValid(false);
      } else {
        setIsCuitValid(true);
      }
    } else {
      setIsCuitValid(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const newErrors: Record<string, string> = {};

    // 1. Datos de la empresa
    if (!formData.razonSocial.trim()) {
      newErrors.razonSocial = 'Por favor ingresá la Razón Social.';
    }

    const cuitResult = validateCuitModulo11(formData.cuit);
    if (!cuitResult.isValid) {
      newErrors.cuit = cuitResult.message || 'El CUIT ingresado no es válido.';
    }

    if (!formData.rubro) {
      newErrors.rubro = 'Por favor seleccioná el rubro de la empresa.';
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = 'Por favor ingresá la dirección de la empresa o local.';
    }

    if (!formData.localidad.trim()) {
      newErrors.localidad = 'Por favor ingresá la localidad.';
    }

    if (formData.sitioWeb && !validateUrl(formData.sitioWeb)) {
      newErrors.sitioWeb =
        'Por favor ingresá una dirección web o perfil válido (ej: instagram.com/miempresa).';
    }

    // 2. Persona responsable
    if (!formData.personaContacto.trim()) {
      newErrors.personaContacto = 'Por favor ingresá el nombre de la persona responsable.';
    }

    if (!validatePhone(formData.telefono)) {
      newErrors.telefono =
        'Por favor ingresá un número de teléfono válido (mínimo 8 dígitos).';
    }

    // 3. Datos de acceso
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Por favor ingresá un correo electrónico corporativo válido.';
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

        if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Por favor confirmá tu contraseña.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (!formData.aceptoTerminos) {
      newErrors.terminos = 'Debés aceptar los términos y condiciones para continuar.';
    }

    // Si hay errores de validación, enfocar el primer campo inválido
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      if (newErrors.razonSocial) {
        razonSocialRef.current?.focus();
      } else if (newErrors.cuit) {
        cuitRef.current?.focus();
      } else if (newErrors.rubro) {
        rubroRef.current?.focus();
      } else if (newErrors.direccion) {
        direccionRef.current?.focus();
      } else if (newErrors.localidad) {
        localidadRef.current?.focus();
      } else if (newErrors.nombreFantasia) {
        nombreFantasiaRef.current?.focus();
      } else if (newErrors.sitioWeb) {
        sitioWebRef.current?.focus();
      } else if (newErrors.personaContacto) {
        personaContactoRef.current?.focus();
      } else if (newErrors.telefono) {
        telefonoRef.current?.focus();
      } else if (newErrors.email) {
        emailRef.current?.focus();
      } else if (newErrors.password) {
        passwordRef.current?.focus();
      } else if (newErrors.confirmPassword) {
        confirmPasswordRef.current?.focus();
      } else if (newErrors.terminos) {
        terminosRef.current?.focus();
      }
      return;
    }

    setErrors({});

    // Enviar registro a AuthContext
    const res = await registerEmpresa({
      razon_social: formData.razonSocial.trim(),
      nombre_fantasia: formData.nombreFantasia.trim() || formData.razonSocial.trim(),
      cuit: formData.cuit.trim(),
      rubro: formData.rubro,
      direccion: formData.direccion.trim(),
      localidad: formData.localidad.trim(),
      telefono: formData.telefono.trim(),
      persona_contacto: formData.personaContacto.trim(),
      email: formData.email.trim(),
      sitio_web: formData.sitioWeb.trim() || undefined,
      password: formData.password,
      acepta_terminos: true,
    });

    if (res.success) {
      // Subir documentos si se adjuntaron
      if (documentos.length > 0) {
        try {
          setUploadingDocs(true);
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const uploadedMetadata: any[] = [];
            for (const doc of documentos) {
              const fileExt = doc.file.name.split('.').pop() || 'pdf';
              const filePath = `${user.id}/${Date.now()}_${doc.file.name.replace(/\s+/g, '_')}`;
              const { error: upErr } = await supabase.storage
                .from('empresas-documentos')
                .upload(filePath, doc.file, { upsert: true });

              if (!upErr) {
                uploadedMetadata.push({
                  nombre: doc.nombre,
                  tipo: doc.tipo,
                  path: filePath,
                  tamano: doc.file.size,
                  created_at: new Date().toISOString(),
                });
              } else {
                console.warn('Error subiendo documento:', upErr);
              }
            }

            if (uploadedMetadata.length > 0) {
              await supabase
                .from('empresas')
                .update({ documentos: uploadedMetadata })
                .eq('user_id', user.id);
            }
          }
        } catch (docErr) {
          console.warn('Error al subir documentación adjunta:', docErr);
        } finally {
          setUploadingDocs(false);
        }
      }

      if (res.requiresEmailConfirmation) {
        setSuccessConfirmation(true);
      } else {
        router.push('/empresa');
      }
    } else {
      const errorMsg = res.error || 'No se pudo registrar la empresa.';
      const lower = errorMsg.toLowerCase();

      // Mapeo de errores de backend a campos específicos
      if (lower.includes('cuit')) {
        setErrors((prev) => ({ ...prev, cuit: errorMsg }));
        cuitRef.current?.focus();
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

  // Pantalla de confirmación luego de registrarse (adaptada al layout v2c pantalla completa)
  if (successConfirmation) {
    return (
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] bg-surface">
        <RegistroEmpresaAside />

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
                Si la empresa no tenía una cuenta previa, es posible que recibas instrucciones en{' '}
                <span className="font-semibold text-foreground">{formData.email}</span> para
                verificar el registro. Si ya contabas con una cuenta, podés iniciar sesión o
                restablecer tu contraseña.
              </p>
            </div>

            <div className="w-full p-4 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 text-left space-y-1.5">
              <span className="font-bold block">
                Estado: Pendiente de Aprobación Municipal
              </span>
              <p className="text-brand-800 leading-relaxed">
                Conforme a la normativa municipal, el equipo de la Oficina de Empleo revisará los datos comerciales antes de habilitar la publicación de ofertas laborales.
              </p>
            </div>

            <div className="pt-2 w-full sm:w-auto">
              <Button href="/login" variant="primary" size="lg" className="w-full sm:w-auto px-8 justify-center">
                Ir a Iniciar Sesión
              </Button>
            </div>
          </div>

          <RegistroEmpresaFooterLinks />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] bg-surface">
      {/* ========================================================================= */}
      {/* PANEL LATERAL BRAND-800 (Fijo 400px en desktop, sticky en desktop) */}
      {/* ========================================================================= */}
      <RegistroEmpresaAside />

      {/* ========================================================================= */}
      {/* COLUMNA DERECHA (Formulario ancho completo + Franja al pie) */}
      {/* ========================================================================= */}
      <div className="flex flex-col justify-between min-w-0 bg-surface">
        <form
          onSubmit={handleSubmit}
          className="w-full px-6 lg:px-12 py-8 sm:py-10 lg:py-12 space-y-8 flex-1 flex flex-col justify-start"
          noValidate
        >
          <p className="text-xs text-muted-foreground text-right">
            <span className="text-destructive" aria-hidden="true">*</span> Obligatorio
          </p>

          {/* Error general si no corresponde a un campo específico */}
          {generalError && (
            <div
              role="alert"
              className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{generalError}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN 1: DATOS DE LA EMPRESA */}
          {/* ========================================================================= */}
          <section className="space-y-5" aria-labelledby="sec1-title">
            <div className="flex items-center gap-3 border-b border-border/80 pb-3">
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h2 id="sec1-title" className="text-base font-bold text-foreground">
                  Datos de la empresa
                </h2>
                <p className="text-xs text-muted-foreground">
                  Información para identificar la firma y clasificar su actividad económica en el municipio.
                </p>
              </div>
            </div>

            <div style={sectionGridStyle}>
              {/* Fila 1: Razón Social (*) | CUIT (*) | Nombre de fantasía (opcional) */}
              <Input
                ref={razonSocialRef}
                id="razonSocial"
                name="razonSocial"
                required
                label={
                  <span>
                    Razón Social <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="Ej: Funes Retail S.R.L."
                value={formData.razonSocial}
                onChange={(e) => {
                  setFormData({ ...formData, razonSocial: e.target.value });
                  if (errors.razonSocial) {
                    setErrors({ ...errors, razonSocial: undefined });
                  }
                }}
                error={errors.razonSocial}
              />

              <Input
                ref={cuitRef}
                id="cuit"
                name="cuit"
                required
                maxLength={13}
                inputMode="numeric"
                label={
                  <span>
                    CUIT <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="30-12345678-9"
                value={formData.cuit}
                onChange={handleCuitChange}
                hint="Se completa con guiones automáticamente."
                error={errors.cuit}
                success={isCuitValid}
                rightElement={
                  isCuitValid ? (
                    <div className="text-success pointer-events-none">
                      <Check className="w-5 h-5" aria-hidden="true" />
                    </div>
                  ) : undefined
                }
                className="font-mono"
              />

              <Input
                ref={nombreFantasiaRef}
                id="nombreFantasia"
                name="nombreFantasia"
                label={
                  <span className="flex items-center gap-1.5">
                    <span>Nombre de Fantasía</span>
                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </span>
                }
                placeholder="Ej: Supermercado Funes"
                value={formData.nombreFantasia}
                onChange={(e) =>
                  setFormData({ ...formData, nombreFantasia: e.target.value })
                }
              />

              {/* Fila 2: Rubro o actividad (*) | Dirección (*) | Localidad (*) */}
              <div className="w-full space-y-1.5">
                <label
                  htmlFor="rubro"
                  className="block text-sm font-medium text-foreground"
                >
                  Rubro o actividad <span className="text-destructive" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    ref={rubroRef}
                    id="rubro"
                    name="rubro"
                    required
                    aria-invalid={!!errors.rubro}
                    aria-describedby={errors.rubro ? 'rubro-error' : undefined}
                    value={formData.rubro}
                    onChange={(e) => {
                      setFormData({ ...formData, rubro: e.target.value });
                      if (errors.rubro) {
                        setErrors({ ...errors, rubro: undefined });
                      }
                    }}
                    className={`w-full h-11 px-3.5 pr-10 rounded-xl border bg-surface text-foreground text-sm transition-all duration-150 focus:outline-none focus:ring-3 appearance-none cursor-pointer ${
                      errors.rubro
                        ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                        : 'border-border hover:border-brand-600/70 focus:border-brand-800 focus:ring-brand-800/15'
                    }`}
                  >
                    <option value="" disabled>
                      {isLoadingRubros
                        ? 'Cargando rubros disponibles...'
                        : 'Seleccioná un rubro o actividad...'}
                    </option>
                    {rubros.map((r) => (
                      <option key={r.id} value={r.nombre}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  </div>
                </div>
                {errors.rubro && (
                  <p
                    id="rubro-error"
                    className="text-xs text-destructive font-medium flex items-center gap-1 mt-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.rubro}</span>
                  </p>
                )}
              </div>

              <Input
                ref={direccionRef}
                id="direccion"
                name="direccion"
                required
                label={
                  <span>
                    Dirección del establecimiento{' '}
                    <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="Ej: Santa Fe 1650"
                value={formData.direccion}
                onChange={(e) => {
                  setFormData({ ...formData, direccion: e.target.value });
                  if (errors.direccion) {
                    setErrors({ ...errors, direccion: undefined });
                  }
                }}
                error={errors.direccion}
              />

              <Input
                ref={localidadRef}
                id="localidad"
                name="localidad"
                required
                label={
                  <span>
                    Localidad <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="Ej: Funes"
                value={formData.localidad}
                onChange={(e) => {
                  setFormData({ ...formData, localidad: e.target.value });
                  if (errors.localidad) {
                    setErrors({ ...errors, localidad: undefined });
                  }
                }}
                error={errors.localidad}
              />

              {/* Fila 3: Página web o redes sociales (opcional, ancho completo) */}
              <div className="col-span-full" style={{ gridColumn: '1 / -1' }}>
                <Input
                  ref={sitioWebRef}
                  id="sitioWeb"
                  name="sitioWeb"
                  leftIcon={<Globe className="w-4 h-4" aria-hidden="true" />}
                  label={
                    <span className="flex items-center gap-1.5">
                      <span>Página web o redes sociales</span>
                      <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                    </span>
                  }
                  placeholder="instagram.com/miempresa"
                  value={formData.sitioWeb}
                  onChange={(e) => {
                    setFormData({ ...formData, sitioWeb: e.target.value });
                    if (errors.sitioWeb) {
                      setErrors({ ...errors, sitioWeb: undefined });
                    }
                  }}
                  error={errors.sitioWeb}
                />
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECCIÓN 2: PERSONA RESPONSABLE */}
          {/* ========================================================================= */}
          <section className="space-y-5" aria-labelledby="sec2-title">
            <div className="flex items-center gap-3 border-b border-border/80 pb-3">
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h2 id="sec2-title" className="text-base font-bold text-foreground">
                  Persona responsable
                </h2>
                <p className="text-xs text-muted-foreground">
                  Datos del referente institucional o responsable de Recursos Humanos que administrará la cuenta.
                </p>
              </div>
            </div>

            <div style={sectionGridStyle}>
              <Input
                ref={personaContactoRef}
                id="personaContacto"
                name="personaContacto"
                required
                leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
                label={
                  <span>
                    Nombre y apellido{' '}
                    <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="Ej: Martín Rodríguez"
                value={formData.personaContacto}
                onChange={(e) => {
                  setFormData({ ...formData, personaContacto: e.target.value });
                  if (errors.personaContacto) {
                    setErrors({ ...errors, personaContacto: undefined });
                  }
                }}
                error={errors.personaContacto}
              />

              <Input
                ref={telefonoRef}
                id="telefono"
                name="telefono"
                type="tel"
                inputMode="numeric"
                required
                leftIcon={<Phone className="w-4 h-4" aria-hidden="true" />}
                label={
                  <span>
                    Teléfono de contacto{' '}
                    <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="Ej: 3414931234"
                value={formData.telefono}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, telefono: onlyNums });
                  if (errors.telefono) {
                    setErrors({ ...errors, telefono: undefined });
                  }
                }}
                hint="Mínimo 8 dígitos numéricos (con código de área)."
                error={errors.telefono}
              />
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECCIÓN 3: DATOS DE ACCESO */}
          {/* ========================================================================= */}
          <section className="space-y-5" aria-labelledby="sec3-title">
            <div className="flex items-center gap-3 border-b border-border/80 pb-3">
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h2 id="sec3-title" className="text-base font-bold text-foreground">
                  Datos de acceso
                </h2>
                <p className="text-xs text-muted-foreground">
                  Credenciales con las que ingresarás al panel de gestión de ofertas y candidatos.
                </p>
              </div>
            </div>

            <div style={sectionGridStyle}>
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                required
                leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
                label={
                  <span>
                    Correo electrónico{' '}
                    <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="rrhh@empresa.com.ar"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                error={errors.email}
              />

              <Input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
                label={
                  <span>
                    Contraseña <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                hint="Mínimo 6 caracteres (alfanumérico recomendado)."
                error={errors.password}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-pressed={showPassword}
                    aria-label="Mostrar u ocultar contraseña"
                    className="text-placeholder hover:text-foreground focus:outline-none focus:ring-1 focus:ring-brand-800 rounded p-1 cursor-pointer transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />

              <Input
                ref={confirmPasswordRef}
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
                label={
                  <span>
                    Repetir contraseña <span className="text-destructive" aria-hidden="true">*</span>
                  </span>
                }
                placeholder="Reingresá tu contraseña"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                error={errors.confirmPassword}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-pressed={showConfirmPassword}
                    aria-label="Mostrar u ocultar confirmación de contraseña"
                    className="text-placeholder hover:text-foreground focus:outline-none focus:ring-1 focus:ring-brand-800 rounded p-1 cursor-pointer transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />
            </div>

            {/* ========================================================================= */}
          {/* SECCIÓN 3: DOCUMENTACIÓN DE LA EMPRESA (OPCIONAL) */}
          {/* ========================================================================= */}
          <section className="space-y-4" aria-labelledby="sec3-title">
            <div className="flex items-center gap-3 border-b border-border/80 pb-3">
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h2 id="sec3-title" className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Documentación comercial o societaria</span>
                  <span className="text-xs font-normal text-muted-foreground bg-zinc-100 px-2 py-0.5 rounded-full">Opcional</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Podés adjuntar constancias para facilitar y acelerar la validación de identidad por parte de la Oficina de Empleo.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-brand-50/40 rounded-2xl border border-dashed border-brand-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-brand-900 block">
                    Adjuntar Constancia de CUIT, Habilitación o Estatuto
                  </span>
                  <p className="text-[11px] text-brand-800/80 leading-relaxed">
                    Formatos admitidos: PDF, JPG, PNG. Podés seleccionar varios archivos (máx. 5MB cada uno). No es un requisito excluyente para registrarte.
                  </p>
                </div>

                <label className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-800 text-white rounded-xl text-xs font-semibold hover:bg-brand-900 transition-colors shadow-2xs">
                  <Upload className="w-4 h-4" />
                  <span>Seleccionar archivos</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAddFiles}
                    disabled={isLoading || uploadingDocs}
                  />
                </label>
              </div>

              {documentos.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-brand-200/60">
                  <span className="text-xs font-bold text-zinc-700 block">
                    Archivos listos para enviar ({documentos.length}):
                  </span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {documentos.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-brand-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-zinc-900 truncate">{doc.nombre}</p>
                            <p className="text-[10px] text-zinc-500">{(doc.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 transition-colors ml-2"
                          title="Quitar archivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Checkbox de Términos y Condiciones y Política de Privacidad */}
            <div className="pt-2">
              <Checkbox
                ref={terminosRef}
                id="terminos"
                name="terminos"
                required
                checked={formData.aceptoTerminos}
                onChange={(e) => {
                  setFormData({ ...formData, aceptoTerminos: e.target.checked });
                  if (errors.terminos) {
                    setErrors({ ...errors, terminos: undefined });
                  }
                }}
                containerClassName="p-3.5 rounded-xl bg-brand-50/50 border border-brand-100 hover:bg-brand-50 transition-colors"
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
                    del servicio de intermediación laboral de la Municipalidad de Funes.
                  </span>
                }
                error={errors.terminos}
              />
            </div>
          </section>

          {/* ========================================================================= */}
          {/* BOTÓN PRINCIPAL Y AVISO DISCRETO (SIEMPRE DEBAJO DEL BOTÓN) */}
          {/* ========================================================================= */}
          <div className="mt-auto pt-6 border-t border-border/80 space-y-3 flex flex-col items-stretch sm:items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 h-12 bg-brand-800 text-white font-semibold rounded-xl hover:bg-brand-900 active:bg-brand-950 transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-800 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Registrando empresa...</span>
                </>
              ) : (
                <span>Registrar empresa</span>
              )}
            </button>

            {/* Aviso discreto requerido */}
            <p className="text-xs text-center sm:text-right text-muted-foreground flex items-center justify-center sm:justify-end gap-1.5">
              <Info className="w-4 h-4 text-brand-700 shrink-0" aria-hidden="true" />
              <span>Tu cuenta quedará pendiente de aprobación por la Municipalidad de Funes.</span>
            </p>
          </div>
        </form>

        {/* Franja de enlaces al pie de la columna derecha */}
        <RegistroEmpresaFooterLinks />
      </div>

      {/* Modal accesible de términos y condiciones */}
      <TermsAndPrivacyModal
        key={modalTab}
        isOpen={modalOpen}
        role="empresa"
        initialTab={modalTab}
        onClose={() => setModalOpen(false)}
        onAccept={handleAcceptModal}
      />
    </div>
  );
}

export default function RegisterEmpresaPage() {
  return (
    <div className="portal-fullpage-layout w-full flex-1 flex flex-col min-h-full">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="inline-block animate-spin h-8 w-8 text-brand-800" />
          </div>
        }
      >
        <RegisterEmpresaForm />
      </Suspense>
    </div>
  );
}
