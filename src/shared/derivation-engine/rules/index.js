/**
 * @fileoverview Derivation Rules - Index
 * 
 * Registro central de todas las reglas de derivación.
 * 
 * @module derivation-engine/rules
 * @version 1.0.0
 */

// Archetype rules
export { moleculeArchetype, ARCHETYPE_TYPES, getDefaultSeverity } from './archetype-rules.js';

// Complexity rules
export {
  moleculeComplexity,
  moleculeRisk,
  moleculeCognitiveComplexity,
  moleculeCyclomaticComplexity,
  calculateComplexityStats,
  classifyComplexity
} from './complexity-rules.js';

// Export rules
export {
  moleculeExports,
  moleculeExportCount,
  moleculeFunctionCount,
  moleculeExportDetails,
  moleculeExportRatio,
  isUtilityModule
} from './export-rules.js';

// Side effect rules
export {
  moleculeHasNetworkCalls,
  moleculeHasDomManipulation,
  moleculeHasStorageAccess,
  moleculeHasErrorHandling,
  moleculeHasAsyncPatterns,
  moleculeHasSideEffects,
  moleculeExternalCallCount,
  moleculeNetworkEndpoints,
  moleculeHasLogging,
  moleculeHasDatabaseOperations,
  moleculeHasFileSystemOperations
} from './side-effect-rules.js';

// Lifecycle rules
export {
  moleculeHasLifecycleHooks,
  moleculeHasCleanupPatterns,
  moleculeHasEventListeners,
  moleculeHasEventEmitters,
  moleculeHasTimers,
  moleculeHasSubscriptions
} from './lifecycle-rules.js';

/**
 * Registro completo de reglas de derivación
 * Cada regla es una función (atoms) => derivedValue
 */
export const DerivationRules = {
  // Archetype
  moleculeArchetype: (await import('./archetype-rules.js')).moleculeArchetype,
  
  // Complexity
  moleculeComplexity: (await import('./complexity-rules.js')).moleculeComplexity,
  moleculeRisk: (await import('./complexity-rules.js')).moleculeRisk,
  
  // Exports
  moleculeExports: (await import('./export-rules.js')).moleculeExports,
  moleculeExportCount: (await import('./export-rules.js')).moleculeExportCount,
  moleculeFunctionCount: (await import('./export-rules.js')).moleculeFunctionCount,
  
  // Side effects
  moleculeHasNetworkCalls: (await import('./side-effect-rules.js')).moleculeHasNetworkCalls,
  moleculeHasDomManipulation: (await import('./side-effect-rules.js')).moleculeHasDomManipulation,
  moleculeHasStorageAccess: (await import('./side-effect-rules.js')).moleculeHasStorageAccess,
  moleculeHasErrorHandling: (await import('./side-effect-rules.js')).moleculeHasErrorHandling,
  moleculeHasAsyncPatterns: (await import('./side-effect-rules.js')).moleculeHasAsyncPatterns,
  moleculeHasSideEffects: (await import('./side-effect-rules.js')).moleculeHasSideEffects,
  moleculeExternalCallCount: (await import('./side-effect-rules.js')).moleculeExternalCallCount,
  moleculeNetworkEndpoints: (await import('./side-effect-rules.js')).moleculeNetworkEndpoints,
  
  // Lifecycle
  moleculeHasLifecycleHooks: (await import('./lifecycle-rules.js')).moleculeHasLifecycleHooks,
  moleculeHasCleanupPatterns: (await import('./lifecycle-rules.js')).moleculeHasCleanupPatterns
};

/**
 * Lista de todas las reglas disponibles
 * @returns {Array<string>} - Nombres de reglas
 */
export function getAvailableRules() {
  return Object.keys(DerivationRules);
}

/**
 * Verifica si una regla existe
 * @param {string} ruleName - Nombre de la regla
 * @returns {boolean} - True si existe
 */
export function hasRule(ruleName) {
  return ruleName in DerivationRules;
}
