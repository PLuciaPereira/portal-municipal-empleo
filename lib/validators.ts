/**
 * Módulo de validaciones y formateo de datos para el Portal de Empleo Funes.
 */

/**
 * Aplica máscara automática XX-XXXXXXXX-X para CUIT de hasta 11 dígitos.
 */
export function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 10) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/**
 * Valida un CUIT argentino mediante el algoritmo oficial de Módulo 11.
 * Prefijos válidos: 20, 23, 24, 27, 30, 33, 34.
 *
 * NOTA: Por requerimiento de UX/seguridad, el mensaje de error no expone
 * cuál era el dígito esperado.
 */
export function validateCuitModulo11(cuit: string): { isValid: boolean; message?: string } {
  const clean = cuit.replace(/\D/g, '');

  if (clean.length !== 11) {
    return {
      isValid: false,
      message: 'El CUIT debe tener exactamente 11 dígitos numéricos.',
    };
  }

  const prefijo = clean.substring(0, 2);
  const prefijosValidos = ['20', '23', '24', '27', '30', '33', '34'];
  if (!prefijosValidos.includes(prefijo)) {
    return {
      isValid: false,
      message: 'El prefijo del CUIT no es válido.',
    };
  }

  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(clean[i], 10) * multiplicadores[i];
  }

  const resto = suma % 11;
  let digitoCalculado = 11 - resto;
  if (digitoCalculado === 11) {
    digitoCalculado = 0;
  } else if (digitoCalculado === 10) {
    digitoCalculado = 9;
  }

  const digitoReal = parseInt(clean[10], 10);
  if (digitoCalculado !== digitoReal) {
    return {
      isValid: false,
      message: 'El CUIT ingresado no es válido (dígito verificador incorrecto).',
    };
  }

  return { isValid: true };
}

/**
 * Valida formato estándar de correo electrónico.
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida que el teléfono tenga al menos 8 dígitos numéricos.
 */
export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8;
}

/**
 * Valida que la contraseña cumpla con el mínimo de 6 caracteres.
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Valida URL opcional (sitio web o perfil de red social).
 * Acepta formatos con y sin protocolo (ej: 'instagram.com/miempresa', 'https://empresa.com.ar').
 * Si está vacía o solo contiene espacios, se considera válida (campo opcional).
 */
export function validateUrl(url?: string): boolean {
  if (!url || !url.trim()) {
    return true;
  }
  const trimmed = url.trim();
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i;
  return urlRegex.test(trimmed);
}

/**
 * Aplica máscara automática con puntos para DNI argentino de 7 u 8 dígitos.
 * Limita el valor numérico a un máximo de 8 dígitos y agrupa los millares de atrás hacia adelante.
 * Ej: '38123456' -> '38.123.456', '8123456' -> '8.123.456'.
 */
export function formatDni(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Valida que el DNI contenga 7 u 8 dígitos numéricos válidos tras remover puntos y caracteres no numéricos.
 */
export function validateDni(value: string): { isValid: boolean; message?: string } {
  if (!value) {
    return { isValid: false, message: 'Ingresá tu número de DNI.' };
  }
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) {
    return { isValid: false, message: 'Ingresá tu número de DNI.' };
  }
  if (clean.length < 7 || clean.length > 8) {
    return { isValid: false, message: 'El DNI debe tener 7 u 8 dígitos numéricos válidos.' };
  }
  return { isValid: true };
}

