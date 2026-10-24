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
