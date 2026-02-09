/**
 * @fileoverview Source Validation Rules Index
 * 
 * Reglas de validación de Capa 1: Ground Truth
 * Verifican que los datos extraídos coincidan con el código fuente real.
 * 
 * @module validation/rules/source
 */

export { FileExistenceRule } from './file-existence.js';
export { ExportConsistencyRule } from './export-consistency.js';
export { ImportResolutionRule } from './import-resolution.js';

// Colección de todas las reglas source
export const SourceRules = [
  (await import('./file-existence.js')).default,
  (await import('./export-consistency.js')).default,
  (await import('./import-resolution.js')).default
];

/**
 * Registra todas las reglas source en un registry
 */
export function registerSourceRules(registry) {
  SourceRules.forEach(rule => registry.register(rule));
  return registry;
}

export default { SourceRules, registerSourceRules };
