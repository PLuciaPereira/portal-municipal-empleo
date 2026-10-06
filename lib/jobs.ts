import { Job, Company, Rubro } from '@/types/database';

export const MOCK_RUBROS: Rubro[] = [
  {
    id: 1,
    nombre: 'Comercio y Atención al Cliente',
    descripcion: 'Ventas, atención al público, cajeros, repositores y afines',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 2,
    nombre: 'Gastronomía y Hotelería',
    descripcion: 'Cocineros, ayudantes de cocina, mozos, bacheros, recepción',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 3,
    nombre: 'Construcción y Mantenimiento',
    descripcion: 'Albañilería, electricidad, plomería, pintura, mantenimiento en general',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 4,
    nombre: 'Administración y Contabilidad',
    descripcion: 'Secretaría, facturación, recursos humanos, administración general',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 5,
    nombre: 'Logística y Distribución',
    descripcion: 'Choferes, repartidores, operarios de depósito, expedición',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 6,
    nombre: 'Salud y Cuidados',
    descripcion: 'Enfermería, cuidadores de adultos mayores, niñeras, asistentes terapéuticos',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 7,
    nombre: 'Tecnología e Informática',
    descripcion: 'Soporte técnico, desarrollo web, redes, marketing digital',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 8,
    nombre: 'Jardinería y Parquizaciones',
    descripcion: 'Mantenimiento de espacios verdes, pileteros, paisajismo',
    activo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
];

export const MOCK_COMPANIES: Record<string, Company> = {
  'comp-1': {
    id: 'comp-1',
    user_id: 'user-c1',
    razon_social: 'Comercial Funes S.R.L.',
    nombre_fantasia: 'Funes Mall Retail',
    cuit: '30-71458921-8',
    direccion: 'Santa Fe 1600',
    localidad: 'Funes',
    telefono: '341-493-1000',
    email_contacto: 'rrhh@funesmall.com.ar',
    persona_contacto: 'Martín Rodríguez',
    rubro: 'Comercio',
    descripcion: 'Cadena de indumentaria y calzado deportivo con local en el centro comercial de Funes.',
    sitio_web: 'https://funesmall.ejemplo.com',
    verificada: true,
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  'comp-2': {
    id: 'comp-2',
    user_id: 'user-c2',
    razon_social: 'Sabores de la Ruta S.A.',
    nombre_fantasia: 'Resto & Bar Garita 14',
    cuit: '30-71689234-5',
    direccion: 'Ruta 9 y Garita 14',
    localidad: 'Funes',
    telefono: '341-493-2211',
    email_contacto: 'empleo@saboresfunes.com.ar',
    persona_contacto: 'Valeria Rossi',
    rubro: 'Gastronomía',
    descripcion: 'Restaurante tradicional y cafetería con amplia concurrencia familiar en la ciudad de Funes.',
    sitio_web: null,
    verificada: true,
    created_at: '2026-08-20T11:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  'comp-3': {
    id: 'comp-3',
    user_id: 'user-c3',
    razon_social: 'Soluciones Civiles del Litoral',
    nombre_fantasia: 'Constructora & Servicios Funes',
    cuit: '33-71239841-9',
    direccion: 'Av. Arturo Illia 800',
    localidad: 'Funes',
    telefono: '341-493-3344',
    email_contacto: 'obras@constructorafunes.com.ar',
    persona_contacto: 'Ing. Carlos Menéndez',
    rubro: 'Construcción',
    descripcion: 'Empresa constructora especializada en viviendas unifamiliares y mantenimiento en barrios cerrados de Funes.',
    sitio_web: 'https://constructorafunes.ejemplo.com',
    verificada: true,
    created_at: '2026-08-25T14:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  'comp-4': {
    id: 'comp-4',
    user_id: 'user-c4',
    razon_social: 'Logística Parque Industrial S.A.',
    nombre_fantasia: 'Distribuidora Ciudad Industria',
    cuit: '30-70984123-2',
    direccion: 'Parque Industrial de Funes, Lote 42',
    localidad: 'Funes',
    telefono: '341-493-5566',
    email_contacto: 'seleccion@logisticafunes.com.ar',
    persona_contacto: 'Mariana Gómez',
    rubro: 'Logística',
    descripcion: 'Centro de acopio y distribución para toda la región del Gran Rosario con base operativa en el Parque Industrial.',
    sitio_web: 'https://distribuidorafunes.ejemplo.com',
    verificada: true,
    created_at: '2026-09-01T08:30:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  'comp-5': {
    id: 'comp-5',
    user_id: 'user-c5',
    razon_social: 'Servicios de Parques y Paisajismo',
    nombre_fantasia: 'Verde Funes',
    cuit: '27-28941029-4',
    direccion: 'Pedro A. Ríos 2100',
    localidad: 'Funes',
    telefono: '341-493-7788',
    email_contacto: 'contacto@verdefunes.com.ar',
    persona_contacto: 'Esteban Domínguez',
    rubro: 'Jardinería',
    descripcion: 'Mantenimiento integral de predios, parques, arbolado y piletas residenciales en Funes.',
    sitio_web: null,
    verificada: true,
    created_at: '2026-09-05T09:00:00Z',
    updated_at: '2026-09-05T09:00:00Z',
  },
  'comp-6': {
    id: 'comp-6',
    user_id: 'user-c6',
    razon_social: 'Salud Integral Domiciliaria',
    nombre_fantasia: 'Cuidados Funes',
    cuit: '30-71890212-3',
    direccion: 'Tomás de la Torre 1200',
    localidad: 'Funes',
    telefono: '341-493-8899',
    email_contacto: 'coordinacion@cuidadosfunes.com.ar',
    persona_contacto: 'Dra. Gabriela Vega',
    rubro: 'Salud',
    descripcion: 'Servicio de cuidados asistenciales y acompañamiento gerontológico en Funes y zona oeste.',
    sitio_web: null,
    verificada: true,
    created_at: '2026-09-10T11:00:00Z',
    updated_at: '2026-09-10T11:00:00Z',
  },
  'comp-7': {
    id: 'comp-7',
    user_id: 'user-c7',
    razon_social: 'Conectividad & Redes Funes S.R.L.',
    nombre_fantasia: 'TechFunes Soluciones',
    cuit: '30-71562940-1',
    direccion: 'Ruta 9 y San José',
    localidad: 'Funes',
    telefono: '341-493-9900',
    email_contacto: 'rrhh@techfunes.com.ar',
    persona_contacto: 'Santiago Peralta',
    rubro: 'Tecnología',
    descripcion: 'Provisión de servicios de fibra óptica, redes corporativas y servicio técnico informático en Funes y Roldán.',
    sitio_web: 'https://techfunes.ejemplo.com',
    verificada: true,
    created_at: '2026-09-12T15:00:00Z',
    updated_at: '2026-09-12T15:00:00Z',
  },
};

export const MOCK_JOBS: Job[] = [
  {
    id: 'vendedor-salon-funes-mall',
    company_id: 'comp-1',
    rubro_id: 1,
    titulo: 'Vendedor/a de Salón y Atención al Cliente',
    descripcion:
      'Importante comercio de indumentaria y calzado ubicado en Funes Mall incorpora vendedor/a de salón. La posición requiere una actitud proactiva, vocación de servicio al cliente, manejo de caja/cobros con medios electrónicos y mantenimiento del orden del salón comercial.',
    requisitos:
      '- Secundario completo (excluyente)\n- Experiencia mínima de 1 año en ventas o atención al público en locales comerciales\n- Buen manejo de sistemas de cobranza (tarjetas, billeteras virtuales, posnet)\n- Residencia en la ciudad de Funes o cercanías inmediatas con fácil traslado',
    experiencia_requerida: '1 año en puestos de ventas o salón',
    tipo_jornada: 'Jornada Completa',
    tipo_contrato: 'Tiempo Indeterminado',
    ubicacion: 'Funes Mall (Centro), Funes',
    rango_salarial: 'Según convenio de empleados de comercio',
    vacantes: 2,
    estado: 'publicada',
    destacada: true,
    fecha_limite: '2026-10-31',
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
    company: MOCK_COMPANIES['comp-1'],
    rubro: MOCK_RUBROS[0],
  },
  {
    id: 'cocinero-resto-garita-14',
    company_id: 'comp-2',
    rubro_id: 2,
    titulo: 'Cocinero/a con experiencia en Minutas y Despacho',
    descripcion:
      'Restó familiar sobre Ruta 9 busca cocinero/a para sumarse al equipo de cocina. Se ocupará de la elaboración de minutas, pastas caseras, carnes a la plancha, control de stock diario y cumplimiento de las normas de higiene y manipulación de alimentos.',
    requisitos:
      '- Experiencia comprobable en cocinas gastronómicas o restaurantes\n- Curso de Manipulación Segura de Alimentos (o disponibilidad para realizarlo)\n- Libreta sanitaria vigente\n- Disponibilidad horaria para turnos de noche y fines de semana\n- Residencia preferente en Funes',
    experiencia_requerida: '2 años en gastronomía comercial',
    tipo_jornada: 'Turnos Rotativos (Tarde/Noche)',
    tipo_contrato: 'Permanente',
    ubicacion: 'Ruta 9 (Zona Garita 14), Funes',
    rango_salarial: 'Convenio Gastronómicos UTHGRA',
    vacantes: 1,
    estado: 'publicada',
    destacada: true,
    fecha_limite: '2026-10-25',
    created_at: '2026-09-22T14:30:00Z',
    updated_at: '2026-09-22T14:30:00Z',
    company: MOCK_COMPANIES['comp-2'],
    rubro: MOCK_RUBROS[1],
  },
  {
    id: 'electricista-mantenimiento-barrios',
    company_id: 'comp-3',
    rubro_id: 3,
    titulo: 'Oficial Electricista y Mantenimiento de Urbanizaciones',
    descripcion:
      'Constructora local busca personal para el mantenimiento eléctrico e instalaciones generales en obras residenciales y urbanizaciones privadas de Funes. Tareas de tendido eléctrico, tableros seccionales, iluminación perimetral y reparaciones.',
    requisitos:
      '- Título técnico o curso de instalador electricista habilitado\n- Experiencia en obras residenciales y mantenimiento edilicio\n- Movilidad propia (moto o automóvil) excluyente para desplazarse entre predios\n- Herramientas de mano propias (deseable)',
    experiencia_requerida: '2 a 3 años en obras o servicio técnico',
    tipo_jornada: 'Jornada Completa (Lunes a Viernes 8 a 17 hs)',
    tipo_contrato: 'Tiempo Indeterminado',
    ubicacion: 'Barrios Don Mateo y Cantegril, Funes',
    rango_salarial: 'A convenir según experiencia técnica',
    vacantes: 2,
    estado: 'publicada',
    destacada: false,
    fecha_limite: '2026-11-05',
    created_at: '2026-09-23T09:15:00Z',
    updated_at: '2026-09-23T09:15:00Z',
    company: MOCK_COMPANIES['comp-3'],
    rubro: MOCK_RUBROS[2],
  },
  {
    id: 'auxiliar-administrativo-parque-industrial',
    company_id: 'comp-4',
    rubro_id: 4,
    titulo: 'Auxiliar Administrativo/a y Facturación',
    descripcion:
      'Distribuidora con base en el Parque Industrial de Funes requiere auxiliar administrativo/a. Sus principales funciones serán: facturación electrónica, control de remitos de entrega, conciliaciones bancarias básicas, atención telefónica a clientes y carga de comprobantes en sistema de gestión.',
    requisitos:
      '- Secundario completo; se valorarán estudios terciarios o universitarios afines (Adm. de Empresas, Contador, etc.)\n- Dominio de Excel (intermedio)\n- Manejo de sistemas de facturación y gestión comercial\n- Capacidad de trabajo en equipo y atención al detalle\n- Residir en Funes o zona de fácil acceso a la Autopista Rosario-Córdoba',
    experiencia_requerida: '1 a 2 años en administración general',
    tipo_jornada: 'Media Jornada (Lunes a Viernes 8 a 13 hs)',
    tipo_contrato: 'Tiempo Indeterminado',
    ubicacion: 'Parque Industrial de Funes (Autopista)',
    rango_salarial: 'Acorde a escala salarial de empleados de comercio',
    vacantes: 1,
    estado: 'publicada',
    destacada: true,
    fecha_limite: '2026-11-10',
    created_at: '2026-09-24T11:00:00Z',
    updated_at: '2026-09-24T11:00:00Z',
    company: MOCK_COMPANIES['comp-4'],
    rubro: MOCK_RUBROS[3],
  },
  {
    id: 'jardinero-espacios-verdes-quintas',
    company_id: 'comp-5',
    rubro_id: 8,
    titulo: 'Jardinero y Operario de Mantenimiento de Parques',
    descripcion:
      'Empresa de servicios paisajísticos incorpora operarios para mantenimiento de parques, jardines y predios recreativos en Funes. Tareas: corte de césped con motoguadaña y tractor cortador, poda de cercos verdes, fertilización y limpieza de piletas.',
    requisitos:
      '- Experiencia previa en manejo de maquinaria de jardinería (cortadoras a nafta, motoguadañas, sopladoras)\n- Buena predisposición para tareas al aire libre y esfuerzo físico\n- Responsabilidad, puntualidad y buen trato vecinal\n- Residencia en Funes',
    experiencia_requerida: '1 año en jardinería o mantenimiento de predios',
    tipo_jornada: 'Jornada Completa',
    tipo_contrato: 'Temporada con posibilidad de efectivización',
    ubicacion: 'Zona Quintas y Barrios Cerrados (Funes Hills / Kentucky), Funes',
    rango_salarial: 'Convenio Agrario / Servicios',
    vacantes: 3,
    estado: 'publicada',
    destacada: false,
    fecha_limite: '2026-11-15',
    created_at: '2026-09-25T16:00:00Z',
    updated_at: '2026-09-25T16:00:00Z',
    company: MOCK_COMPANIES['comp-5'],
    rubro: MOCK_RUBROS[7],
  },
  {
    id: 'chofer-repartidor-funes-roldan',
    company_id: 'comp-4',
    rubro_id: 5,
    titulo: 'Chofer Repartidor Local (Vehículo Utilitario)',
    descripcion:
      'Se busca chofer de reparto para distribución de mercadería en comercios y domicilios de Funes y Roldán. Conducción de furgón utilitario de la empresa, control de remitos y cobranzas contra entrega.',
    requisitos:
      '- Licencia de conducir nacional vigente clase B1 o superior (excluyente)\n- Experiencia en manejo de utilitarios urbanos\n- Buen conocimiento de calles y barrios de Funes y Roldán\n- Certificado de antecedentes penales actualizado',
    experiencia_requerida: '2 años de manejo comprobable',
    tipo_jornada: 'Jornada Completa (Lunes a Viernes)',
    tipo_contrato: 'Tiempo Indeterminado',
    ubicacion: 'Garita 9 / Autopista Rosario-Córdoba, Funes',
    rango_salarial: 'Convenio de Choferes de Carga',
    vacantes: 1,
    estado: 'publicada',
    destacada: false,
    fecha_limite: '2026-10-30',
    created_at: '2026-09-26T08:30:00Z',
    updated_at: '2026-09-26T08:30:00Z',
    company: MOCK_COMPANIES['comp-4'],
    rubro: MOCK_RUBROS[4],
  },
  {
    id: 'cuidadora-adultos-mayores-centro',
    company_id: 'comp-6',
    rubro_id: 6,
    titulo: 'Acompañante Terapéutico / Cuidador/a de Adultos Mayores',
    descripcion:
      'Se solicita acompañante para asistencia de adulto mayor en domicilio particular en Funes Centro. Tareas de acompañamiento diario, asistencia en la movilidad, control y recordatorio de medicación oral prescrita, paseos y preparación de colaciones simples.',
    requisitos:
      '- Curso oficial de Cuidador Domiciliario o Acompañante Terapéutico (excluyente)\n- Referencias laborales comprobables en cuidados anteriores\n- Perfil empático, paciente y con marcada vocación asistencial\n- Disponibilidad horaria de lunes a viernes en turno diurno',
    experiencia_requerida: '1 a 2 años de experiencia comprobable',
    tipo_jornada: 'Media Jornada (Mañana o Tarde)',
    tipo_contrato: 'Eventual / Continuo',
    ubicacion: 'Zona Centro, Funes',
    rango_salarial: 'Según escala de cuidadores domiciliarios',
    vacantes: 2,
    estado: 'publicada',
    destacada: false,
    fecha_limite: '2026-11-20',
    created_at: '2026-09-27T10:45:00Z',
    updated_at: '2026-09-27T10:45:00Z',
    company: MOCK_COMPANIES['comp-6'],
    rubro: MOCK_RUBROS[5],
  },
  {
    id: 'tecnico-soporte-redes-pc',
    company_id: 'comp-7',
    rubro_id: 7,
    titulo: 'Técnico en Soporte Informático y Conectividad',
    descripcion:
      'Empresa prestadora de servicios de conectividad y tecnología en Funes busca técnico para soporte a usuarios particulares y empresas. Realizará diagnóstico y reparación de computadoras, configuración de routers Wi-Fi, cableado estructurado básico y soporte remoto.',
    requisitos:
      '- Formación técnica en informática, redes o carreras afines\n- Conocimientos en configuración de redes TCP/IP, switches y puntos de acceso\n- Capacidad para resolver incidencias de hardware y software en sistemas Windows\n- Buena presencia y trato cordial con los clientes locales\n- Licencia de conducir (deseable)',
    experiencia_requerida: '1 año en tareas técnicas similares',
    tipo_jornada: 'Jornada Completa',
    tipo_contrato: 'Tiempo Indeterminado',
    ubicacion: 'Ruta 9 y Pedro A. Ríos, Funes',
    rango_salarial: 'A convenir según capacidades técnicas',
    vacantes: 1,
    estado: 'publicada',
    destacada: true,
    fecha_limite: '2026-11-15',
    created_at: '2026-09-28T12:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
    company: MOCK_COMPANIES['comp-7'],
    rubro: MOCK_RUBROS[6],
  },
];

export interface JobFilterParams {
  query?: string;
  rubro?: string;
  jornada?: string;
  zona?: string;
  destacadasOnly?: boolean;
}

export async function getJobs(filters?: JobFilterParams): Promise<{ jobs: Job[]; total: number }> {
  // Simulamos llamada asíncrona preparada para conectarse con Supabase
  let filtered = [...MOCK_JOBS].filter((job) => job.estado === 'publicada');

  if (filters) {
    const { query, rubro, jornada, zona, destacadasOnly } = filters;

    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(
        (job) =>
          job.titulo.toLowerCase().includes(q) ||
          job.descripcion.toLowerCase().includes(q) ||
          job.requisitos.toLowerCase().includes(q) ||
          (job.company && job.company.nombre_fantasia.toLowerCase().includes(q)) ||
          (job.rubro && job.rubro.nombre.toLowerCase().includes(q))
      );
    }

    if (rubro && rubro !== 'todos') {
      filtered = filtered.filter((job) => {
        if (!job.rubro) return false;
        // Permite filtrar por ID o por nombre del rubro
        return (
          job.rubro.id.toString() === rubro ||
          job.rubro.nombre.toLowerCase() === rubro.toLowerCase() ||
          job.rubro.nombre.toLowerCase().includes(rubro.toLowerCase())
        );
      });
    }

    if (jornada && jornada !== 'todas') {
      filtered = filtered.filter((job) =>
        job.tipo_jornada.toLowerCase().includes(jornada.toLowerCase())
      );
    }

    if (zona && zona !== 'todas') {
      filtered = filtered.filter((job) =>
        job.ubicacion.toLowerCase().includes(zona.toLowerCase())
      );
    }

    if (destacadasOnly) {
      filtered = filtered.filter((job) => job.destacada);
    }
  }

  // Ordenar: primero destacadas, luego más recientes
  filtered.sort((a, b) => {
    if (a.destacada && !b.destacada) return -1;
    if (!a.destacada && b.destacada) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    jobs: filtered,
    total: filtered.length,
  };
}

export async function getJobById(id: string): Promise<Job | null> {
  const found = MOCK_JOBS.find((j) => j.id === id);
  return found || null;
}

export async function getAllJobIds(): Promise<string[]> {
  return MOCK_JOBS.map((j) => j.id);
}

export async function getRubros(): Promise<Rubro[]> {
  return MOCK_RUBROS.filter((r) => r.activo);
}

export async function getSimilarJobs(
  currentJobId: string,
  rubroId?: number | null,
  limit: number = 3
): Promise<Job[]> {
  const others = MOCK_JOBS.filter(
    (j) => j.id !== currentJobId && j.estado === 'publicada'
  );

  if (rubroId) {
    const sameRubro = others.filter((j) => j.rubro_id === rubroId);
    if (sameRubro.length >= limit) {
      return sameRubro.slice(0, limit);
    }
    // Si hay menos del límite, rellenar con otras ofertas recientes
    const remaining = others.filter((j) => j.rubro_id !== rubroId);
    return [...sameRubro, ...remaining].slice(0, limit);
  }

  return others.slice(0, limit);
}

export interface ApplicationInput {
  jobId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni: string;
  esResidenteFunes: boolean;
  barrio?: string;
  mensaje?: string;
  situacionLaboral?: string;
}

export async function submitJobApplication(
  _data: ApplicationInput
): Promise<{ success: boolean; message: string; applicationId: string }> {
  void _data;
  // Simulamos persistencia y retorno de número de gestión
  // Cuando Supabase esté configurado, insertará en 'applications' e 'application_history'
  const applicationId = `FUNES-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    success: true,
    message:
      'Tu postulación ha sido recibida con éxito por la Oficina de Empleo de Funes. Un orientador evaluará tu perfil y te contactará.',
    applicationId,
  };
}
