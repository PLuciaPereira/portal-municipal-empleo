export type UserRole = 'postulante' | 'empresa' | 'admin';

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
  localidad: string | null;
  es_residente_funes: boolean | null;
  nivel_educativo: string | null;
  situacion_laboral_actual: string | null;
  habilidades: string[] | null;
  experiencia_resumen: string | null;
  cv_url: string | null;
  disponibilidad_horaria: string | null;
  movilidad_propia: boolean;
  es_admin_general: boolean;
  activo: boolean;
  deleted_at: string | null;
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
  estado: EstadoEmpresa;
  motivo_rechazo: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Proyección pública no sensible de una empresa aprobada/verificada.
 * Excluye explícitamente CUIT, teléfono, email, persona de contacto, dirección,
 * user_id y metadatos administrativos de auditoría.
 */
export type EmpresaPublica = Pick<
  Empresa,
  | 'id'
  | 'nombre_fantasia'
  | 'razon_social'
  | 'localidad'
  | 'rubro'
  | 'descripcion'
  | 'sitio_web'
  | 'verificada'
  | 'estado'
>;

export type Oferta = {
  id: string;
  empresa_id: string;
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
  revisado_por: string | null;
  fecha_revision: string | null;
  motivo_rechazo: string | null;
  motivo_baja: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  empresa?: EmpresaPublica | Empresa | null;
  company?: EmpresaPublica | Empresa | null;
  rubro?: Rubro | null;
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
  oferta_id: string;
  job_id?: string; // Alias de compatibilidad
  postulante_id: string;
  cv_id: string | null;
  cv_url_snapshot: string | null;
  estado: ApplicationStatus;
  mensaje_postulante: string | null;
  notas_oficina_empleo: string | null;
  derivado_por: string | null;
  fecha_derivacion: string | null;
  observaciones_derivacion: string | null;
  motivo_rechazo_empresa: string | null;
  fecha_rechazo_empresa: string | null;
  fecha_respuesta_empresa: string | null;
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

export type VistaCandidatoEmpresa = {
  postulacion_id: string;
  oferta_id: string;
  oferta_titulo: string;
  empresa_id: string;
  postulante_id: string;
  nombre: string;
  apellido: string | null;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
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
  fecha_respuesta_empresa: string | null;
};

export type SchemaMigration = {
  version: string;
  name: string;
  applied_at: string;
};

// Aliases retrocompatibles para el frontend
export type Profile = Perfil;
export type Company = Empresa;
export type PublicCompany = EmpresaPublica;
export type Job = Oferta;
export type Application = Postulacion;
export type ApplicationHistory = HistorialPostulacion;
export type JobRubro = OfertaRubro;
export type ProfileRubro = PerfilRubro;
export type Course = Curso;
export type ApplicantCourse = PostulanteCurso;
export type CandidateView = VistaCandidatoEmpresa;

// Representación fiel del esquema real de Supabase/PostgreSQL (Migraciones 000–006)
export type Database = {
  public: {
    Tables: {
      rubros: {
        Row: Rubro;
        Insert: Omit<Rubro, 'id' | 'created_at' | 'activo'> & {
          id?: number;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Rubro>;
        Relationships: [];
      };
      perfil: {
        Row: Perfil;
        Insert: Omit<
          Perfil,
          | 'created_at'
          | 'updated_at'
          | 'rubros'
          | 'curriculums'
          | 'role'
          | 'es_admin_general'
          | 'activo'
          | 'localidad'
          | 'deleted_at'
          | 'es_residente_funes'
          | 'movilidad_propia'
        > & {
          created_at?: string;
          updated_at?: string;
          es_admin_general?: boolean;
          activo?: boolean;
          localidad?: string | null;
          deleted_at?: string | null;
          es_residente_funes?: boolean | null;
          movilidad_propia?: boolean;
        };
        Update: Partial<Omit<Perfil, 'rubros' | 'curriculums' | 'role'>>;
        Relationships: [];
      };
      curriculums: {
        Row: Curriculum;
        Insert: Omit<
          Curriculum,
          'id' | 'created_at' | 'updated_at' | 'es_principal' | 'activo' | 'deleted_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          es_principal?: boolean;
          activo?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Curriculum>;
        Relationships: [
          {
            foreignKeyName: 'curriculums_postulante_id_fkey';
            columns: ['postulante_id'];
            isOneToOne: false;
            referencedRelation: 'perfil';
            referencedColumns: ['id'];
          },
        ];
      };
      empresas: {
        Row: Empresa;
        Insert: Omit<
          Empresa,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'verificada'
          | 'estado'
          | 'motivo_rechazo'
          | 'revisado_por'
          | 'fecha_revision'
        > & {
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
        Insert: Omit<
          Oferta,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'empresa'
          | 'company'
          | 'rubro'
          | 'rubros'
          | 'company_id'
          | 'destacada'
          | 'vacantes'
          | 'estado'
          | 'revisado_por'
          | 'fecha_revision'
          | 'motivo_rechazo'
          | 'motivo_baja'
          | 'deleted_at'
        > & {
          id?: string;
          estado?: JobStatus;
          destacada?: boolean;
          vacantes?: number;
          revisado_por?: string | null;
          fecha_revision?: string | null;
          motivo_rechazo?: string | null;
          motivo_baja?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Oferta, 'empresa' | 'company' | 'rubro' | 'rubros' | 'company_id'>
        >;
        Relationships: [
          {
            foreignKeyName: 'ofertas_empresa_id_fkey';
            columns: ['empresa_id'];
            isOneToOne: false;
            referencedRelation: 'empresas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_rubro_id_fkey';
            columns: ['rubro_id'];
            isOneToOne: false;
            referencedRelation: 'rubros';
            referencedColumns: ['id'];
          },
        ];
      };
      ofertas_rubros: {
        Row: OfertaRubro;
        Insert: Omit<OfertaRubro, 'created_at'> & { created_at?: string };
        Update: Partial<OfertaRubro>;
        Relationships: [
          {
            foreignKeyName: 'ofertas_rubros_oferta_id_fkey';
            columns: ['oferta_id'];
            isOneToOne: false;
            referencedRelation: 'ofertas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ofertas_rubros_rubro_id_fkey';
            columns: ['rubro_id'];
            isOneToOne: false;
            referencedRelation: 'rubros';
            referencedColumns: ['id'];
          },
        ];
      };
      perfil_rubros: {
        Row: PerfilRubro;
        Insert: Omit<PerfilRubro, 'created_at'> & { created_at?: string };
        Update: Partial<PerfilRubro>;
        Relationships: [
          {
            foreignKeyName: 'perfil_rubros_perfil_id_fkey';
            columns: ['perfil_id'];
            isOneToOne: false;
            referencedRelation: 'perfil';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'perfil_rubros_rubro_id_fkey';
            columns: ['rubro_id'];
            isOneToOne: false;
            referencedRelation: 'rubros';
            referencedColumns: ['id'];
          },
        ];
      };
      postulaciones: {
        Row: Postulacion;
        Insert: Omit<
          Postulacion,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'oferta'
          | 'job'
          | 'postulante'
          | 'cv'
          | 'job_id'
          | 'estado'
          | 'cv_id'
          | 'cv_url_snapshot'
          | 'mensaje_postulante'
          | 'notas_oficina_empleo'
          | 'derivado_por'
          | 'fecha_derivacion'
          | 'observaciones_derivacion'
          | 'motivo_rechazo_empresa'
          | 'fecha_rechazo_empresa'
          | 'fecha_respuesta_empresa'
        > & {
          id?: string;
          estado?: ApplicationStatus;
          cv_id?: string | null;
          cv_url_snapshot?: string | null;
          mensaje_postulante?: string | null;
          notas_oficina_empleo?: string | null;
          derivado_por?: string | null;
          fecha_derivacion?: string | null;
          observaciones_derivacion?: string | null;
          motivo_rechazo_empresa?: string | null;
          fecha_rechazo_empresa?: string | null;
          fecha_respuesta_empresa?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Postulacion, 'oferta' | 'job' | 'postulante' | 'cv' | 'job_id'>
        >;
        Relationships: [
          {
            foreignKeyName: 'postulaciones_oferta_id_fkey';
            columns: ['oferta_id'];
            isOneToOne: false;
            referencedRelation: 'ofertas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_postulante_id_fkey';
            columns: ['postulante_id'];
            isOneToOne: false;
            referencedRelation: 'perfil';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'postulaciones_cv_id_fkey';
            columns: ['cv_id'];
            isOneToOne: false;
            referencedRelation: 'curriculums';
            referencedColumns: ['id'];
          },
        ];
      };
      historial_postulacion: {
        Row: HistorialPostulacion;
        Insert: Omit<HistorialPostulacion, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<HistorialPostulacion>;
        Relationships: [
          {
            foreignKeyName: 'application_history_application_id_fkey';
            columns: ['postulacion_id'];
            isOneToOne: false;
            referencedRelation: 'postulaciones';
            referencedColumns: ['id'];
          },
        ];
      };
      cursos: {
        Row: Curso;
        Insert: Omit<Curso, 'id' | 'created_at' | 'updated_at' | 'activo'> & {
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
        Insert: Omit<
          PostulanteCurso,
          'id' | 'created_at' | 'updated_at' | 'curso' | 'postulante' | 'estado' | 'fecha_asignacion'
        > & {
          id?: string;
          estado?: EstadoPostulanteCurso;
          fecha_asignacion?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PostulanteCurso, 'curso' | 'postulante'>>;
        Relationships: [
          {
            foreignKeyName: 'postulante_cursos_postulante_id_fkey';
            columns: ['postulante_id'];
            isOneToOne: false;
            referencedRelation: 'perfil';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'postulante_cursos_curso_id_fkey';
            columns: ['curso_id'];
            isOneToOne: false;
            referencedRelation: 'cursos';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'postulaciones_oferta_id_fkey';
            columns: ['oferta_id'];
            isOneToOne: false;
            referencedRelation: 'ofertas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ofertas_empresa_id_fkey';
            columns: ['empresa_id'];
            isOneToOne: false;
            referencedRelation: 'empresas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'postulaciones_cv_id_fkey';
            columns: ['cv_id'];
            isOneToOne: false;
            referencedRelation: 'curriculums';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      is_admin: {
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
          p_oferta_id?: string | null;
        };
        Returns: VistaCandidatoEmpresa[];
      };
      responder_candidato_empresa: {
        Args: {
          p_postulacion_id: string;
          p_decision: 'contratado' | 'rechazado';
          p_motivo_rechazo?: string;
        };
        Returns: undefined;
      };
      registrar_contratacion_empresa: {
        Args: {
          p_postulacion_id: string;
        };
        Returns: undefined;
      };
      retirar_postulacion: {
        Args: {
          p_postulacion_id: string;
          p_motivo?: string;
        };
        Returns: undefined;
      };
      reactivar_postulacion: {
        Args: {
          p_postulacion_id: string;
          p_cv_id?: string | null;
          p_mensaje?: string | null;
        };
        Returns: undefined;
      };
      archivar_curriculum: {
        Args: {
          p_cv_id: string;
        };
        Returns: undefined;
      };
      desactivar_admin: {
        Args: {
          p_admin_id: string;
        };
        Returns: undefined;
      };
      reactivar_admin: {
        Args: {
          p_admin_id: string;
        };
        Returns: undefined;
      };
      promover_admin: {
        Args: {
          p_usuario_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      job_status: JobStatus;
      application_status: ApplicationStatus;
      estado_empresa: EstadoEmpresa;
    };
    CompositeTypes: Record<string, never>;
  };
};


