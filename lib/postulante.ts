import {
  Curriculum,
  HistorialPostulacion,
  Perfil,
  Postulacion,
  PostulanteCurso,
  Rubro,
} from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export const CV_BUCKET_NAME = 'postulantes-cvs';
export const MAX_ACTIVE_CVS = 5;
export const MAX_CV_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const CV_STALE_DAYS = 180; // 6 meses

export const ALLOWED_CV_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_CV_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];

export interface PostulanteProfileFull extends Perfil {
  rubros: Rubro[];
  curriculums: Curriculum[];
}

export interface PostulacionConDetalle extends Postulacion {
  historial: HistorialPostulacion[];
}

export interface UpdatePostulanteProfileInput {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  fecha_nacimiento?: string | null;
  direccion?: string | null;
  localidad?: string;
  nivel_educativo?: string | null;
  situacion_laboral_actual?: string | null;
  experiencia_resumen?: string | null;
  habilidades?: string[];
  disponibilidad_horaria?: string | null;
  movilidad_propia?: boolean;
  rubroIds?: number[];
}

/**
 * Valida un archivo de CV antes de subirlo a Supabase Storage.
 */
export function validateCurriculumFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Seleccioná un archivo válido para tu currículum.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'El archivo seleccionado está vacío.' };
  }

  if (file.size > MAX_CV_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'El archivo supera el tamaño máximo permitido de 10 MB.',
    };
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_CV_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasValidMime = (ALLOWED_CV_MIME_TYPES as readonly string[]).includes(file.type);

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error:
        'Formato no admitido. Podés subir archivos PDF, Word (.doc, .docx) o imágenes legibles (.jpg, .png, .webp).',
    };
  }

  return { valid: true };
}

/**
 * Sanitiza el nombre del archivo para construir una ruta segura en Storage.
 */
function sanitizeStorageFileName(fileName: string): string {
  const clean = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

  return clean.slice(-80) || 'curriculum.pdf';
}

/**
 * Determina si un CV lleva más de 180 días (6 meses) sin actualizarse.
 */
export function isCurriculumStale(cv: Pick<Curriculum, 'updated_at' | 'created_at'>): boolean {
  const refDateStr = cv.updated_at || cv.created_at;
  if (!refDateStr) return false;
  const refTime = new Date(refDateStr).getTime();
  if (Number.isNaN(refTime)) return false;
  const diffDays = (Date.now() - refTime) / (1000 * 60 * 60 * 24);
  return diffDays > CV_STALE_DAYS;
}

/**
 * Obtiene el perfil completo del postulante autenticado, incluyendo sus rubros de interés
 * y sus currículums activos.
 */
