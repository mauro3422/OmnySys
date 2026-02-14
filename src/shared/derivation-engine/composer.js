/**
 * @fileoverview Molecular Composer
 * 
 * Compone metadata molecular completa desde átomos.
 * 
 * @module derivation-engine/composer
 * @version 1.0.0
 */

import { DerivationRules } from './rules/index.js';
import { DerivationCache } from './cache.js';

/**
 * Compone metadata molecular completa desde átomos
 * @param {string} moleculeId - File path
 * @param {Array} atoms - Functions in the file
 * @param {DerivationCache} cache - Optional cache instance
 * @returns {Object} - Complete derived metadata
 */
export function composeMolecularMetadata(moleculeId, atoms, cache = null) {
  const derive = (ruleName) => {
    if (cache) {
      return cache.derive(moleculeId, atoms, ruleName);
    }
    const rule = DerivationRules[ruleName];
    if (!rule) {
      throw new Error(`Unknown derivation rule: ${ruleName}`);
    }
    return rule(atoms);
  };

  return {
    // Identity
    id: moleculeId,
    type: 'molecule',
    atomCount: atoms.length,

    // Derived archetype
    archetype: derive('moleculeArchetype'),

    // Derived complexity metrics
    totalComplexity: derive('moleculeComplexity'),
    riskScore: derive('moleculeRisk'),

    // Derived exports
    exports: derive('moleculeExports'),
    exportCount: derive('moleculeExportCount'),
    functionCount: derive('moleculeFunctionCount'),

    // Derived side effects
    hasSideEffects: derive('moleculeHasSideEffects'),
    hasNetworkCalls: derive('moleculeHasNetworkCalls'),
    hasDomManipulation: derive('moleculeHasDomManipulation'),
    hasStorageAccess: derive('moleculeHasStorageAccess'),
    networkEndpoints: derive('moleculeNetworkEndpoints'),

    // Derived error handling
    hasErrorHandling: derive('moleculeHasErrorHandling'),

    // Derived async patterns
    hasAsyncPatterns: derive('moleculeHasAsyncPatterns'),

    // Derived call graph
    externalCallCount: derive('moleculeExternalCallCount'),

    // Derived temporal
    hasLifecycleHooks: derive('moleculeHasLifecycleHooks'),
    hasCleanupPatterns: derive('moleculeHasCleanupPatterns'),

    // References (not derived)
    atoms: atoms.map(a => a.id),

    // Metadata
    derivedAt: new Date().toISOString(),
    derivationSource: 'atomic-composition'
  };
}

/**
 * Crea una instancia de composer con cache
 * @returns {Object} - Composer con cache
 */
export function createComposer() {
  const cache = new DerivationCache();
  
  return {
    compose: (moleculeId, atoms) => composeMolecularMetadata(moleculeId, atoms, cache),
    getStats: () => cache.getStats(),
    invalidate: (atomId) => cache.invalidate(atomId),
    clear: () => cache.clear()
  };
}

export default composeMolecularMetadata;
