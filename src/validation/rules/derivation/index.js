/**
 * @fileoverview Derivation Validation Rules Index
 * 
 * Reglas de validación de Capa 2: Fractal Derivations
 * Verifican que las derivaciones matemáticas sean correctas.
 * 
 * @module validation/rules/derivation
 */

export { ComplexityCalculationRule } from './complexity-calculation.js';
export { RiskCalculationRule } from './risk-calculation.js';

// Colección de todas las reglas de derivación
export const DerivationRules = [
  (await import('./complexity-calculation.js')).default,
  (await import('./risk-calculation.js')).default
];

/**
 * Registra todas las reglas de derivación en un registry
 */
export function registerDerivationRules(registry) {
  DerivationRules.forEach(rule => registry.register(rule));
  return registry;
}

export default { DerivationRules, registerDerivationRules };
