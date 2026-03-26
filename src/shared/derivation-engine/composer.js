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
  const resolveDerivedValue = (ruleName) => {
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
    archetype: resolveDerivedValue('moleculeArchetype'),

    // Derived complexity metrics
    totalComplexity: resolveDerivedValue('moleculeComplexity'),
    riskScore: resolveDerivedValue('moleculeRisk'),

    // Derived exports
    exports: resolveDerivedValue('moleculeExports'),
    exportCount: resolveDerivedValue('moleculeExportCount'),
    functionCount: resolveDerivedValue('moleculeFunctionCount'),

    // Derived side effects
    hasSideEffects: resolveDerivedValue('moleculeHasSideEffects'),
    hasNetworkCalls: resolveDerivedValue('moleculeHasNetworkCalls'),
    hasDomManipulation: resolveDerivedValue('moleculeHasDomManipulation'),
    hasStorageAccess: resolveDerivedValue('moleculeHasStorageAccess'),
    networkEndpoints: resolveDerivedValue('moleculeNetworkEndpoints'),

    // Derived error handling
    hasErrorHandling: resolveDerivedValue('moleculeHasErrorHandling'),

    // Derived async patterns
    hasAsyncPatterns: resolveDerivedValue('moleculeHasAsyncPatterns'),

    // Derived call graph
    externalCallCount: resolveDerivedValue('moleculeExternalCallCount'),

    // Derived temporal
    hasLifecycleHooks: resolveDerivedValue('moleculeHasLifecycleHooks'),
    hasCleanupPatterns: resolveDerivedValue('moleculeHasCleanupPatterns'),

    // References (not derived)
    atoms: atoms.map(a => a.id),

    // Metadata
    derivedAt: new Date().toISOString(),
    derivationSource: 'atomic-composition'
  };
}

import { statsPool } from '../../shared/utils/stats-pool.js';

// Registrar en StatsPool si no está registrado
if (!statsPool.providers.has('molecular_composer')) {
  statsPool.registerProvider('molecular_composer', () => ({
    type: 'derivation-engine',
    version: '1.0.0'
  }));
}

/**
 * Crea una instancia de composer con cache
 * @returns {Object} - Composer con cache
 */
export function createComposer() {
  const cache = new DerivationCache();

  return {
    compose: (moleculeId, atoms) => composeMolecularMetadata(moleculeId, atoms, cache),
    getDerivationCacheStats: () => cache.getDerivationCacheStats(),
    invalidate: (atomId) => cache.invalidate(atomId),
    purge: () => cache.purge()
  };
}

export default composeMolecularMetadata;
