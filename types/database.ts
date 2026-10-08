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
  | 'rechazado_por_empresa'
  | 'retirado_por_postulante'
  | 'contratado';

export type EstadoEmpresa = 'pendiente' | 'aprobada' | 'rechazada';

export type EstadoPostulanteCurso =
  | 'asignado'
  | 'en_curso'
  | 'completado'
  | 'abandonado'
  | 'cancelado';

export type Rubro = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
};

export type Curriculum = {
  id: string;
  postulante_id: string;
  nombre_cv: string;
  archivo_url: string;
  es_principal: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Perfil = {
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
  localidad?: string | null;
  es_residente_funes?: boolean | null;
  nivel_educativo: string | null;
  situacion_laboral_actual: string | null;
  habilidades: string[] | null;
  experiencia_resumen: string | null;
  cv_url: string | null;
  disponibilidad_horaria: string | null;
  movilidad_propia: boolean;
  es_admin_general?: boolean;
  es_superadmin?: boolean;
  activo?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  rubros?: Rubro[];
  curriculums?: Curriculum[];
};

export type Empresa = {
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
  estado?: EstadoEmpresa;
  motivo_rechazo?: string | null;
  revisado_por?: string | null;
  fecha_revision?: string | null;
  created_at: string;
  updated_at: string;
};

export type Oferta = {
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
};

export type OfertaRubro = {
  oferta_id: string;
  rubro_id: number;
  created_at: string;
};

export type PerfilRubro = {
  perfil_id: string;
  rubro_id: number;
  created_at: string;
};

export type Postulacion = {
  id: string;
  oferta_id?: string;
  job_id?: string; // Alias de compatibilidad
  postulante_id: string;
  cv_id: string | null;
  cv_url_snapshot: string | null;
  estado: ApplicationStatus;
  mensaje_postulante: string | null;
  notas_oficina_empleo: string | null;
  derivado_por?: string | null;
  fecha_derivacion?: string | null;
  observaciones_derivacion?: string | null;
  motivo_rechazo_empresa?: string | null;
  fecha_rechazo_empresa?: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  oferta?: Oferta;
  job?: Oferta;
  postulante?: Perfil;
  cv?: Curriculum;
};

export type HistorialPostulacion = {
  id: string;
  postulacion_id: string;
  estado_anterior: ApplicationStatus | null;
  estado_nuevo: ApplicationStatus;
  cambiado_por: string | null;
  observaciones: string | null;
  created_at: string;
};

export type Curso = {
  id: string;
  titulo: string;
  descripcion: string | null;
  institucion: string | null;
  duracion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type PostulanteCurso = {
  id: string;
  postulante_id: string;
  curso_id: string;
  asignado_por: string | null;
  fecha_asignacion: string;
  estado: EstadoPostulanteCurso;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  curso?: Curso;
  postulante?: Perfil;
};

export type Seguimiento = {
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
};

export type VistaCandidatoEmpresa = {
  postulacion_id: string;
  oferta_id: string;
  oferta_titulo: string;
  empresa_id: string;
  postulante_id: string;
  nombre: string;
  apellido: string | null;
  localidad: string;
  nivel_educativo: string | null;
  habilidades: string[] | null;
  resumen_laboral: string | null;
  cv_id: string | null;
  cv_url: string | null;
  cv_nombre: string | null;
  estado_postulacion: ApplicationStatus;
  fecha_postulacion: string;
  fecha_derivacion: string | null;
  motivo_rechazo_empresa: string | null;
  fecha_rechazo_empresa: string | null;
};

export type SchemaMigration = {
  version: string;
  name: string;
  applied_at: string;
};

// Aliases retrocompatibles para el frontend
export type Profile = Perfil;
export type Company = Empresa;
export type Job = Oferta;
export type Application = Postulacion;
export type ApplicationHistory = HistorialPostulacion;
export type FollowUp = Seguimiento;
export type JobRubro = OfertaRubro;
export type ProfileRubro = PerfilRubro;
export type Course = Curso;
export type ApplicantCourse = PostulanteCurso;
export type CandidateView = VistaCandidatoEmpresa;

// Representación fiel del esquema de Supabase resultante de la Migración 002
export type Database = {
  public: {
    Tables: {
      rubros: {
        Row: Rubro;
        Insert: Omit<Rubro, 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Rubro>;
        Relationships: [];
      };
      perfil: {
        Row: Perfil;
        Insert: Omit<Perfil, 'created_at' | 'updated_at' | 'rubros' | 'curriculums' | 'role'> & {
          created_at?: string;
          updated_at?: string;
          es_admin_general?: boolean;
          es_superadmin?: boolean;
          activo?: boolean;
          localidad?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<Perfil, 'rubros' | 'curriculums' | 'role'>>;
        Relationships: [];
      };
      curriculums: {
        Row: Curriculum;
        Insert: Omit<Curriculum, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          es_principal?: boolean;
          activo?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Curriculum>;
        Relationships: [];
      };
      empresas: {
        Row: Empresa;
        Insert: Omit<Empresa, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          verificada?: boolean;
          estado?: EstadoEmpresa;
          motivo_rechazo?: string | null;
          revisado_por?: string | null;
          fecha_revision?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Empresa>;
        Relationships: [];
      };
      ofertas: {
        Row: Oferta;
        Insert: Omit<Oferta, 'id' | 'created_at' | 'updated_at' | 'empresa' | 'company' | 'rubro' | 'rubros' | 'company_id'> & {
          id?: string;
          destacada?: boolean;
          vacantes?: number;
          revisado_por?: string | null;
          fecha_revision?: string | null;
          motivo_rechazo?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Oferta, 'empresa' | 'company' | 'rubro' | 'rubros' | 'company_id'>>;
        Relationships: [];
      };
      ofertas_rubros: {
        Row: OfertaRubro;
        Insert: Omit<OfertaRubro, 'created_at'> & { created_at?: string };
        Update: Partial<OfertaRubro>;
        Relationships: [];
      };
      perfil_rubros: {
        Row: PerfilRubro;
        Insert: Omit<PerfilRubro, 'created_at'> & { created_at?: string };
        Update: Partial<PerfilRubro>;
        Relationships: [];
      };
      postulaciones: {
        Row: Postulacion;
        Insert: Omit<Postulacion, 'id' | 'created_at' | 'updated_at' | 'oferta' | 'job' | 'postulante' | 'cv' | 'job_id'> & {
          id?: string;
          estado?: ApplicationStatus;
          cv_id?: string | null;
          cv_url_snapshot?: string | null;
          derivado_por?: string | null;
          fecha_derivacion?: string | null;
          observaciones_derivacion?: string | null;
          motivo_rechazo_empresa?: string | null;
          fecha_rechazo_empresa?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Postulacion, 'oferta' | 'job' | 'postulante' | 'cv' | 'job_id'>>;
        Relationships: [];
      };
      historial_postulacion: {
        Row: HistorialPostulacion;
        Insert: Omit<HistorialPostulacion, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<HistorialPostulacion>;
        Relationships: [];
      };
      cursos: {
        Row: Curso;
        Insert: Omit<Curso, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Curso>;
        Relationships: [];
      };
      postulante_cursos: {
        Row: PostulanteCurso;
        Insert: Omit<PostulanteCurso, 'id' | 'created_at' | 'updated_at' | 'curso' | 'postulante'> & {
          id?: string;
          estado?: EstadoPostulanteCurso;
          fecha_asignacion?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PostulanteCurso, 'curso' | 'postulante'>>;
        Relationships: [];
      };
      seguimiento: {
        Row: Seguimiento;
        Insert: Omit<Seguimiento, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Seguimiento>;
        Relationships: [];
      };
      _schema_migrations: {
        Row: SchemaMigration;
        Insert: Omit<SchemaMigration, 'applied_at'> & { applied_at?: string };
        Update: Partial<SchemaMigration>;
        Relationships: [];
      };
    };
    Views: {
      vista_candidatos_empresa: {
        Row: VistaCandidatoEmpresa;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_superadmin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_user_empresa_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_user_company_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      obtener_candidatos_empresa: {
        Args: {
          p_oferta_id?: string;
        };
        Returns: VistaCandidatoEmpresa[];
      };
      responder_candidato_empresa: {
        Args: {
          p_postulacion_id: string;
          p_decision: string;
          p_motivo_rechazo?: string;
        };
        Returns: void;
      };
      registrar_contratacion_empresa: {
        Args: {
          p_postulacion_id: string;
        };
        Returns: void;
      };
      retirar_postulacion: {
        Args: {
          p_postulacion_id: string;
          p_motivo?: string;
        };
        Returns: void;
      };
      archivar_curriculum: {
        Args: {
          p_cv_id: string;
        };
        Returns: void;
      };
      transferir_superadmin: {
        Args: {
          p_nuevo_superadmin_id: string;
        };
        Returns: void;
      };
      desactivar_admin: {
        Args: {
          p_admin_id: string;
        };
        Returns: void;
      };
      reactivar_admin: {
        Args: {
          p_admin_id: string;
        };
        Returns: void;
      };
      quitar_rol_admin: {
        Args: {
          p_admin_id: string;
        };
        Returns: void;
      };
      promover_admin: {
        Args: {
          p_usuario_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      job_status: JobStatus;
      application_status: ApplicationStatus;
      estado_empresa: EstadoEmpresa;
      estado_postulante_curso: EstadoPostulanteCurso;
    };
    CompositeTypes: Record<string, never>;
  };
}
