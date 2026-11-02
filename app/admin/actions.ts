'use server';

import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export interface NuevoAdminInput {
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
}

/**
 * Server Action para dar de alta a un nuevo administrador entre pares.
 * Valida estrictamente que quien invoque sea un administrador municipal activo.
 */
export async function crearNuevoAdminAction(input: NuevoAdminInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Validar sesión del usuario invocador
    const supabaseCaller = await createServerSupabase();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabaseCaller.auth.getUser();

    if (authError || !callerUser) {
      return {
        success: false,
        error: 'No autorizado: Debés iniciar sesión como administrador.',
      };
    }

    // Comprobar rol del usuario invocador en public.perfil
    const { data: callerPerfil, error: perfilError } = await supabaseCaller
      .from('perfil')
      .select('rol, activo, deleted_at')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (
      perfilError ||
      !callerPerfil ||
      callerPerfil.rol !== 'admin' ||
      !callerPerfil.activo ||
      callerPerfil.deleted_at !== null
    ) {
      return {
        success: false,
        error: 'Operación denegada: Sólo un administrador activo puede dar de alta a otro administrador.',
      };
    }

    // 2. Validar datos requeridos
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();
    const nombre = input.nombre.trim();
    const apellido = input.apellido?.trim() || null;
    const cleanDni = input.dni ? input.dni.replace(/\D/g, '') : null;
    const telefono = input.telefono?.trim() || null;

    if (!email || !password || !nombre) {
      return {
        success: false,
        error: 'El correo electrónico, la contraseña y el nombre son obligatorios.',
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos 6 caracteres.',
      };
    }

    // 3. Crear cliente con Privilegios de Servicio (Service Role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        success: false,
        error: 'Configuración del servidor incompleta (falta Service Role Key).',
      };
    }

    const supabaseAdmin = createAdminSupabase<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Crear usuario en Supabase Auth
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        rol: 'admin',
        nombre,
        apellido,
        dni: cleanDni,
        telefono,
      },
    });

    if (createError || !newUserData.user) {
      console.error('Error en supabaseAdmin.auth.admin.createUser:', createError);
      return {
        success: false,
        error: createError?.message || 'No se pudo crear el usuario en el sistema de autenticación.',
      };
    }

    const newUserId = newUserData.user.id;

    // 5. Asegurar perfil con rol 'admin', activo y sin deleted_at
    const { error: upsertPerfilError } = await supabaseAdmin.from('perfil').upsert({
      id: newUserId,
      rol: 'admin',
      nombre,
      apellido,
      dni: cleanDni,
      telefono,
      fecha_nacimiento: null,
      direccion: null,
      localidad: 'Funes',
      nivel_educativo: null,
      situacion_laboral_actual: null,
      habilidades: null,
      experiencia_resumen: null,
      cv_url: null,
      disponibilidad_horaria: null,
      movilidad_propia: false,
      es_admin_general: false,
      es_residente_funes: true,
      activo: true,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    });

    if (upsertPerfilError) {
      console.error('Error configurando perfil del nuevo admin:', upsertPerfilError);
      return {
        success: false,
        error: `Usuario creado, pero hubo un error al asentar el rol administrativo: ${upsertPerfilError.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Error inesperado en crearNuevoAdminAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al crear administrador.',
    };
  }
}

export interface EditarAdminInput {
  id: string;
  nombre: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
}

/**
 * Server Action para actualizar los datos personales de un administrador.
 */
export async function actualizarDatosAdminAction(input: EditarAdminInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabaseCaller = await createServerSupabase();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabaseCaller.auth.getUser();

    if (authError || !callerUser) {
      return {
        success: false,
        error: 'No autorizado: Debés iniciar sesión como administrador.',
      };
    }

    // Validar rol del invocador
    const { data: callerPerfil, error: perfilError } = await supabaseCaller
      .from('perfil')
      .select('rol, activo, deleted_at')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (
      perfilError ||
      !callerPerfil ||
      callerPerfil.rol !== 'admin' ||
      !callerPerfil.activo ||
      callerPerfil.deleted_at !== null
    ) {
      return {
        success: false,
        error: 'Operación denegada: Sólo un administrador activo puede editar datos de administradores.',
      };
    }

    const nombre = input.nombre.trim();
    if (!nombre) {
      return {
        success: false,
        error: 'El nombre es obligatorio.',
      };
    }

    const cleanDni = input.dni ? input.dni.replace(/\D/g, '') : null;
    const apellido = input.apellido?.trim() || null;
    const telefono = input.telefono?.trim() || null;

    const { error: updateError } = await supabaseCaller
      .from('perfil')
      .update({
        nombre,
        apellido,
        dni: cleanDni,
        telefono,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('rol', 'admin');

    if (updateError) {
      return {
        success: false,
        error: `No se pudieron actualizar los datos: ${updateError.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Error inesperado en actualizarDatosAdminAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al actualizar administrador.',
    };
  }
}

export interface RegistrarPostulanteAsistidoInput {
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  password?: string;
  telefono: string;
  fecha_nacimiento?: string | null;
  direccion?: string | null;
  localidad: string;
  es_residente_funes: boolean;
  nivel_educativo: string;
  situacion_laboral_actual: string;
  disponibilidad_horaria: string;
  movilidad_propia: boolean;
  experiencia_resumen?: string | null;
  habilidades: string[];
  rubroIds: number[];
  avatar_url?: string | null;
}

