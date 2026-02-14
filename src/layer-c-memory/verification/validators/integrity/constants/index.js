/**
 * @fileoverview Constants for integrity validation
 * @module verification/validators/integrity/constants
 */

/**
 * Esquema de campos requeridos por tipo de átomo
 */
export const ATOM_REQUIRED_FIELDS = [
  'id', 'name', 'type', 'filePath', 'line',
  'complexity', 'archetype', 'extractedAt'
];

/**
 * Esquema de campos requeridos por tipo de archivo
 */
export const FILE_REQUIRED_FIELDS = [
  'path', 'imports', 'exports', 'definitions'
];