export async function getPostulanteProfile(
  userId?: string
): Promise<PostulanteProfileFull | null> {
  try {
    const supabase = createClient();
    let targetUserId = userId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) return null;

    const [perfilRes, perfilRubrosRes, cvsRes] = await Promise.all([
      supabase
        .from('perfil')
        .select('*')
        .eq('id', targetUserId)
        .is('deleted_at', null)
        .maybeSingle(),
      supabase
        .from('perfil_rubros')
        .select('rubro_id, rubros:rubros!perfil_rubros_rubro_id_fkey(id, nombre, descripcion, activo, created_at)')
        .eq('perfil_id', targetUserId),
      supabase
        .from('curriculums')
        .select('*')
        .eq('postulante_id', targetUserId)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('es_principal', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    if (perfilRes.error || !perfilRes.data) {
      if (perfilRes.error) {
        console.error('Error consultando perfil del postulante:', perfilRes.error.message);
      }
      return null;
    }

    const rubros: Rubro[] = [];
    if (perfilRubrosRes.data) {
      for (const row of perfilRubrosRes.data as unknown as Array<{
        rubro_id: number;
        rubros: Rubro | Rubro[] | null;
      }>) {
        const r = Array.isArray(row.rubros) ? row.rubros[0] : row.rubros;
        if (r && r.activo) {
          rubros.push(r);
        }
      }
    }

    return {
      ...perfilRes.data,
      role: perfilRes.data.rol,
      rubros,
      curriculums: cvsRes.data || [],
    };
  } catch (err) {
    console.error('Error inesperado obteniendo perfil completo del postulante:', err);
    return null;
  }
}

/**
 * Actualiza los datos personales, laborales y rubros de interés del postulante autenticado.
 */
export async function updatePostulanteProfile(
  input: UpdatePostulanteProfileInput
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Tu sesión expiró. Por favor iniciá sesión nuevamente.',
      };
    }

    const updatePayload: Record<string, any> = {};

    if (input.nombre !== undefined) {
      const cleanNombre = input.nombre.trim();
      if (!cleanNombre) {
        return { success: false, message: 'El nombre es obligatorio.' };
      }
      updatePayload.nombre = cleanNombre;
    }

    if (input.apellido !== undefined) {
      const cleanApellido = input.apellido.trim();
      if (!cleanApellido) {
        return { success: false, message: 'El apellido es obligatorio.' };
      }
      updatePayload.apellido = cleanApellido;
    }

    if (input.dni !== undefined) {
      const cleanDni = input.dni.replace(/\D/g, '');
      if (!cleanDni || cleanDni.length < 7 || cleanDni.length > 8) {
        return {
          success: false,
          message: 'Ingresá un número de DNI válido (7 u 8 dígitos sin puntos).',
        };
      }
      updatePayload.dni = cleanDni;
    }

    if (input.telefono !== undefined) {
      const cleanTelefono = input.telefono.trim();
      const phoneDigits = cleanTelefono.replace(/\D/g, '');
      if (!cleanTelefono || phoneDigits.length < 8) {
        return {
          success: false,
          message: 'Ingresá un teléfono o WhatsApp válido (mínimo 8 dígitos).',
        };
      }
      updatePayload.telefono = cleanTelefono;
    }

    if (input.localidad !== undefined) {
      const cleanLocalidad = input.localidad.trim();
      if (!cleanLocalidad) {
        return { success: false, message: 'La localidad de residencia es obligatoria.' };
      }
      updatePayload.localidad = cleanLocalidad;
      updatePayload.es_residente_funes = cleanLocalidad.toLowerCase() === 'funes';
    }

    if (input.fecha_nacimiento !== undefined) {
      updatePayload.fecha_nacimiento = input.fecha_nacimiento?.trim() || null;
    }

    if (input.direccion !== undefined) {
      updatePayload.direccion = input.direccion?.trim() || null;
    }

    if (input.nivel_educativo !== undefined) {
      updatePayload.nivel_educativo = input.nivel_educativo?.trim() || null;
    }

    if (input.situacion_laboral_actual !== undefined) {
      updatePayload.situacion_laboral_actual = input.situacion_laboral_actual?.trim() || null;
    }

    if (input.experiencia_resumen !== undefined) {
      updatePayload.experiencia_resumen = input.experiencia_resumen?.trim() || null;
    }

    if (input.habilidades !== undefined) {
      updatePayload.habilidades = input.habilidades
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
    }

    if (input.disponibilidad_horaria !== undefined) {
      updatePayload.disponibilidad_horaria = input.disponibilidad_horaria?.trim() || null;
    }

    if (input.movilidad_propia !== undefined) {
      updatePayload.movilidad_propia = Boolean(input.movilidad_propia);
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await (supabase.from('perfil') as any)
        .update(updatePayload)
        .eq('id', user.id);

      if (updateError) {
        const lowerMsg = updateError.message.toLowerCase();
        if (
          lowerMsg.includes('dni') ||
          updateError.message.includes('idx_perfil_dni_numerico_unico') ||
          updateError.message.includes('perfil_dni_key')
        ) {
          return {
            success: false,
            message: 'El DNI ingresado ya se encuentra registrado en otra cuenta del sistema.',
          };
        }
        return {
          success: false,
          message: `No se pudo actualizar el perfil: ${updateError.message}`,
        };
      }
    }

    // Sincronizar rubros de interés si se enviaron en el payload
    if (input.rubroIds !== undefined) {
      const uniqueRubroIds = Array.from(
        new Set(input.rubroIds.filter((id) => Number.isInteger(id) && id > 0))
      );

      const { error: deleteRubrosError } = await supabase
        .from('perfil_rubros')
        .delete()
        .eq('perfil_id', user.id);

      if (deleteRubrosError) {
        console.error('Error limpiando rubros previos del perfil:', deleteRubrosError.message);
        return {
          success: false,
          message: 'Tus datos personales se guardaron, pero hubo un problema al actualizar los rubros de interés.',
        };
      }

      if (uniqueRubroIds.length > 0) {
        const rowsToInsert = uniqueRubroIds.map((rubroId) => ({
          perfil_id: user.id,
          rubro_id: rubroId,
        }));

        const { error: insertRubrosError } = await supabase
          .from('perfil_rubros')
          .insert(rowsToInsert);

        if (insertRubrosError) {
          console.error('Error insertando rubros del perfil:', insertRubrosError.message);
          return {
            success: false,
            message: 'Tus datos personales se guardaron, pero no se pudieron asociar todos los rubros seleccionados.',
          };
        }
      }
    }

    return {
      success: true,
      message: 'Tu perfil laboral fue actualizado correctamente.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado al actualizar el perfil.';
    return { success: false, message };
  }
}

