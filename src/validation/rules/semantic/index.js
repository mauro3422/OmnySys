/**
 * @fileoverview Semantic Validation Rules Index
 * 
 * Reglas de validación de Capa 3: Semantic
 * Verifican que el data flow tenga sentido.
 * 
 * @module validation/rules/semantic
 */

export { ExportUsageRule } from './export-usage.js';

// Colección de todas las reglas semánticas
export const SemanticRules = [
  (await import('./export-usage.js')).default
];

/**
 * Registra todas las reglas semánticas en un registry
 */
export function registerSemanticRules(registry) {
  SemanticRules.forEach(rule => registry.register(rule));
  return registry;
}

export default { SemanticRules, registerSemanticRules };
