/**
 * @fileoverview Test helpers para probar classifyUtilityHelperDuplicate
 * 
 * Estos helpers son duplicados intencionales para testear la detección
 */

// Helper 1: Validación de email (debería ser detectado como utility helper)
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper 2: Normalización de strings (debería ser detectado como utility helper)
export function normalizeString(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Helper 3: Formateo de fecha (debería ser detectado como utility helper)
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) {
    return '';
  }
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

// Helper 4: Parseo de JSON seguro (debería ser detectado como utility helper)
export function safeJsonParse(json, defaultValue = null) {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

// Helper 5: Obtener propiedad anidada (debería ser detectado como utility helper)
export function getNestedProperty(obj, path, defaultValue = undefined) {
  if (!obj || !path) {
    return defaultValue;
  }
  
  return path.split('.').reduce((acc, key) => {
    return acc?.[key];
  }, obj) ?? defaultValue;
}
