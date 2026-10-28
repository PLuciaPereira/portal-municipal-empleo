import { createClient } from '@/lib/supabase/client';

export interface MunicipalStats {
  postulantes: {
    total: number;
    residentesFunes: number;
    otrasLocalidades: number;
    porcentajeFunes: number;
  };
  ofertas: {
    total: number;
    publicadas: number;
    pendientesRevision: number;
    borradores: number;
    finalizadas: number;
    dadasDeBaja: number;
  };
  intermediacion: {
    totalPostulaciones: number;
    enRevision: number;
    preseleccionados: number;
    entrevistasRegistradas: number;
    presentadosAEmpresa: number;
    rechazadosPorEmpresa: number;
    contratados: number;
    retiradosPorPostulante: number;
  };
  capacitacion: {
    totalCursos: number;
    cursosActivos: number;
    postulantesDerivadosACursos: number;
  };
  empresas: {
    total: number;
    aprobadas: number;
    pendientes: number;
    rechazadas: number;
  };
}

export interface RubroDistributionStat {
  rubroId: number;
  nombreRubro: string;
  totalOfertas: number;
  totalContratados: number;
}

/**
 * Obtiene las estadísticas cuantitativas consolidadas para la Oficina de Empleo de Funes
 */
export async function getMunicipalStats(): Promise<MunicipalStats> {
  const supabase = createClient();

  const emptyStats: MunicipalStats = {
    postulantes: { total: 0, residentesFunes: 0, otrasLocalidades: 0, porcentajeFunes: 0 },
    ofertas: { total: 0, publicadas: 0, pendientesRevision: 0, borradores: 0, finalizadas: 0, dadasDeBaja: 0 },
    intermediacion: {
      totalPostulaciones: 0,
      enRevision: 0,
      preseleccionados: 0,
      entrevistasRegistradas: 0,
      presentadosAEmpresa: 0,
      rechazadosPorEmpresa: 0,
      contratados: 0,
      retiradosPorPostulante: 0,
    },
    capacitacion: { totalCursos: 0, cursosActivos: 0, postulantesDerivadosACursos: 0 },
    empresas: { total: 0, aprobadas: 0, pendientes: 0, rechazadas: 0 },
  };

  try {
    // 1. Postulantes
    const { data: perfiles } = await supabase
      .from('perfil')
      .select('es_residente_funes, localidad, deleted_at, activo')
      .eq('rol', 'postulante')
      .is('deleted_at', null);

    const postulantesList = perfiles || [];
    const totalPostulantes = postulantesList.length;
    const residentesFunes = postulantesList.filter(
      (p) => p.es_residente_funes || (p.localidad && p.localidad.trim().toLowerCase() === 'funes')
    ).length;
    const otrasLocalidades = totalPostulantes - residentesFunes;
    const porcentajeFunes = totalPostulantes > 0 ? Math.round((residentesFunes / totalPostulantes) * 100) : 0;

    // 2. Empresas (tabla empresas no tiene deleted_at según schema)
    const { data: empresasData } = await supabase
      .from('empresas')
      .select('estado, verificada');

    const empresasList = empresasData || [];
    const totalEmpresas = empresasList.length;
    const empresasAprobadas = empresasList.filter((e) => e.estado === 'aprobada' || e.verificada).length;
    const empresasPendientes = empresasList.filter((e) => e.estado === 'pendiente' && !e.verificada).length;
    const empresasRechazadas = empresasList.filter((e) => e.estado === 'rechazada').length;

    // 3. Ofertas (las dadas de baja tienen deleted_at no nulo)
    const { data: ofertasData } = await supabase
      .from('ofertas')
      .select('estado, deleted_at');

    const ofertasList = ofertasData || [];
    const totalOfertas = ofertasList.length;
    const publicadas = ofertasList.filter((o) => o.estado === 'publicada' && !o.deleted_at).length;
    const pendientesRevision = ofertasList.filter((o) => o.estado === 'pendiente_revision' && !o.deleted_at).length;
    const borradores = ofertasList.filter((o) => o.estado === 'borrador' && !o.deleted_at).length;
    const finalizadas = ofertasList.filter((o) => o.estado === 'finalizada').length;
    const dadasDeBaja = ofertasList.filter((o) => o.deleted_at !== null).length;

    // 4. Intermediación y Postulaciones
    const { data: postulacionesData } = await supabase
      .from('postulaciones')
      .select('estado, notas_oficina_empleo');

    const postulacionesList = postulacionesData || [];
    const totalPostulaciones = postulacionesList.length;
    const enRevision = postulacionesList.filter((p) => p.estado === 'en_revision').length;
    const preseleccionados = postulacionesList.filter((p) => p.estado === 'preseleccionado').length;
    // Entrevistas: postulaciones que tienen notas confidenciales registradas o han avanzado por esa instancia
    const entrevistasRegistradas = postulacionesList.filter(
      (p) => Boolean(p.notas_oficina_empleo && p.notas_oficina_empleo.trim().length > 0)
    ).length;
    const presentadosAEmpresa = postulacionesList.filter(
      (p) => p.estado === 'presentado_a_empresa' || p.estado === 'seleccionado' || p.estado === 'contratado' || p.estado === 'rechazado_por_empresa'
    ).length;
    const rechazadosPorEmpresa = postulacionesList.filter((p) => p.estado === 'rechazado_por_empresa').length;
    const contratados = postulacionesList.filter((p) => p.estado === 'contratado').length;
    const retiradosPorPostulante = postulacionesList.filter((p) => p.estado === 'retirado_por_postulante').length;

    // 5. Cursos y Capacitaciones
    const { data: cursosData } = await supabase
      .from('cursos')
      .select('activo');

    const cursosList = cursosData || [];
    const totalCursos = cursosList.length;
    const cursosActivos = cursosList.filter((c) => c.activo).length;

    const { count: countPostulanteCursos } = await supabase
      .from('postulante_cursos')
      .select('*', { count: 'exact', head: true });

    return {
      postulantes: {
        total: totalPostulantes,
        residentesFunes,
        otrasLocalidades,
        porcentajeFunes,
      },
      ofertas: {
        total: totalOfertas,
        publicadas,
        pendientesRevision,
        borradores,
        finalizadas,
        dadasDeBaja,
      },
      intermediacion: {
        totalPostulaciones,
        enRevision,
        preseleccionados,
        entrevistasRegistradas,
        presentadosAEmpresa,
        rechazadosPorEmpresa,
        contratados,
        retiradosPorPostulante,
      },
      capacitacion: {
        totalCursos,
        cursosActivos,
        postulantesDerivadosACursos: countPostulanteCursos || 0,
      },
      empresas: {
        total: totalEmpresas,
        aprobadas: empresasAprobadas,
        pendientes: empresasPendientes,
        rechazadas: empresasRechazadas,
      },
    };
  } catch (err) {
    console.error('Error al obtener estadísticas municipales:', err);
    return emptyStats;
  }
}

