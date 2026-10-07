export type UserRole = 'postulante' | 'empresa' | 'municipalidad' | 'admin';

export type JobStatus =
  | 'borrador'
  | 'pendiente_revision'
  | 'publicada'
  | 'pausada'
  | 'finalizada'
  | 'rechazada';

export type ApplicationStatus =
  | 'postulado'
  | 'en_revision'
  | 'preseleccionado'
  | 'entrevista'
  | 'presentado_a_empresa'
  | 'seleccionado'
  | 'no_seleccionado'
  | 'contratado';

export interface Rubro {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
}

export interface Perfil {
  id: string;
  rol: UserRole;
  role?: UserRole; // Alias de conveniencia para frontend
  nombre: string;
  apellido: string | null;
  dni: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  barrio?: string | null;
  es_residente_funes?: boolean | null;
  nivel_educativo: string | null;
  situacion_laboral_actual: string | null;
  habilidades: string[] | null;
  experiencia_resumen: string | null;
  cv_url: string | null;
  disponibilidad_horaria: string | null;
  movilidad_propia: boolean;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  rubros?: Rubro[];
}

export interface Empresa {
  id: string;
  user_id: string;
  razon_social: string;
  nombre_fantasia: string;
  cuit: string;
  direccion: string;
  localidad: string;
  telefono: string;
  email_contacto: string;
  persona_contacto: string;
  rubro: string | null;
  descripcion: string | null;
  sitio_web: string | null;
  verificada: boolean;
  created_at: string;
  updated_at: string;
}

export interface Oferta {
  id: string;
  empresa_id?: string;
  company_id?: string; // Alias de compatibilidad
  rubro_id: number | null;
  titulo: string;
  descripcion: string;
  requisitos: string;
  experiencia_requerida: string | null;
  tipo_jornada: string;
  tipo_contrato: string | null;
  ubicacion: string;
  rango_salarial: string | null;
  vacantes: number;
  estado: JobStatus;
  destacada: boolean;
  fecha_limite: string | null;
  revisado_por?: string | null;
  fecha_revision?: string | null;
  motivo_rechazo?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  empresa?: Empresa;
  company?: Empresa;
  rubro?: Rubro;
  rubros?: Rubro[];
}

export interface OfertaRubro {
  oferta_id: string;
  rubro_id: number;
  created_at: string;
}

export interface PerfilRubro {
  perfil_id: string;
  rubro_id: number;
  created_at: string;
}

export interface Postulacion {
  id: string;
  oferta_id?: string;
  job_id?: string; // Alias de compatibilidad
  postulante_id: string;
  estado: ApplicationStatus;
  mensaje_postulante: string | null;
  notas_oficina_empleo: string | null;
  derivado_por?: string | null;
  fecha_derivacion?: string | null;
  observaciones_derivacion?: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  oferta?: Oferta;
  job?: Oferta;
  postulante?: Perfil;
}

export interface HistorialPostulacion {
  id: string;
  postulacion_id: string;
  estado_anterior: ApplicationStatus | null;
  estado_nuevo: ApplicationStatus;
  cambiado_por: string | null;
  observaciones: string | null;
  created_at: string;
}

export interface Seguimiento {
  id: string;
  postulante_id: string;
  empresa_id: string | null;
  postulacion_id: string | null;
  fecha_seguimiento: string;
  estado_laboral: string;
  observaciones: string;
  detecto_necesidad_capacitacion: boolean;
  capacitacion_sugerida: string | null;
  creado_por: string | null;
  created_at: string;
}

export interface SchemaMigration {
  version: string;
  name: string;
  applied_at: string;
}

// Aliases retrocompatibles para el frontend
export type Profile = Perfil;
export type Company = Empresa;
export type Job = Oferta;
export type Application = Postulacion;
export type ApplicationHistory = HistorialPostulacion;
export type FollowUp = Seguimiento;
export type JobRubro = OfertaRubro;
export type ProfileRubro = PerfilRubro;

// Representación fiel del esquema de Supabase
export interface Database {
  public: {
    Tables: {
      rubros: {
        Row: Rubro;
        Insert: Omit<Rubro, 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Rubro>;
      };
      perfil: {
        Row: Perfil;
        Insert: Omit<Perfil, 'created_at' | 'updated_at' | 'rubros' | 'role' | 'barrio'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Perfil, 'rubros' | 'role' | 'barrio'>>;
      };
      empresas: {
        Row: Empresa;
        Insert: Omit<Empresa, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Empresa>;
      };
      ofertas: {
        Row: Oferta;
        Insert: Omit<Oferta, 'id' | 'created_at' | 'updated_at' | 'empresa' | 'company' | 'rubro' | 'rubros' | 'company_id'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Oferta, 'empresa' | 'company' | 'rubro' | 'rubros' | 'company_id'>>;
      };
      ofertas_rubros: {
        Row: OfertaRubro;
        Insert: Omit<OfertaRubro, 'created_at'> & { created_at?: string };
        Update: Partial<OfertaRubro>;
      };
      perfil_rubros: {
        Row: PerfilRubro;
        Insert: Omit<PerfilRubro, 'created_at'> & { created_at?: string };
        Update: Partial<PerfilRubro>;
      };
      postulaciones: {
        Row: Postulacion;
        Insert: Omit<Postulacion, 'id' | 'created_at' | 'updated_at' | 'oferta' | 'job' | 'postulante' | 'job_id'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Postulacion, 'oferta' | 'job' | 'postulante' | 'job_id'>>;
      };
      historial_postulacion: {
        Row: HistorialPostulacion;
        Insert: Omit<HistorialPostulacion, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<HistorialPostulacion>;
      };
      seguimiento: {
        Row: Seguimiento;
        Insert: Omit<Seguimiento, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Seguimiento>;
      };
      _schema_migrations: {
        Row: SchemaMigration;
        Insert: Omit<SchemaMigration, 'applied_at'> & { applied_at?: string };
        Update: Partial<SchemaMigration>;
      };
    };
  };
}
