/**
 * Helpers para autenticación dual (Email / DNI) y presentación segura de datos.
 */

/**
 * Limpia cualquier caracter que no sea dígito numérico.
 */
export function cleanDni(val: string): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

/**
 * Determina si una cadena ingresada corresponde a un DNI argentino (7 u 8 dígitos).
 * Soporta números puros o con formato de puntos (ej: 38.123.456).
 */
export function isDniFormat(val: string): boolean {
  if (!val) return false;
  const digits = cleanDni(val);
  return digits.length >= 7 && digits.length <= 8;
}

/**
 * Enmascara un correo electrónico para proteger la privacidad del ciudadano
 * revelando únicamente los caracteres indispensables para su reconocimiento.
 * Ejemplos:
 *   juan.perez@gmail.com  -> j••••••z@gmail.com
 *   lu@funes.gob.ar       -> l•@funes.gob.ar
 *   a@b.com               -> a••••@b.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.trim().toLowerCase().split('@');
  if (!domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0]}••••@${domain}`;
  }

  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const dots = '•'.repeat(Math.min(Math.max(localPart.length - 2, 4), 6));

  return `${firstChar}${dots}${lastChar}@${domain}`;
}

/**
 * Determina si un correo corresponde a una casilla técnica sintética
 * generada por el Registro Asistido presencial sin correo externo.
 */
export function isSyntheticAsistidoEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return lower.endsWith('@postulante.funes.gob.ar') || lower.endsWith('@empleofunes.local');
}
