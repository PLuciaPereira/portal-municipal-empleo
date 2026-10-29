// scripts/test-isolation-readonly.js
// ==============================================================================
// VERIFICACIÓN DE AISLAMIENTO DE CANDIDATOS (MODO ESTRICTO CONSULTA)
// ==============================================================================
// NOTA DE TRANSPARENCIA SOBRE OPERACIONES:
// 1. Este script NO ejecuta ninguna sentencia DML de aplicación (cero INSERT, UPDATE,
//    UPSERT o DELETE sobre tablas como ofertas, empresas, postulaciones o perfiles).
// 2. EFECTO SECUNDARIO DE AUTENTICACIÓN:
//    Al autenticar cada cuenta mediante client.auth.signInWithPassword(), el servicio
//    interno de GoTrue (Supabase Auth) actualiza automáticamente la columna del sistema
//    `auth.users.last_sign_in_at` para la cuenta que inicia sesión.
// 3. Este script utiliza EXCLUSIVAMENTE la clave anónima (NEXT_PUBLIC_SUPABASE_ANON_KEY)
//    y sesiones de usuario individuales; NUNCA utiliza el service_role para consultar
//    como usuario común.
// 4. Si una comprobación no puede completarse por falta de datos existentes (por ejemplo,
//    ausencia de empresas rechazadas u ofertas de terceras empresas), se reporta como
//    "COMPROBACIÓN PENDIENTE" y no se asume un resultado falso.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno locales desde .env.local
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
// Variable independiente requerida para validar el entorno antes de cualquier conexión
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;

if (!supabaseUrl || !anonKey) {
  console.error('[ERROR FATAL] Faltan variables obligatorias (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY) en el entorno.');
  process.exit(1);
}

// 2. PROTECCIÓN ESTRICTA DE ENTORNO:
// Exige que SUPABASE_EXPECTED_PROJECT_REF esté configurada independientemente y coincida
// exactamente con el subdominio de NEXT_PUBLIC_SUPABASE_URL. Si no está o difiere, aborta de inmediato.
if (!expectedProjectRef || expectedProjectRef.trim().length === 0) {
  console.error('\n[BLOQUEO DE SEGURIDAD] Falta definir SUPABASE_EXPECTED_PROJECT_REF en el entorno.');
  console.error('Para ejecutar este script de forma segura, defina SUPABASE_EXPECTED_PROJECT_REF coincidente con su proyecto objetivo.');
  console.error('Ejemplo: SUPABASE_EXPECTED_PROJECT_REF=xxxxxxxxxxxxxxxxxxxx\n');
  process.exit(1);
}

let actualProjectRef = '';
try {
  const parsedUrl = new URL(supabaseUrl);
  actualProjectRef = parsedUrl.hostname.split('.')[0];
} catch {
  console.error('[ERROR FATAL] NEXT_PUBLIC_SUPABASE_URL no tiene un formato de URL válido.');
  process.exit(1);
}

if (actualProjectRef.trim().toLowerCase() !== expectedProjectRef.trim().toLowerCase()) {
  console.error('\n[BLOQUEO DE SEGURIDAD] Discrepancia crítica en el identificador del proyecto.');
  console.error(`- Proyecto configurado en URL: "${actualProjectRef}"`);
  console.error(`- Proyecto esperado por entorno: "${expectedProjectRef}"`);
  console.error('La ejecución se detiene inmediatamente antes de establecer cualquier conexión.\n');
  process.exit(1);
}

console.log(`[INFO] Conexión validada para el proyecto Supabase ref: "${actualProjectRef}"`);

// Estados de postulación autorizados funcionalmente para derivación a empresas
const ESTADOS_PERMITIDOS_DERIVACION = new Set([
  'presentado_a_empresa',
  'entrevista',
  'seleccionado',
  'rechazado_por_empresa',
  'contratado'
]);

// 3. Función auxiliar para ejecutar consultas autenticando como usuario individual
async function queryAsUser(email, password, roleLabel) {
  console.log(`\n---------------------------------------------------------------`);
  console.log(`[CONSULTA] Autenticando sesión para: ${roleLabel} (${email})`);
  console.log(`---------------------------------------------------------------`);

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    return {
      ok: false,
      authError: `Fallo de autenticación para ${email}: ${authError.message}`,
      userId: null,
      empresa: null,
      rpcData: [],
      rpcError: null,
      viewData: [],
      viewError: null
    };
  }

  const userId = authData.user.id;

  // Consulta RPC obtener_candidatos_empresa()
  const { data: rpcData, error: rpcError } = await client.rpc('obtener_candidatos_empresa');

  // Consulta directa a la vista vista_candidatos_empresa
  const { data: viewData, error: viewError } = await client
    .from('vista_candidatos_empresa')
    .select('*');

  // Consulta de la empresa vinculada a este usuario (solo lectura)
  const { data: empresa, error: empresaError } = await client
    .from('empresas')
    .select('id, razon_social, estado')
    .eq('user_id', userId)
    .maybeSingle();

  // Consulta de una oferta de otra empresa para prueba de cruce (solo lectura)
  let ofertaAjena = null;
  if (empresa && empresa.id) {
    const { data: ofertaExterna } = await client
      .from('ofertas')
      .select('id, empresa_id')
      .neq('empresa_id', empresa.id)
      .limit(1)
      .maybeSingle();
    ofertaAjena = ofertaExterna || null;
  }

  await client.auth.signOut();

  return {
    ok: true,
    authError: null,
    userId,
    empresa,
    empresaError: empresaError ? empresaError.message : null,
    ofertaAjena,
    rpcData: rpcData || [],
    rpcError: rpcError ? rpcError.message : null,
    viewData: viewData || [],
    viewError: viewError ? viewError.message : null
  };
}

