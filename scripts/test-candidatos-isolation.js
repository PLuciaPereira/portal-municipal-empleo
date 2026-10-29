// scripts/test-candidatos-isolation.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno locales
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[match[1]] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('ERROR: Faltan variables obligatorias en .env.local');
  process.exit(1);
}

// 2. PROTECCIÓN CONTRA EJECUCIÓN ACCIDENTAL EN PRODUCCIÓN
// Se requiere explícitamente ALLOW_TEST_EXECUTION=true o presencia del host de staging/local
const isProductionHost = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
const allowExecution = process.env.ALLOW_TEST_EXECUTION === 'true' || process.env.NODE_ENV !== 'production';

if (isProductionHost && !process.env.ALLOW_TEST_EXECUTION) {
  console.error('\n[BLOQUEO DE SEGURIDAD] Ejecución abortada: el entorno aparenta ser producción.');
  console.error('Para ejecutar pruebas de integración, configure explícitamente ALLOW_TEST_EXECUTION=true.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);

async function setupTestData() {
  console.log('--- Verificando / Preparando datos de prueba controlados ---');
  const emailB = 'empresa_b@funes.com';
  const password = 'Funes2026!';

  // Asegurar que exista Empresa B (Logística Funes SA)
  const { data: users } = await adminClient.auth.admin.listUsers();
  let userB = users.users.find((u) => u.email === emailB);

  if (!userB) {
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: 'Empresa B Test',
        rol: 'empresa',
        razon_social: 'Logística Funes SA',
      },
    });
    if (error) throw error;
    userB = created.user;
  }

  await adminClient.from('perfil').upsert({
    id: userB.id,
    nombre: 'Logística Funes',
    apellido: 'SA',
    rol: 'empresa',
    activo: true,
    localidad: 'Funes',
    es_residente_funes: true,
  });

  const { data: empB, error: empBErr } = await adminClient
    .from('empresas')
    .upsert(
      {
        user_id: userB.id,
        razon_social: 'Logística Funes SA',
        nombre_fantasia: 'Logística Funes',
        cuit: '30-79998881-2',
        direccion: 'Calle 1 nro 500',
        localidad: 'Funes',
        telefono: '3415550000',
        email_contacto: emailB,
        persona_contacto: 'Roberto Gómez',
        rubro: 'Logística',
        verificada: true,
        estado: 'aprobada',
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single();

  if (empBErr) throw empBErr;

  // Obtener oferta de Empresa B
  const { data: ofertasB } = await adminClient
    .from('ofertas')
    .select('id')
    .eq('empresa_id', empB.id);

  let ofertaBId = ofertasB && ofertasB.length > 0 ? ofertasB[0].id : null;
  if (!ofertaBId) {
    const { data: ofB } = await adminClient
      .from('ofertas')
      .insert({
        empresa_id: empB.id,
        titulo: 'Chofer de Reparto Local Funes',
        descripcion: 'Búsqueda de chofer.',
        requisitos: 'Licencia B1.',
        tipo_jornada: 'Jornada completa',
        ubicacion: 'Funes, Santa Fe',
        vacantes: 1,
        estado: 'publicada',
      })
      .select('id')
      .single();
    ofertaBId = ofB.id;
  }

  // Asegurar que Empresa A tenga al menos una oferta para pruebas cruzadas
  const { data: empA } = await adminClient
    .from('empresas')
    .select('id')
    .eq('email_contacto', 'empresa@funes.com')
    .maybeSingle();

  let ofertaAId = null;
  if (empA) {
    const { data: ofA } = await adminClient
      .from('ofertas')
      .select('id')
      .eq('empresa_id', empA.id)
      .limit(1);

    if (ofA && ofA.length > 0) {
      ofertaAId = ofA[0].id;
    } else {
      const { data: newOfA } = await adminClient
        .from('ofertas')
        .insert({
          empresa_id: empA.id,
          titulo: 'Vendedor Salón Comercio Funes',
          descripcion: 'Atención al cliente en salón.',
          requisitos: 'Secundario completo.',
          tipo_jornada: 'Part time',
          ubicacion: 'Funes, Santa Fe',
          vacantes: 1,
          estado: 'publicada',
        })
        .select('id')
        .single();
      if (newOfA) ofertaAId = newOfA.id;
    }
  }

  // Asegurar que exista una empresa con estado NO aprobada (rechazada o pendiente)
  // Existe 'Repuestos Marito SRL' con estado 'rechazada' en la base
  const { data: empRechazada } = await adminClient
    .from('empresas')
    .select('id, user_id, razon_social, estado')
    .eq('estado', 'rechazada')
    .limit(1)
    .maybeSingle();

  return {
    emailB,
    password,
    empAId: empA?.id,
    ofertaAId,
    empBId: empB.id,
    ofertaBId,
    empRechazada,
  };
}

async function testRole(email, password, roleLabel) {
  console.log(`\n------------------------------------------------------`);
  console.log(`[TEST] Autenticando: ${roleLabel} (${email})`);
  console.log(`------------------------------------------------------`);

  const client = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error(` Error de autenticación para ${email}:`, authError.message);
    return { ok: false, authError: authError.message, rpcItems: [], viewItems: [] };
  }

  const userId = authData.user.id;

  // 1. Consulta RPC general (sin p_oferta_id)
  const { data: rpcAll, error: rpcErr } = await client.rpc('obtener_candidatos_empresa');

  // 2. Consulta directa a la vista
  const { data: viewAll, error: viewErr } = await client
    .from('vista_candidatos_empresa')
    .select('*');

  await client.auth.signOut();

  return {
    ok: true,
    userId,
    rpcItems: rpcAll || [],
    rpcError: rpcErr ? rpcErr.message : null,
    viewItems: viewAll || [],
    viewError: viewErr ? viewErr.message : null,
  };
}