/**
 * Obtiene los currículums activos del postulante autenticado (máximo 5 por regla de negocio).
 */
export async function getActiveCurriculums(postulanteId?: string): Promise<Curriculum[]> {
  try {
    const supabase = createClient();
    let targetUserId = postulanteId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from('curriculums')
      .select('*')
      .eq('postulante_id', targetUserId)
      .eq('activo', true)
      .is('deleted_at', null)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo currículums activos:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error inesperado consultando currículums:', err);
    return [];
  }
}

/**
 * Sube un nuevo archivo al bucket privado `postulantes-cvs` y registra el CV en `public.curriculums`.
 * Respeta el límite máximo de 5 CVs activos y la unicidad del CV principal.
 */
export async function uploadCurriculum(params: {
  file: File;
  nombreCv: string;
  esPrincipal?: boolean;
}): Promise<{ success: boolean; cv?: Curriculum; message: string }> {
  try {
    const validation = validateCurriculumFile(params.file);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || 'Archivo inválido.',
      };
    }

    const cleanNombreCv = params.nombreCv.trim();
    if (!cleanNombreCv) {
      return {
        success: false,
        message: 'Ingresá un nombre descriptivo para identificar tu CV (ej. "CV Administrativo").',
      };
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Debés iniciar sesión para subir un currículum.',
      };
    }

    // Verificar cantidad actual de CVs activos antes de subir el archivo a Storage
    const existingCvs = await getActiveCurriculums(user.id);
    if (existingCvs.length >= MAX_ACTIVE_CVS) {
      return {
        success: false,
        message: `Ya alcanzaste el límite máximo de ${MAX_ACTIVE_CVS} currículums activos. Archivá alguno existente antes de subir uno nuevo.`,
      };
    }

    const shouldBePrincipal =
      params.esPrincipal !== undefined ? params.esPrincipal : existingCvs.length === 0;

    const safeFileName = sanitizeStorageFileName(params.file.name);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `${user.id}/${uniqueSuffix}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(CV_BUCKET_NAME)
      .upload(storagePath, params.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: params.file.type || undefined,
      });

    if (uploadError) {
      console.error('Error subiendo CV a Supabase Storage:', uploadError);
      return {
        success: false,
        message: `No se pudo subir el archivo del CV: ${uploadError.message}`,
      };
    }

    const { data: insertedCv, error: insertError } = await supabase
      .from('curriculums')
      .insert({
        postulante_id: user.id,
        nombre_cv: cleanNombreCv,
        archivo_url: storagePath,
        es_principal: shouldBePrincipal,
        activo: true,
      })
      .select('*')
      .single();

    if (insertError || !insertedCv) {
      console.error('Error insertando registro en public.curriculums:', insertError);
      return {
        success: false,
        message:
          insertError?.message ||
          'No se pudo registrar el currículum en tu perfil. Verificá que no superes los 5 CVs activos.',
      };
    }

    // Mantener sincronizada la columna legacy `perfil.cv_url` cuando se define un CV principal
    if (insertedCv.es_principal) {
      await supabase
        .from('perfil')
        .update({ cv_url: storagePath })
        .eq('id', user.id);
    }

    return {
      success: true,
      cv: insertedCv,
      message: 'Currículum subido y registrado con éxito.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado al subir el currículum.';
    return { success: false, message };
  }
}

/**
 * Reemplaza el archivo y/o el nombre de un CV existente creando un nuevo objeto en Storage.
 * No sobrescribe ni borra el objeto anterior en Storage para preservar la inmutabilidad
 * de cualquier `cv_url_snapshot` en postulaciones históricas.
 */
export async function updateCurriculumFile(params: {
  cvId: string;
  file?: File | null;
  nombreCv?: string;
}): Promise<{ success: boolean; cv?: Curriculum; message: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Debés iniciar sesión para actualizar tu currículum.',
      };
    }

    let newStoragePath: string | undefined;

    if (params.file) {
      const validation = validateCurriculumFile(params.file);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || 'Archivo inválido.',
        };
      }

      const safeFileName = sanitizeStorageFileName(params.file.name);
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      newStoragePath = `${user.id}/${uniqueSuffix}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(CV_BUCKET_NAME)
        .upload(newStoragePath, params.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: params.file.type || undefined,
        });

      if (uploadError) {
        console.error('Error subiendo nueva versión del CV a Storage:', uploadError);
        return {
          success: false,
          message: `No se pudo subir el nuevo archivo: ${uploadError.message}`,
        };
      }
    }

    const updatePayload: {
      nombre_cv?: string;
      archivo_url?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (params.nombreCv !== undefined) {
      const cleanName = params.nombreCv.trim();
      if (!cleanName) {
        return {
          success: false,
          message: 'El nombre del currículum no puede quedar vacío.',
        };
      }
      updatePayload.nombre_cv = cleanName;
    }

    if (newStoragePath) {
      updatePayload.archivo_url = newStoragePath;
    }

    const { data: updatedCv, error: updateError } = await supabase
      .from('curriculums')
      .update(updatePayload)
      .eq('id', params.cvId)
      .eq('postulante_id', user.id)
      .select('*')
      .single();

    if (updateError || !updatedCv) {
      return {
        success: false,
        message: updateError?.message || 'No se pudo actualizar el currículum seleccionado.',
      };
    }

    if (updatedCv.es_principal && newStoragePath) {
      await supabase
        .from('perfil')
        .update({ cv_url: newStoragePath })
        .eq('id', user.id);
    }

    return {
      success: true,
      cv: updatedCv,
      message: 'Currículum actualizado correctamente.',
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error inesperado al actualizar el currículum.';
    return { success: false, message };
  }
}