// Consulta de oferta específica de solo lectura
async function queryOfertaEspecifica(email, password, ofertaId) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError) {
    return { data: [], error: `Error autenticando para consulta de oferta: ${authError.message}` };
  }
  const { data, error } = await client.rpc('obtener_candidatos_empresa', { p_oferta_id: ofertaId });
  await client.auth.signOut();
  return { data: data || [], error: error ? error.message : null };
}

async function runReadOnlyTests() {
  console.log('===============================================================');
  console.log('VERIFICACIÓN DE AISLAMIENTO ESTRICTO DE CANDIDATOS (SOLO LECTURA)');
  console.log('===============================================================');

  const failures = [];
  const pendingChecks = [];

  // =========================================================================
  // CASO 1: Empresa Aprobada (empresa@funes.com)
  // =========================================================================
  const empA = await queryAsUser('empresa@funes.com', 'Funes2026!', 'Empresa Funes SRL (Aprobada)');

  if (!empA.ok) {
    failures.push(empA.authError);
  } else {
    // 1.1 Registrar errores de consulta explícitos
    if (empA.rpcError) {
      failures.push(`[ERROR RPC] Empresa recibió error al invocar RPC: ${empA.rpcError}`);
    }
    if (empA.viewError) {
      failures.push(`[ERROR VISTA] Empresa recibió error al consultar vista: ${empA.viewError}`);
    }
    if (empA.empresaError) {
      failures.push(`[ERROR DATOS] Error al consultar perfil de empresa: ${empA.empresaError}`);
    }

    const miEmpresaId = empA.empresa?.id;
    console.log(`-> Empresa ID en sesión: ${miEmpresaId || 'Sin ID'}`);
    console.log(`-> Candidatos recibidos en RPC: ${empA.rpcData.length}`);
    console.log(`-> Candidatos recibidos en Vista: ${empA.viewData.length}`);

    if (!miEmpresaId) {
      failures.push('[CONFIGURACIÓN] El usuario empresa@funes.com no posee registro asociado en la tabla empresas.');
    } else {
      // 1.2 Aislamiento de registros devueltos en RPC
      const ajenosRpc = empA.rpcData.filter((c) => c.empresa_id !== miEmpresaId);
      if (ajenosRpc.length > 0) {
        failures.push(
          `[VULNERABILIDAD AISLAMIENTO RPC] Empresa recibió ${ajenosRpc.length} candidato(s) de otra(s) empresa(s).`
        );
      }

      // 1.3 Validación de estados válidos en RPC
      const estadosInvalidosRpc = empA.rpcData.filter((c) => !ESTADOS_PERMITIDOS_DERIVACION.has(c.estado_postulacion));
      if (estadosInvalidosRpc.length > 0) {
        failures.push(
          `[ESTADO NO AUTORIZADO RPC] Empresa recibió ${estadosInvalidosRpc.length} candidato(s) con estados no autorizados para derivación.`
        );
      }

      // 1.4 Aislamiento de registros devueltos en Vista
      const ajenosVista = empA.viewData.filter((c) => c.empresa_id !== miEmpresaId);
      if (ajenosVista.length > 0) {
        failures.push(
          `[VULNERABILIDAD AISLAMIENTO VISTA] Empresa recibió ${ajenosVista.length} candidato(s) de otra(s) empresa(s).`
        );
      }

      // 1.5 Validación de estados válidos en Vista
      const estadosInvalidosVista = empA.viewData.filter((c) => !ESTADOS_PERMITIDOS_DERIVACION.has(c.estado_postulacion));
      if (estadosInvalidosVista.length > 0) {
        failures.push(
          `[ESTADO NO AUTORIZADO VISTA] Empresa recibió ${estadosInvalidosVista.length} candidato(s) con estados no autorizados para derivación.`
        );
      }

      // 1.6 Prueba de consulta cruzada de oferta ajena (si existe en los datos)
      if (empA.ofertaAjena && empA.ofertaAjena.id) {
        console.log(`-> Probando consulta de oferta perteneciente a otra empresa (ID: ${empA.ofertaAjena.id})...`);
        const resOfertaAjena = await queryOfertaEspecifica('empresa@funes.com', 'Funes2026!', empA.ofertaAjena.id);
        if (resOfertaAjena.error) {
          failures.push(`[ERROR CONSULTA OFERTA AJENA] Fallo al invocar RPC con p_oferta_id ajeno: ${resOfertaAjena.error}`);
        } else if (resOfertaAjena.data.length > 0) {
          failures.push(
            `[VULNERABILIDAD CONSULTA CRUZADA] Empresa pudo obtener ${resOfertaAjena.data.length} candidatos al consultar una oferta de otra empresa.`
          );
        } else {
          console.log(`   Correcto: 0 candidatos devueltos para oferta de otra empresa.`);
        }
      } else {
        pendingChecks.push(
          'Consulta cruzada con p_oferta_id de otra empresa: No existen ofertas de terceras empresas en la base actual para probar el cruce sin crear datos.'
        );
      }
    }
  }

  // =========================================================================
  // CASO 2: Postulante / Vecino sin privilegios empresariales (postulante@funes.com)
  // =========================================================================
  const post = await queryAsUser('postulante@funes.com', 'Funes2026!', 'Postulante (Vecino)');

  if (!post.ok) {
    failures.push(post.authError);
  } else {
    if (post.rpcError) {
      failures.push(`[ERROR RPC] Postulante recibió error inesperado en RPC: ${post.rpcError}`);
    }
    if (post.viewError) {
      failures.push(`[ERROR VISTA] Postulante recibió error inesperado en Vista: ${post.viewError}`);
    }

    console.log(`-> Candidatos recibidos en RPC: ${post.rpcData.length} (Esperado: 0)`);
    console.log(`-> Candidatos recibidos en Vista: ${post.viewData.length} (Esperado: 0)`);

    if (post.rpcData.length > 0) {
      failures.push(
        `[VULNERABILIDAD CRÍTICA SEGURIDAD] Postulante pudo consultar ${post.rpcData.length} candidatos en la RPC.`
      );
    }
    if (post.viewData.length > 0) {
      failures.push(
        `[VULNERABILIDAD CRÍTICA SEGURIDAD] Postulante pudo consultar ${post.viewData.length} candidatos en la Vista.`
      );
    }
  }

  // =========================================================================
  // CASO 3: Administrador Municipal (administracion@funes.com)
  // =========================================================================
  const admin = await queryAsUser('administracion@funes.com', 'Funes2026!', 'Administrador Municipal');

  if (!admin.ok) {
    failures.push(admin.authError);
  } else {
    if (admin.rpcError) {
      failures.push(`[ERROR RPC] Administrador recibió error al invocar RPC: ${admin.rpcError}`);
    }
    if (admin.viewError) {
      failures.push(`[ERROR VISTA] Administrador recibió error al consultar Vista: ${admin.viewError}`);
    }

    console.log(`-> Candidatos recibidos en RPC: ${admin.rpcData.length}`);
    console.log(`-> Candidatos recibidos en Vista: ${admin.viewData.length}`);

    // Validar que los estados devueltos al administrador también sean conformes
    const estadosInvalidosAdmin = admin.rpcData.filter((c) => !ESTADOS_PERMITIDOS_DERIVACION.has(c.estado_postulacion));
    if (estadosInvalidosAdmin.length > 0) {
      failures.push(
        `[ESTADO NO AUTORIZADO RPC ADMIN] Se devolvieron ${estadosInvalidosAdmin.length} registros con estados no autorizados para derivación.`
      );
    }
  }

  // =========================================================================
  // CASO 4: Comprobaciones pendientes documentadas
  // =========================================================================
  pendingChecks.push(
    'Empresas en estado "pendiente" o "rechazada": Requiere una cuenta de empresa con ese estado específico para comprobar que devuelva 0 filas sin alterar la empresa de demo actual.'
  );

  // =========================================================================
  // RESUMEN Y EVALUACIÓN FINAL
  // =========================================================================
  console.log('\n===============================================================');
  console.log('EVALUACIÓN DE COMPROBACIONES REALIZADAS:');
  console.log('===============================================================');

  if (pendingChecks.length > 0) {
    console.log('COMPROBACIONES PENDIENTES (Requieren datos adicionales o entorno de pruebas):');
    pendingChecks.forEach((p, idx) => console.log(`  [PENDIENTE ${idx + 1}] ${p}`));
    console.log('---------------------------------------------------------------');
  }

  if (failures.length > 0) {
    console.error('SE DETECTARON DISCREPANCIAS O FALLOS DE SEGURIDAD:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    console.error('\n[RESULTADO: FALLÓ] El aislamiento no es estricto o se produjeron errores en la consulta.\n');
    process.exit(1);
  } else {
    console.log('TODAS LAS COMPROBACIONES DISPONIBLES EN LA BASE ACTUAL PASARON (CÓDIGO 0).\n');
    process.exit(0);
  }
}

// Ejecutar si se invoca directamente desde terminal
if (require.main === module) {
  runReadOnlyTests().catch((err) => {
    console.error('[ERROR FATAL EN EJECUCIÓN]', err);
    process.exit(1);
  });
}

module.exports = { runReadOnlyTests, queryAsUser, queryOfertaEspecifica, ESTADOS_PERMITIDOS_DERIVACION };
