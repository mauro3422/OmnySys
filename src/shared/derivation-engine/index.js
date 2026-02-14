/**
 * @fileoverview Derivation Engine - Module Index
 * 
 * Derivation Engine v2.0 - Composes molecule metadata from atoms.
 * 
 * @module derivation-engine
 * @version 2.0.0
 */

// Core classes
export { DerivationCache } from './cache.js';
export { composeMolecularMetadata, createComposer } from './composer.js';
export { validateAtoms, validateRule, validateAllRules } from './validator.js';

// Rules
export {
  // Archetype
  moleculeArchetype,
  ARCHETYPE_TYPES,
  getDefaultSeverity,
  
  // Complexity
  moleculeComplexity,
  moleculeRisk,
  moleculeCognitiveComplexity,
  moleculeCyclomaticComplexity,
  calculateComplexityStats,
  classifyComplexity,
  
  // Exports
  moleculeExports,
  moleculeExportCount,
  moleculeFunctionCount,
  moleculeExportDetails,
  moleculeExportRatio,
  isUtilityModule,
  
  // Side effects
  moleculeHasNetworkCalls,
  moleculeHasDomManipulation,
  moleculeHasStorageAccess,
  moleculeHasErrorHandling,
  moleculeHasAsyncPatterns,
  moleculeHasSideEffects,
  moleculeExternalCallCount,
  moleculeNetworkEndpoints,
  
  // Lifecycle
  moleculeHasLifecycleHooks,
  moleculeHasCleanupPatterns,
  moleculeHasEventListeners,
  moleculeHasEventEmitters,
  moleculeHasTimers,
  moleculeHasSubscriptions,
  
  // Registry
  DerivationRules,
  getAvailableRules,
  hasRule
} from './rules/index.js';

// Version
export const VERSION = '2.0.0';