/**
 * Marca un currículum activo como principal (`es_principal = true`).
 * El trigger `trigger_handle_principal_curriculum` desmarca automáticamente los demás CVs del postulante.
 */
export async function setPrincipalCurriculum(
  cvId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Debés iniciar sesión para modificar tu CV principal.',
      };
    }

    const { data: updatedCv, error } = await supabase
      .from('curriculums')
      .update({ es_principal: true })
      .eq('id', cvId)
      .eq('postulante_id', user.id)
      .eq('activo', true)
      .is('deleted_at', null)
      .select('id, archivo_url')
      .single();

    if (error || !updatedCv) {
      return {
        success: false,
        message: error?.message || 'No se pudo establecer como CV principal.',
      };
    }

    await supabase
      .from('perfil')
      .update({ cv_url: updatedCv.archivo_url })
      .eq('id', user.id);

    return {
      success: true,
      message: 'CV principal actualizado.',
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error inesperado al cambiar el CV principal.';
    return { success: false, message };
  }
}

/**
 * Archiva lógicamente un currículum mediante el RPC seguro `public.archivar_curriculum`.
 * Si el CV archivado era principal y quedan otros CVs activos, promueve el más reciente como principal.
 */
export async function archiveCurriculum(
  cvId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Debés iniciar sesión para archivar un currículum.',
      };
    }

    const { error } = await supabase.rpc('archivar_curriculum', {
      p_cv_id: cvId,
    });

    if (error) {
      console.error('Error en RPC archivar_curriculum:', error);
      return {
        success: false,
        message: error.message || 'No se pudo archivar el currículum.',
      };
    }

    // Verificar si quedó algún CV principal entre los activos restantes
    const remaining = await getActiveCurriculums(user.id);
    if (remaining.length > 0 && !remaining.some((c) => c.es_principal)) {
      await setPrincipalCurriculum(remaining[0].id);
    } else if (remaining.length === 0) {
      await supabase.from('perfil').update({ cv_url: null }).eq('id', user.id);
    }

    return {
      success: true,
      message:
        'Currículum archivado. Las postulaciones anteriores que lo utilizaron conservan su respaldo histórico.',
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error inesperado al archivar el currículum.';
    return { success: false, message };
  }
}

