'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  GraduationCap,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Rubro } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { registrarPostulanteAsistido } from '@/lib/admin';

const NIVELES_EDUCATIVOS = [
  'Primario incompleto',
  'Primario completo',
  'Secundario incompleto',
  'Secundario en curso',
  'Secundario completo',
  'Terciario / Técnico en curso',
  'Terciario / Técnico completo',
  'Universitario en curso',
  'Universitario completo',
  'Posgrado',
];

const SITUACIONES_LABORALES = [
  'En búsqueda activa (desempleado/a)',
  'Trabajando (buscando mejorar o cambiar)',
  'Trabajador/a independiente o eventual',
  'Primer empleo / Estudiante',
];

const DISPONIBILIDADES_HORARIAS = [
  'Jornada completa (Full-time)',
  'Media jornada (Part-time - Mañana)',
  'Media jornada (Part-time - Tarde)',
  'Horarios rotativos / Fines de semana',
  'Flexible / A convenir',
];

export function ManualProfileRegister({ onCreated }: { onCreated?: () => void }) {
  const [rubrosDisponibles, setRubrosDisponibles] = useState<Rubro[]>([]);
  const [loadingRubros, setLoadingRubros] = useState(true);

  // Campos de Identificación (Idénticos al Postulante)
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('Funes');

  // Campos de Formación y Disponibilidad
  const [nivelEducativo, setNivelEducativo] = useState(NIVELES_EDUCATIVOS[4]); // Secundario completo por defecto
  const [situacionLaboral, setSituacionLaboral] = useState(SITUACIONES_LABORALES[0]);
  const [disponibilidadHoraria, setDisponibilidadHoraria] = useState(DISPONIBILIDADES_HORARIAS[0]);
  const [movilidadPropia, setMovilidadPropia] = useState(false);
  const [experienciaResumen, setExperienciaResumen] = useState('');
  const [habilidadesTexto, setHabilidadesTexto] = useState('');
  const [selectedRubroIds, setSelectedRubroIds] = useState<number[]>([]);

  // Foto y CV opcional
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar rubros activos
  useEffect(() => {
    let isMounted = true;
    async function loadRubros() {
      const supabase = createClient();
      const { data } = await supabase.from('rubros').select('*').eq('activo', true).order('nombre');
      if (isMounted) {
        setRubrosDisponibles(data || []);
        setLoadingRubros(false);
      }
    }
    void loadRubros();
    return () => {
      isMounted = false;
    };
  }, []);

  // Calcular esResidenteFunes directamente según la localidad sin trigger de setState en effect
  const esResidenteFunes = localidad.trim().toLowerCase() === 'funes';

  const toggleRubro = (id: number) => {
    setSelectedRubroIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const habilidades = habilidadesTexto
      .split(',')
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    try {
      const res = await registrarPostulanteAsistido({
        nombre,
        apellido,
        dni,
        email: email.trim() || undefined,
        telefono,
        fecha_nacimiento: fechaNacimiento || null,
        direccion: direccion || null,
        localidad: localidad || 'Funes',
        es_residente_funes: esResidenteFunes,
        nivel_educativo: nivelEducativo,
        situacion_laboral_actual: situacionLaboral,
        disponibilidad_horaria: disponibilidadHoraria,
        movilidad_propia: movilidadPropia,
        experiencia_resumen: experienciaResumen || null,
        habilidades,
        rubroIds: selectedRubroIds,
        avatar_url: avatarUrl || null,
        cvFile: cvFile || undefined,
      });

      if (res.success) {
        setSuccessMsg(`Legajo laboral de ${nombre} ${apellido} registrado correctamente en el sistema.`);
        // Reset form
        setNombre('');
        setApellido('');
        setDni('');
        setEmail('');
        setTelefono('');
        setFechaNacimiento('');
        setDireccion('');
        setLocalidad('Funes');
        setExperienciaResumen('');
        setHabilidadesTexto('');
        setSelectedRubroIds([]);
        setCvFile(null);
        setAvatarUrl('');
        if (onCreated) onCreated();
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Error de red al procesar el registro asistido.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800 text-emerald-100 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Inclusión Digital y Atención Municipal
          </div>
          <h2 className="text-xl font-bold">Carga Manual Asistida de Perfil</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-2xl leading-relaxed">
            Formulario institucional para registrar legajos de personas mayores o vecinos sin conectividad/dispositivos. Este registro ingresa de forma oficial al Padrón de Postulantes con todas sus competencias y prioridad local.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Datos Personales y Contacto */}
        <Card className="p-6 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-brand-800)] border-b border-slate-100 pb-2 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            1. Identificación y Contacto
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Roberto Carlos"
            />
            <Input
              label="Apellido *"
              required
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              placeholder="Ej: Rossi"
            />
            <Input
              label="DNI (sin puntos) *"
              required
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ej: 14234567"
            />
            <Input
              label="Teléfono / Celular de contacto *"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 341 555-4321"
            />
            <Input
              label="Correo electrónico (Opcional si no posee)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Si no tiene, se generará legajo administrativo"
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Input
                label="Localidad de residencia *"
                required
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder="Ej: Funes"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    esResidenteFunes ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {esResidenteFunes ? '✓ Residente de Funes (Prioridad Activa)' : 'Otras Localidades'}
                </span>
              </div>
            </div>

            <Input
              label="Dirección / Domicilio / Barrio"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, barrio"
            />
          </div>
        </Card>

        {/* SECCIÓN 2: Formación y Situación Laboral */}
        <Card className="p-6 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-brand-800)] border-b border-slate-100 pb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            2. Formación y Disponibilidad
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nivel Educativo *</label>
              <select
                required
                value={nivelEducativo}
                onChange={(e) => setNivelEducativo(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
              >
                {NIVELES_EDUCATIVOS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Situación Laboral Actual *</label>
              <select
                required
                value={situacionLaboral}
                onChange={(e) => setSituacionLaboral(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
              >
                {SITUACIONES_LABORALES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Disponibilidad Horaria *</label>
              <select
                required
                value={disponibilidadHoraria}
                onChange={(e) => setDisponibilidadHoraria(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
              >
                {DISPONIBILIDADES_HORARIAS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <Checkbox
                id="movilidad_propia"
                checked={movilidadPropia}
                onChange={(e) => setMovilidadPropia(e.target.checked)}
                label="Cuenta con vehículo o movilidad propia"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 3: Trayectoria, Competencias y Rubros */}
        <Card className="p-6 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-brand-800)] border-b border-slate-100 pb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            3. Competencias Laborales y Rubros
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Resumen de experiencia o trayectoria laboral
            </label>
            <textarea
              rows={3}
              value={experienciaResumen}
              onChange={(e) => setExperienciaResumen(e.target.value)}
              placeholder="Describí los puestos previos, oficios, años de experiencia o trabajos realizados..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-800)] focus:outline-none"
            />
          </div>

          <div>
            <Input
              label="Habilidades o conocimientos (separadas por coma)"
              value={habilidadesTexto}
              onChange={(e) => setHabilidadesTexto(e.target.value)}
              placeholder="Ej: Albañilería, Plomería, Manejo de caja, Atención al público, Excel"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Rubros o sectores de interés para empleo
            </label>
            {loadingRubros ? (
              <p className="text-xs text-slate-400">Cargando rubros...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {rubrosDisponibles.map((rubro) => {
                  const isSelected = selectedRubroIds.includes(rubro.id);
                  return (
                    <button
                      key={rubro.id}
                      type="button"
                      onClick={() => toggleRubro(rubro.id)}
                      className={`p-2 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--color-brand-800)] bg-emerald-50 text-[var(--color-brand-800)]'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{rubro.nombre}</span>
                      {isSelected && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* SECCIÓN 4: Foto de Perfil y Archivo de CV */}
        <Card className="p-6 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-brand-800)] border-b border-slate-100 pb-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            4. Foto de Perfil y Documentación Adjunta
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Foto de Perfil (URL de imagen o foto de legajo)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://... o dejar vacío"
              />
              <p className="text-[11px] text-slate-400 mt-1">Opcional. Permite identificar al postulante en el padrón municipal.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CV o Documento Escaneado (PDF/DOCX/JPG)
              </label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center">
                <input
                  type="file"
                  id="cv-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCvFile(e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor="cv-upload"
                  className="cursor-pointer flex flex-col items-center justify-center text-xs text-slate-600 hover:text-emerald-800"
                >
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  {cvFile ? (
                    <span className="font-bold text-emerald-800">{cvFile.name}</span>
                  ) : (
                    <span>Hacé clic para adjuntar archivo de CV</span>
                  )}
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Botón de Guardado */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 gap-2"
          >
            <UserPlus className="w-5 h-5" />
            {saving ? 'Registrando Legajo...' : 'Guardar y Dar de Alta en Padrón'}
          </Button>
        </div>
      </form>
    </div>
  );
}