/**
 * Server Action para dar de alta un postulante desde la pestaña Registro Asistido.
 * Crea formalmente el usuario en auth.users (permitiendo su posterior login con DNI y contraseña),
 * y vincula el legajo en public.perfil y public.perfil_rubros.
 */
export async function registrarPostulanteAsistidoAction(
  input: RegistrarPostulanteAsistidoInput
): Promise<{ success: boolean; error?: string; perfilId?: string; claveAsignada?: string }> {
  try {
    const supabaseCaller = await createServerSupabase();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabaseCaller.auth.getUser();

    if (authError || !callerUser) {
      return { success: false, error: 'No autorizado: Debés iniciar sesión como administrador.' };
    }

    const { data: callerPerfil } = await supabaseCaller
      .from('perfil')
      .select('rol, activo, deleted_at')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (
      !callerPerfil ||
      callerPerfil.rol !== 'admin' ||
      !callerPerfil.activo ||
      callerPerfil.deleted_at !== null
    ) {
      return {
        success: false,
        error: 'Operación denegada: Sólo un administrador activo puede registrar legajos asistidos.',
      };
    }

    const cleanDni = input.dni ? input.dni.replace(/\D/g, '') : '';
    if (!cleanDni || cleanDni.length < 7 || cleanDni.length > 8) {
      return { success: false, error: 'El DNI debe tener 7 u 8 dígitos numéricos válidos.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Configuración del servidor incompleta (falta Service Role).' };
    }

    const supabaseAdmin = createAdminSupabase<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar si ya existe perfil con este DNI
    const { data: perfilExistente } = await supabaseAdmin
      .from('perfil')
      .select('id, nombre, apellido')
      .eq('dni', cleanDni)
      .maybeSingle();

    if (perfilExistente) {
      return {
        success: false,
        error: `Ya existe un legajo registrado con el DNI ${cleanDni} (${perfilExistente.nombre} ${perfilExistente.apellido || ''}).`,
      };
    }

    // Determinar email de autenticación: si tiene correo real lo usa; sino, genera el alias municipal
    const tieneEmailReal = Boolean(input.email && input.email.trim());
    const emailAuth = tieneEmailReal
      ? input.email!.trim().toLowerCase()
      : `dni${cleanDni}@postulante.funes.gob.ar`;

    // Determinar contraseña: la provista o una provisoria estándar comunicada al vecino
    const claveAsignada = input.password && input.password.trim().length >= 6
      ? input.password.trim()
      : `Funes.${cleanDni.slice(-4)}`;

    // 1. Crear usuario en auth.users
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailAuth,
      password: claveAsignada,
      email_confirm: true,
      user_metadata: {
        rol: 'postulante',
        nombre: input.nombre.trim(),
        apellido: input.apellido?.trim() || null,
        dni: cleanDni,
        telefono: input.telefono?.trim() || null,
      },
    });

    if (createError || !newUserData.user) {
      return {
        success: false,
        error: createError?.message || 'No se pudo crear la credencial de autenticación.',
      };
    }

    const newUserId = newUserData.user.id;

    // 2. Crear o actualizar perfil en public.perfil
    const { error: perfilInsertError } = await supabaseAdmin.from('perfil').upsert({
      id: newUserId,
      rol: 'postulante',
      nombre: input.nombre.trim(),
      apellido: input.apellido?.trim() || null,
      dni: cleanDni,
      telefono: input.telefono?.trim() || null,
      fecha_nacimiento: input.fecha_nacimiento || null,
      direccion: input.direccion?.trim() || null,
      localidad: input.localidad.trim(),
      es_residente_funes: input.es_residente_funes,
      nivel_educativo: input.nivel_educativo,
      situacion_laboral_actual: input.situacion_laboral_actual,
      disponibilidad_horaria: input.disponibilidad_horaria,
      movilidad_propia: input.movilidad_propia,
      experiencia_resumen: input.experiencia_resumen?.trim() || null,
      cv_url: null,
      habilidades: input.habilidades,
      avatar_url: input.avatar_url || null,
      registro_asistido: true,
      creado_por_admin: callerUser.id,
      activo: true,
      deleted_at: null,
    });

    if (perfilInsertError) {
      console.error('Error insertando perfil asistido:', perfilInsertError);
      return {
        success: false,
        error: `Error al crear el perfil laboral: ${perfilInsertError.message}`,
      };
    }

    // 3. Vincular rubros si se especificaron
    if (input.rubroIds && input.rubroIds.length > 0) {
      const rubroRows = input.rubroIds.map((rId) => ({
        perfil_id: newUserId,
        rubro_id: rId,
      }));
      await supabaseAdmin.from('perfil_rubros').insert(rubroRows);
    }

    return {
      success: true,
      perfilId: newUserId,
      claveAsignada,
    };
  } catch (err) {
    console.error('Error inesperado en registrarPostulanteAsistidoAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al registrar postulante asistido.',
    };
  }
}