async function testCrossOfertaAccess(email, password, foreignOfertaId) {
  const client = createClient(supabaseUrl, anonKey);
  await client.auth.signInWithPassword({ email, password });
  const { data, error } = await client.rpc('obtener_candidatos_empresa', {
    p_oferta_id: foreignOfertaId,
  });
  await client.auth.signOut();
  return { items: data || [], error: error ? error.message : null };
}

async function runTestSuite() {
  console.log('======================================================');
  console.log('SUITE DE VERIFICACIÓN DE AISLAMIENTO Y SEGURIDAD');
  console.log('======================================================');

  const setup = await setupTestData();
  let failures = [];

  // =========================================================================
  // CASO 1: Empresa A (Aprobada, sin candidatos propios derivados)
  // =========================================================================
  const tEmpA = await testRole('empresa@funes.com', 'Funes2026!', 'Empresa A (Empresa Funes SRL)');
  if (!tEmpA.ok) {
    failures.push(`Empresa A no pudo autenticarse: ${tEmpA.authError}`);
  } else {
    // Verificar que NINGÚN candidato pertenezca a otra empresa
    const ajenosEnRpc = tEmpA.rpcItems.filter((c) => c.empresa_id !== setup.empAId);
    if (ajenosEnRpc.length > 0) {
      failures.push(
        `[SEGURIDAD] Empresa A recibió ${ajenosEnRpc.length} candidatos de otras empresas en la RPC.`
      );
    }
    const ajenosEnVista = tEmpA.viewItems.filter((c) => c.empresa_id !== setup.empAId);
    if (ajenosEnVista.length > 0) {
      failures.push(
        `[SEGURIDAD] Empresa A recibió ${ajenosEnVista.length} candidatos de otras empresas en la vista.`
      );
    }
  }

  // =========================================================================
  // CASO 2: Empresa B (Aprobada, con candidato propio derivado a su oferta)
  // =========================================================================
  const tEmpB = await testRole(setup.emailB, setup.password, 'Empresa B (Logística Funes SA)');
  if (!tEmpB.ok) {
    failures.push(`Empresa B no pudo autenticarse: ${tEmpB.authError}`);
  } else {
    // Debe recibir exactamente candidatos que coincidan con su propio empresa_id
    const ajenosEnRpc = tEmpB.rpcItems.filter((c) => c.empresa_id !== setup.empBId);
    if (ajenosEnRpc.length > 0) {
      failures.push(
        `[SEGURIDAD] Empresa B recibió ${ajenosEnRpc.length} candidatos ajenos en la RPC.`
      );
    }
    const propios = tEmpB.rpcItems.filter((c) => c.empresa_id === setup.empBId);
    console.log(`-> Empresa B: ${propios.length} candidato(s) propios legítimos.`);
  }

  // =========================================================================
  // CASO 3: Intento de consulta de oferta ajena (Empresa A consultando oferta de Empresa B)
  // =========================================================================
  console.log(`\n[TEST] Intento de consulta de oferta ajena por Empresa A...`);
  const crossTest = await testCrossOfertaAccess(
    'empresa@funes.com',
    'Funes2026!',
    setup.ofertaBId
  );
  if (crossTest.items.length > 0) {
    failures.push(
      `[SEGURIDAD] Empresa A pudo obtener ${crossTest.items.length} candidato(s) consultando una oferta ajena.`
    );
  } else {
    console.log(`-> Bloqueo exitoso: 0 candidatos devueltos al consultar oferta ajena.`);
  }

  // =========================================================================
  // CASO 4: Postulante / Vecino sin permisos empresariales
  // =========================================================================
  const tPostulante = await testRole(
    'postulante@funes.com',
    'Funes2026!',
    'Postulante sin rol empresa'
  );
  if (tPostulante.rpcItems.length > 0) {
    failures.push(
      `[SEGURIDAD] Un postulante pudo consultar ${tPostulante.rpcItems.length} candidatos en la RPC.`
    );
  }
  if (tPostulante.viewItems.length > 0) {
    failures.push(
      `[SEGURIDAD] Un postulante pudo consultar ${tPostulante.viewItems.length} candidatos en la vista.`
    );
  }

  // =========================================================================
  // CASO 5: Administrador Municipal (Debe conservar visibilidad global)
  // =========================================================================
  const tAdmin = await testRole(
    'administracion@funes.com',
    'Funes2026!',
    'Administrador Oficina de Empleo'
  );
  if (tAdmin.rpcItems.length === 0) {
    failures.push(
      `[FUNCIONAL] El Administrador no recibió derivaciones globales en la RPC.`
    );
  } else {
    console.log(
      `-> Administrador municipal: visibilidad global confirmada (${tAdmin.rpcItems.length} derivaciones en el sistema).`
    );
  }

  // =========================================================================
  // RESUMEN Y CÓDIGO DE RETORNO
  // =========================================================================
  console.log('\n======================================================');
  console.log('RESULTADO FINAL DEL ANÁLISIS DE AISLAMIENTO:');
  console.log('======================================================');

  if (failures.length > 0) {
    console.error('SE DETECTARON LAS SIGUIENTES FALLAS DE AISLAMIENTO / SEGURIDAD:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    console.error('\n--> La base de datos actual presenta discrepancias de aislamiento.');
    console.error('--> Requiere aplicar la migración 014 en Supabase para subsanar los fallos en BD.\n');
    process.exit(1);
  } else {
    console.log('TODAS LAS PRUEBAS DE AISLAMIENTO PASARON EXITOSAMENTE (CÓDIGO 0).');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Error fatal durante la suite de pruebas:', err);
  process.exit(1);
});
