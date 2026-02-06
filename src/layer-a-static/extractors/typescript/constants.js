/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes para extracción TypeScript
 * 
 * @module extractors/typescript/constants
 */

/**
 * Extensiones de archivos TypeScript
 * @constant {string[]}
 */
export const TS_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

/**
 * Tipos de constructos TypeScript
 * @readonly
 * @enum {string}
 */
export const TSConstructType = {
  INTERFACE: 'interface',
  TYPE: 'type',
  ENUM: 'enum',
  CLASS: 'class',
  GENERIC: 'generic'
};

/**
 * Patrones regex para extracción
 * @constant {Object}
 */
export const TS_PATTERNS = {
  interface: /interface\s+(\w+)(?:<[^>]+>)?\s*\{/g,
  type: /type\s+(\w+)(?:<[^>]+>)?\s*=/g,
  enum: /enum\s+(\w+)\s*\{/g,
  class: /class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?\s*\{/g,
  generic: /<[\s\w,]+>/g
};
