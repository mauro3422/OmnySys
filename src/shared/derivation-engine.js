/**
 * @fileoverview derivation-engine.js
 *
 * ⚠️  DEPRECATED: Este archivo se mantiene para backwards compatibility.
 *
 * El Derivation Engine ha sido refactorizado en el módulo:
 *   src/shared/derivation-engine/
 *
 * Por favor usa la nueva ubicación:
 *   import { DerivationCache, composeMolecularMetadata } from './derivation-engine/index.js';
 *
 * @deprecated Use derivation-engine/index.js instead
 * @module shared/derivation-engine
 */

// Re-export desde el nuevo módulo
export {
  // Core
  DerivationCache,
  composeMolecularMetadata,
  createComposer,
  validateAtoms,
  validateRule,
  
  // Rules
  moleculeArchetype,
  moleculeComplexity,
  moleculeRisk,
  moleculeExports,
  moleculeExportCount,
  moleculeFunctionCount,
  moleculeHasNetworkCalls,
  moleculeHasDomManipulation,
  moleculeHasStorageAccess,
  moleculeHasErrorHandling,
  moleculeHasAsyncPatterns,
  moleculeHasSideEffects,
  moleculeExternalCallCount,
  moleculeNetworkEndpoints,
  moleculeHasLifecycleHooks,
  moleculeHasCleanupPatterns,
  DerivationRules,
  
  // Version
  VERSION
} from './derivation-engine/index.js';

// Export default para compatibilidad
export { composeMolecularMetadata as default } from './derivation-engine/index.js';
