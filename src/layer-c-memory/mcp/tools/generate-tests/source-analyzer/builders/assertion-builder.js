/**
 * @fileoverview Assertion Builder - Construye assertions específicas
 */

import { extractObjectFields } from '../parsers/object-parser.js';

/**
 * Construye una assertion específica a partir del valor literal retornado
 * @param {string} value - Valor literal
 * @returns {string} - Assertion correspondiente
 */
export function buildAssertionFromReturnValue(value) {
  if (value === 'true')  return 'expect(result).toBe(true)';
  if (value === 'false') return 'expect(result).toBe(false)';
  if (value === 'null')  return 'expect(result).toBeNull()';
  if (value === '0')     return 'expect(result).toBe(0)';
  if (/^\d+$/.test(value)) return `expect(result).toBe(${value})`;
  if (value.startsWith('"') || value.startsWith("'")) {
    // Literal string conocido — verificar valor exacto si es corto
    const inner = value.slice(1, -1);
    if (inner.length <= 20 && /^[\w\-]+$/.test(inner)) return `expect(result).toBe(${value})`;
    return 'expect(typeof result).toBe("string")';
  }
  if (value.startsWith('[')) return 'expect(Array.isArray(result)).toBe(true)';
  if (value.startsWith('{')) {
    // Intentar extraer campos conocidos del objeto literal
    const fields = extractObjectFields(value);
    if (fields.length > 0) {
      const containsExpr = fields.map(f => `${f.key}: ${f.assertion}`).join(', ');
      return `expect(result).toEqual(expect.objectContaining({ ${containsExpr} }))`;
    }
    return 'expect(result).toEqual(expect.objectContaining({}))';
  }
  return 'expect(result).toBeDefined()';
}
