import { createClient } from '@/lib/supabase/client';
import type { Localidad } from '@/types/database';

/**
 * Lista canónica de respaldo en caso de que la conexión a Supabase falle
 * o antes de que se ejecute la migración en entornos locales.
 */
export const LOCALIDADES_CANONICAS_DEFAULT: Localidad[] = [
  { id: 1, nombre: 'Funes', provincia: 'Santa Fe', codigo_postal: '2132', activo: true, orden: 1 },
  { id: 2, nombre: 'Roldán', provincia: 'Santa Fe', codigo_postal: '2134', activo: true, orden: 2 },
  { id: 3, nombre: 'Rosario', provincia: 'Santa Fe', codigo_postal: '2000', activo: true, orden: 3 },
  { id: 4, nombre: 'San Jerónimo Sud', provincia: 'Santa Fe', codigo_postal: '2136', activo: true, orden: 4 },
  { id: 5, nombre: 'Ibarlucea', provincia: 'Santa Fe', codigo_postal: '2142', activo: true, orden: 5 },
  { id: 6, nombre: 'Pérez', provincia: 'Santa Fe', codigo_postal: '2121', activo: true, orden: 6 },
  { id: 7, nombre: 'Zavalla', provincia: 'Santa Fe', codigo_postal: '2123', activo: true, orden: 7 },
  { id: 8, nombre: 'Granadero Baigorria', provincia: 'Santa Fe', codigo_postal: '2152', activo: true, orden: 8 },
  { id: 9, nombre: 'Capitán Bermúdez', provincia: 'Santa Fe', codigo_postal: '2154', activo: true, orden: 9 },
  { id: 10, nombre: 'San Lorenzo', provincia: 'Santa Fe', codigo_postal: '2200', activo: true, orden: 10 },
  { id: 11, nombre: 'Fray Luis Beltrán', provincia: 'Santa Fe', codigo_postal: '2156', activo: true, orden: 11 },
  { id: 12, nombre: 'Villa Gobernador Gálvez', provincia: 'Santa Fe', codigo_postal: '2124', activo: true, orden: 12 },
  { id: 13, nombre: 'Casilda', provincia: 'Santa Fe', codigo_postal: '2170', activo: true, orden: 13 },
  { id: 14, nombre: 'Carcarañá', provincia: 'Santa Fe', codigo_postal: '2138', activo: true, orden: 14 },
  { id: 15, nombre: 'Pueblo Esther', provincia: 'Santa Fe', codigo_postal: '2126', activo: true, orden: 15 },
  { id: 16, nombre: 'Arroyo Seco', provincia: 'Santa Fe', codigo_postal: '2128', activo: true, orden: 16 },
  { id: 17, nombre: 'Ricardone', provincia: 'Santa Fe', codigo_postal: '2201', activo: true, orden: 17 },
  { id: 18, nombre: 'Correa', provincia: 'Santa Fe', codigo_postal: '2506', activo: true, orden: 18 },
  { id: 19, nombre: 'Cañada de Gómez', provincia: 'Santa Fe', codigo_postal: '2500', activo: true, orden: 19 },
  { id: 20, nombre: 'Victoria', provincia: 'Entre Ríos', codigo_postal: '3153', activo: true, orden: 20 },
  { id: 90, nombre: 'Otra localidad (Santa Fe)', provincia: 'Santa Fe', codigo_postal: null, activo: true, orden: 90 },
  { id: 91, nombre: 'Otra localidad (Otra provincia)', provincia: 'Otra', codigo_postal: null, activo: true, orden: 91 }
];

let cachedLocalidades: Localidad[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minuto en memoria cliente

/**
 * Obtiene todas las localidades activas desde Supabase,
 * ordenadas por `orden ASC, nombre ASC`.
 */
export async function getLocalidades(forceRefresh = false): Promise<Localidad[]> {
  const now = Date.now();
  if (!forceRefresh && cachedLocalidades && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedLocalidades;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('localidades')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });

    if (error || !data || data.length === 0) {
      // Si la tabla aún no existe o falla la consulta, retornamos la lista canónica de respaldo
      return LOCALIDADES_CANONICAS_DEFAULT;
    }

    cachedLocalidades = data as Localidad[];
    lastFetchTime = now;
    return cachedLocalidades;
  } catch (err) {
    console.warn('Advertencia al consultar tabla localidades, usando fallback:', err);
    return LOCALIDADES_CANONICAS_DEFAULT;
  }
}

/**
 * Normaliza el nombre de una localidad contra la lista canónica.
 * Devuelve el nombre oficial si coincide, o null si no es válida.
 */
export function normalizarNombreLocalidad(valor: string, lista: Localidad[] = LOCALIDADES_CANONICAS_DEFAULT): string | null {
  if (!valor || !valor.trim()) return null;
  const clean = valor.trim().toLowerCase();

  // Casos especiales frecuentes
  if (clean === 'funes' || clean.includes('funes')) return 'Funes';
  if (clean === 'roldan' || clean === 'roldán') return 'Roldán';
  if (clean === 'rosario') return 'Rosario';

  const match = lista.find((loc) => loc.nombre.toLowerCase() === clean);
  return match ? match.nombre : null;
}