/**
 * Genera una URL temporal firmada (signed URL) para previsualizar o descargar un CV desde `postulantes-cvs`.
 */
export async function getCurriculumSignedUrl(
  archivoUrl: string,
  expiresInSeconds = 300
): Promise<{ url: string | null; error?: string }> {
  try {
    if (!archivoUrl) {
      return { url: null, error: 'El currículum no tiene una ruta de archivo asociada.' };
    }

    // Si por algún dato histórico ya es una URL absoluta http/https
    if (archivoUrl.startsWith('http://') || archivoUrl.startsWith('https://')) {
      return { url: archivoUrl };
    }

    const cleanPath = archivoUrl.replace(/^postulantes-cvs\//, '');
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from(CV_BUCKET_NAME)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error('Error generando URL firmada de CV:', error?.message);
      return {
        url: null,
        error: error?.message || 'No se pudo generar el enlace seguro al documento.',
      };
    }

    return { url: data.signedUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al abrir el documento.';
    return { url: null, error: message };
  }
}

/**
 * Obtiene todas las postulaciones del postulante autenticado junto con los datos de la oferta,
 * empresa pública, CV utilizado y el historial cronológico de cambios de estado.
 */
export async function getPostulanteApplications(
  postulanteId?: string
): Promise<PostulacionConDetalle[]> {
  try {
    const supabase = createClient();
    let targetUserId = postulanteId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from('postulaciones')
      .select(
        `
        *,
        oferta:ofertas!postulaciones_oferta_id_fkey(
          id,
          empresa_id,
          rubro_id,
          titulo,
          descripcion,
          requisitos,
          experiencia_requerida,
          tipo_jornada,
          tipo_contrato,
          ubicacion,
          rango_salarial,
          vacantes,
          estado,
          destacada,
          fecha_limite,
          deleted_at,
          created_at,
          updated_at,
          empresa:empresas!ofertas_empresa_id_fkey(
            id,
            nombre_fantasia,
            razon_social,
            localidad,
            rubro,
            descripcion,
            sitio_web,
            verificada,
            estado
          ),
          rubro:rubros!jobs_rubro_id_fkey(id, nombre, descripcion, activo, created_at)
        ),
        cv:curriculums!postulaciones_cv_id_fkey(
          id,
          postulante_id,
          nombre_cv,
          archivo_url,
          es_principal,
          activo,
          created_at,
          updated_at,
          deleted_at
        ),
        historial:historial_postulacion!application_history_application_id_fkey(
          id,
          postulacion_id,
          estado_anterior,
          estado_nuevo,
          cambiado_por,
          observaciones,
          created_at
        )
      `
      )
      .eq('postulante_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error consultando postulaciones del postulante:', error.message);
      return [];
    }

    if (!data) return [];

    return (data as unknown as Array<
      Postulacion & {
        oferta?: Postulacion['oferta'] | Array<NonNullable<Postulacion['oferta']>> | null;
        cv?: Curriculum | Curriculum[] | null;
        historial?: HistorialPostulacion[] | null;
      }
    >).map((row) => {
      const rawOferta = Array.isArray(row.oferta) ? row.oferta[0] : row.oferta;
      const rawCv = Array.isArray(row.cv) ? row.cv[0] : row.cv;
      const sortedHistorial = [...(row.historial || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let mappedOferta = rawOferta || undefined;
      if (mappedOferta) {
        const rawEmpresa = Array.isArray(mappedOferta.empresa)
          ? mappedOferta.empresa[0]
          : mappedOferta.empresa;
        const rawRubro = Array.isArray(mappedOferta.rubro)
          ? mappedOferta.rubro[0]
          : mappedOferta.rubro;
        mappedOferta = {
          ...mappedOferta,
          empresa: rawEmpresa || null,
          company: rawEmpresa || null,
          rubro: rawRubro || null,
        };
      }

      return {
        ...row,
        job_id: row.oferta_id,
        oferta: mappedOferta,
        job: mappedOferta,
        cv: rawCv || undefined,
        historial: sortedHistorial,
      };
    });
  } catch (err) {
    console.error('Error inesperado obteniendo postulaciones del postulante:', err);
    return [];
  }
}

/**
 * Ejecuta el retiro voluntario de una postulación invocando el RPC `public.retirar_postulacion`.
 */
export async function withdrawApplication(
  postulacionId: string,
  motivo?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!postulacionId) {
      return { success: false, message: 'Identificador de postulación inválido.' };
    }

    const supabase = createClient();
    const { error } = await supabase.rpc('retirar_postulacion', {
      p_postulacion_id: postulacionId,
      p_motivo: motivo?.trim() ? motivo.trim() : undefined,
    });

    if (error) {
      console.error('Error en RPC retirar_postulacion:', error);
      return {
        success: false,
        message: error.message || 'No se pudo retirar la postulación.',
      };
    }

    return {
      success: true,
      message: 'Tu postulación fue retirada voluntariamente.',
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error inesperado al retirar la postulación.';
    return { success: false, message };
  }
}

/**
 * Obtiene los cursos y capacitaciones municipales asignados al postulante (`public.postulante_cursos`).
 */
export async function getPostulanteCourses(
  postulanteId?: string
): Promise<PostulanteCurso[]> {
  try {
    const supabase = createClient();
    let targetUserId = postulanteId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from('postulante_cursos')
      .select(
        `
        *,
        curso:cursos!postulante_cursos_curso_id_fkey(
          id,
          titulo,
          descripcion,
          institucion,
          duracion,
          activo,
          created_at,
          updated_at
        )
      `
      )
      .eq('postulante_id', targetUserId)
      .order('fecha_asignacion', { ascending: false });

    if (error) {
      console.error('Error consultando cursos asignados al postulante:', error.message);
      return [];
    }

    if (!data) return [];

    return (data as unknown as Array<
      PostulanteCurso & {
        curso?: PostulanteCurso['curso'] | Array<NonNullable<PostulanteCurso['curso']>> | null;
      }
    >).map((row) => ({
      ...row,
      curso: (Array.isArray(row.curso) ? row.curso[0] : row.curso) || undefined,
    }));
  } catch (err) {
    console.error('Error inesperado consultando cursos del postulante:', err);
    return [];
  }
}


/**
 * Sube o actualiza la foto de perfil (avatar) del postulante en Supabase Storage
 */
export async function uploadAvatarPostulante(userId: string, file: File): Promise<{
  url?: string;
  error?: string;
}> {
  const supabase = createClient();
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `postulantes/${userId}/avatar_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('perfil')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      return { error: updateError.message };
    }

    return { url: publicUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al subir la foto de perfil';
    return { error: msg };
  }
}

/**
 * Elimina la foto de perfil del postulante
 */
export async function removeAvatarPostulante(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('perfil')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar foto de perfil';
    return { success: false, error: msg };
  }
}

/**
 * Obtiene ofertas laborales sugeridas para el postulante según sus rubros vinculados
 */
export async function getOfertasSugeridasPostulante(userId: string): Promise<any[]> {
  const supabase = createClient();
  try {
    // 1. Obtener los IDs de rubros del postulante
    const { data: rubrosPerfil } = await supabase
      .from('perfil_rubros')
      .select('rubro_id')
      .eq('perfil_id', userId);

    const rubroIds = (rubrosPerfil || []).map((r) => r.rubro_id);
    if (rubroIds.length === 0) return [];

    const hoy = new Date().toISOString().split('T')[0];

    // 2. Consultar ofertas publicadas que pertenezcan a esos rubros y no estén vencidas
    const { data: ofertas, error } = await supabase
      .from('ofertas')
      .select(`
        id,
        titulo,
        tipo_jornada,
        ubicacion,
        fecha_limite,
        rubro:rubros!jobs_rubro_id_fkey(nombre),
        empresa:empresas!ofertas_empresa_id_fkey(nombre_fantasia, razon_social, localidad, logo_url)
      `)
      .eq('estado', 'publicada')
      .is('deleted_at', null)
      .or(`fecha_limite.is.null,fecha_limite.gte.${hoy}`)
      .in('rubro_id', rubroIds)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.warn('Error al obtener ofertas sugeridas:', error);
      return [];
    }

    return ofertas || [];
  } catch (err) {
    console.error('Error getOfertasSugeridasPostulante:', err);
    return [];
  }
}
