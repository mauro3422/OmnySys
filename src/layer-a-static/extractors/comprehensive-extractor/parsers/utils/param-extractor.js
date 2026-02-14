/**
 * @fileoverview Parameter Extractor - Extracción de parámetros de funciones
 * 
 * @module parsers/utils
 */

/**
 * Extract parameters from function signature
 * @param {string} funcSignature - Function signature string
 * @returns {Array} Parameters
 */
export function extractParams(funcSignature) {
  const match = funcSignature.match(/\(([^)]*)\)/);
  if (!match) return [];
  
  return match[1].split(',').map(p => {
    const trimmed = p.trim();
    const parts = trimmed.split(/\s*:\s*/);
    return {
      name: parts[0].replace(/[^\w]/g, ''),
      type: parts[1] || null,
      hasDefault: trimmed.includes('='),
      isOptional: trimmed.includes('?'),
      isRest: trimmed.startsWith('...')
    };
  }).filter(p => p.name);
}

/**
 * Extract return type from function signature
 * @param {string} funcSignature - Function signature
 * @returns {string|null} Return type
 */
export function extractReturnType(funcSignature) {
  const match = funcSignature.match(/\)\s*:\s*([^{]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Check if function is async
 * @param {string} funcSignature - Function signature
 * @returns {boolean}
 */
export function isAsyncFunction(funcSignature) {
  return /^\s*async\s/.test(funcSignature);
}

/**
 * Check if function is generator
 * @param {string} funcSignature - Function signature
 * @returns {boolean}
 */
export function isGeneratorFunction(funcSignature) {
  return /\*/.test(funcSignature);
}
