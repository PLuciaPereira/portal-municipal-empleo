export type UserRole = 'postulante' | 'empresa' | 'admin';

export type JobStatus =
  | 'borrador'
  | 'pendiente_revision'
  | 'publicada'
  | 'pausada'
  | 'finalizada';

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

export interface Profile {
  id: string;
  role: UserRole;
  email: string;
  nombre: string;
  apellido: string | null;
  dni: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  barrio: string | null;
  es_residente_funes: boolean;
  nivel_educativo: string | null;
  situacion_laboral_actual: string | null;
  habilidades: string[] | null;
  experiencia_resumen: string | null;
  cv_url: string | null;
  disponibilidad_horaria: string | null;
  movilidad_propia: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
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

export interface Job {
  id: string;
  company_id: string;
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
  created_at: string;
  updated_at: string;
  // Campos opcionales tras joins:
  company?: Company;
  rubro?: Rubro;
}

export interface Application {
  id: string;
  job_id: string;
  postulante_id: string;
  estado: ApplicationStatus;
  mensaje_postulante: string | null;
  notas_oficina_empleo: string | null;
  created_at: string;
  updated_at: string;
  // Campos opcionales tras joins:
  job?: Job;
  postulante?: Profile;
}

export interface ApplicationHistory {
  id: string;
  application_id: string;
  estado_anterior: ApplicationStatus | null;
  estado_nuevo: ApplicationStatus;
  cambiado_por: string | null;
  observaciones: string | null;
  created_at: string;
}

export interface FollowUp {
  id: string;
  postulante_id: string;
  company_id: string | null;
  application_id: string | null;
  fecha_seguimiento: string;
  estado_laboral: string;
  observaciones: string;
  detecto_necesidad_capacitacion: boolean;
  capacitacion_sugerida: string | null;
  creado_por: string | null;
  created_at: string;
}

// Representación del esquema de Supabase
export interface Database {
  public: {
    Tables: {
      rubros: {
        Row: Rubro;
        Insert: Omit<Rubro, 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Rubro>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
      };
      companies: {
        Row: Company;
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Company>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'company' | 'rubro'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Job, 'company' | 'rubro'>>;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at' | 'job' | 'postulante'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Application, 'job' | 'postulante'>>;
      };
      application_history: {
        Row: ApplicationHistory;
        Insert: Omit<ApplicationHistory, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ApplicationHistory>;
      };
      follow_ups: {
        Row: FollowUp;
        Insert: Omit<FollowUp, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<FollowUp>;
      };
    };
  };
}