/**
 * Obtiene la distribución de ofertas e inserciones laborales agrupadas por rubro
 */
export async function getRubroDistributionStats(): Promise<RubroDistributionStat[]> {
  const supabase = createClient();

  try {
    const { data: rubrosData } = await supabase
      .from('rubros')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre');

    if (!rubrosData || rubrosData.length === 0) return [];

    // Obtener ofertas con su rubro_id
    const { data: ofertasData } = await supabase
      .from('ofertas')
      .select('id, rubro_id');

    // Obtener contrataciones vinculadas a cada oferta
    const { data: contratacionesData } = await supabase
      .from('postulaciones')
      .select('oferta_id')
      .eq('estado', 'contratado');

    const ofertaIdToRubroId = new Map<string, number>();
    (ofertasData || []).forEach((o) => {
      if (typeof o.rubro_id === 'number') {
        ofertaIdToRubroId.set(o.id, o.rubro_id);
      }
    });

    const contratacionesPorRubro = new Map<number, number>();
    (contratacionesData || []).forEach((c) => {
      const rubroId = ofertaIdToRubroId.get(c.oferta_id);
      if (typeof rubroId === 'number') {
        contratacionesPorRubro.set(rubroId, (contratacionesPorRubro.get(rubroId) || 0) + 1);
      }
    });

    const ofertasPorRubro = new Map<number, number>();
    (ofertasData || []).forEach((o) => {
      if (typeof o.rubro_id === 'number') {
        ofertasPorRubro.set(o.rubro_id, (ofertasPorRubro.get(o.rubro_id) || 0) + 1);
      }
    });

    return rubrosData.map((r) => ({
      rubroId: r.id,
      nombreRubro: r.nombre,
      totalOfertas: ofertasPorRubro.get(r.id) || 0,
      totalContratados: contratacionesPorRubro.get(r.id) || 0,
    }));
  } catch (err) {
    console.error('Error al obtener distribución por rubros:', err);
    return [];
  }
}
