// scripts/seed-test-users.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno desde .env.local sin requerir dependencias adicionales
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEFAULT_PASSWORD = 'Funes2026!';

const testUsers = [
  {
    role: 'admin',
    email: 'administracion@funes.com',
    password: DEFAULT_PASSWORD,
    user_metadata: {
      nombre: 'Administración',
      apellido: 'Portal Funes',
      rol: 'admin'
    },
    perfil: {
      nombre: 'Administración',
      apellido: 'Portal Funes',
      rol: 'admin',
      es_admin_general: true,
      activo: true,
      localidad: 'Funes',
      es_residente_funes: true
    }
  },
  {
    role: 'postulante',
    email: 'postulante@funes.com',
    password: DEFAULT_PASSWORD,
    user_metadata: {
      nombre: 'Juan',
      apellido: 'Pérez',
      rol: 'postulante',
      dni: '35123456',
      localidad: 'Funes'
    },
    perfil: {
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '35123456',
      rol: 'postulante',
      activo: true,
      localidad: 'Funes',
      es_residente_funes: true,
      telefono: '3415551234',
      direccion: 'Av. Illia 1234',
      nivel_educativo: 'Secundario Completo',
      situacion_laboral_actual: 'En búsqueda activa',
      disponibilidad_horaria: 'Full time',
      movilidad_propia: true
    }
  },
  {
    role: 'empresa',
    email: 'empresa@funes.com',
    password: DEFAULT_PASSWORD,
    user_metadata: {
      nombre: 'Martín Gómez',
      rol: 'empresa',
      razon_social: 'Empresa Funes SRL',
      nombre_fantasia: 'Comercio Funes',
      cuit: '30-71234567-8',
      direccion: 'Ruta 9 y San José',
      localidad: 'Funes',
      telefono: '3414939999'
    },
    perfil: {
      nombre: 'Empresa Funes',
      apellido: 'SRL',
      rol: 'empresa',
      activo: true,
      localidad: 'Funes',
      es_residente_funes: true,
      telefono: '3414939999',
      direccion: 'Ruta 9 y San José'
    },
    empresa: {
      razon_social: 'Empresa Funes SRL',
      nombre_fantasia: 'Comercio Funes',
      cuit: '30-71234567-8',
      direccion: 'Ruta 9 y San José',
      localidad: 'Funes',
      telefono: '3414939999',
      email_contacto: 'empresa@funes.com',
      persona_contacto: 'Martín Gómez',
      rubro: 'Comercio',
      descripcion: 'Empresa modelo registrada para pruebas en Portal de Empleo Funes.',
      verificada: true,
      estado: 'aprobada'
    }
  }
];

async function seed() {
  console.log('Iniciando aprovisionamiento oficial de usuarios...');

  for (const item of testUsers) {
    console.log(`\nProcesando usuario: ${item.email} (${item.role})...`);

    // 1. Crear en auth.users a través de la API oficial de GoTrue
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: item.email,
      password: item.password,
      email_confirm: true,
      user_metadata: item.user_metadata
    });

    let userId;
    if (createError) {
      console.error(`Error al crear usuario ${item.email}:`, createError.message);
      continue;
    } else {
      userId = createData.user.id;
      console.log(` Usuario creado en Supabase Auth con ID: ${userId}`);
    }

    // 2. Asegurar que public.perfil refleje el rol y los datos completos
    const { error: perfilError } = await supabase
      .from('perfil')
      .upsert({
        id: userId,
        ...item.perfil
      });

    if (perfilError) {
      console.error(`Error al actualizar perfil de ${item.email}:`, perfilError.message);
    } else {
      console.log(` Perfil asignado correctamente con rol '${item.perfil.rol}'.`);
    }

    // 3. Si es empresa, registrar y aprobar en public.empresas
    if (item.empresa) {
      const { error: empresaError } = await supabase
        .from('empresas')
        .upsert({
          user_id: userId,
          ...item.empresa
        }, { onConflict: 'user_id' });

      if (empresaError) {
        console.error(`Error al configurar public.empresas para ${item.email}:`, empresaError.message);
      } else {
        console.log(` Empresa creada y aprobada con CUIT ${item.empresa.cuit}.`);
      }
    }
  }

  console.log('\n=============================================');
  console.log('¡Aprovisionamiento finalizado!');
  console.log('Verificando inicio de sesión con anon client...');
  console.log('=============================================');

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonSupabase = createClient(supabaseUrl, anonKey);

  for (const item of testUsers) {
    const { data: signData, error: signError } = await anonSupabase.auth.signInWithPassword({
      email: item.email,
      password: item.password
    });

    if (signError) {
      console.error(` ERROR al iniciar sesión con ${item.email}:`, signError.message);
    } else {
      console.log(` Login exitoso con ${item.email}! ID: ${signData.user.id}`);
      await anonSupabase.auth.signOut();
    }
  }
}

seed().catch(err => {
  console.error('Error general durante el seed:', err);
  process.exit(1);
});
