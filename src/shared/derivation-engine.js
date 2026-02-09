/**
 * @fileoverview derivation-engine.js
 *
 * Derivation Engine - Composes molecule (file) metadata from atoms (functions)
 *
 * CORE PRINCIPLE: Files have NO metadata of their own - they are DERIVED from functions
 *
 * ARCHITECTURE: Layer B (Semantic Derivation) → Layer C (Molecular Composition)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Derivation Rules
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new molecular property derived from atoms:
 *
 * 1️⃣  ADD RULE to DerivationRules object (line ~16-227)
 *
 *     POSITION: Add after existing rules, before moleculeNetworkEndpoints
 *
 *     PATTERN:
 *     moleculeYourProperty: (atoms) => {
 *       // Derivation logic here
 *       return computedValue;
 *     },
 *
 * 2️⃣  EXAMPLE - Adding Security Risk Score:
 *
 *     moleculeSecurityRisk: (atoms) => {
 *       // Count atoms with security issues
 *       const vulnerableAtoms = atoms.filter(a => 
 *         a.hasSQLInjection || a.hasXSSVulnerability
 *       );
 *       
 *       if (vulnerableAtoms.length === 0) return 0;
 *       
 *       // Risk = number of vulnerable atoms * max severity
 *       const maxSeverity = Math.max(...vulnerableAtoms.map(a => 
 *         a.hasSQLInjection ? 9 : 7
 *       ));
 *       
 *       return {
 *         score: vulnerableAtoms.length * maxSeverity,
 *         vulnerableFunctions: vulnerableAtoms.map(a => a.name),
 *         severity: maxSeverity > 8 ? 'critical' : 'high'
 *       };
 *     },
 *
 * 3️⃣  UPDATE composeMolecularMetadata() (line ~332-385)
 *     Add the derived property to the returned object:
 *
 *     return {
 *       // ... existing properties ...
 *       
 *       // NEW: Security risk
 *       securityRisk: derive('moleculeSecurityRisk'),
 *     };
 *
 * 4️⃣  UPDATE MOLECULAR ARCHETYPES (line ~22-75)
 *     If the new property affects archetype detection:
 *
 *     moleculeArchetype: (atoms) => {
 *       // ... existing rules ...
 *       
 *       // NEW: High security risk → vulnerable-module
 *       const securityRisk = DerivationRules.moleculeSecurityRisk(atoms);
 *       if (securityRisk.severity === 'critical') {
 *         return {
 *           type: 'vulnerable-module',
 *           severity: 10,
 *           confidence: 0.95,
 *           source: 'security-analysis'
 *         };
 *       }
 *       
 *       // ... rest of rules ...
 *     },
 *
 * ⚠️  PRINCIPLES TO MAINTAIN:
 *     ✓ SSOT: DerivationRules is the ONLY source for molecular properties
 *     ✓ Pure functions: (atoms) => result - no external dependencies
 *     ✓ Deterministic: Same atoms always produce same derivation
 *     ✓ Composable: Rules can call other rules (DerivationRules.moleculeX(atoms))
 *     ✓ No Layer A logic: Only derive from existing atom metadata
 *
 * 🔗  RELATED FILES:
 *     - molecular-extractor.js: Where atom metadata is created
 *     - query/queries/file-query.js: Where derivations are consumed
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module shared/derivation-engine
 * @phase 2 (Molecular Derivation)
 * @dependencies NONE (pure functions, no imports)
 */

/**
 * Derivation Rules for Molecular Composition
 *
 * Each rule takes atoms (functions) and derives molecule (file) properties
 */
export const DerivationRules = {
  /**
   * Archetype molecular se infiere de arquetipos atómicos
   * @param {Array} atoms - Functions in the file
   * @returns {Object} - Derived archetype
   */
  moleculeArchetype: (atoms) => {
    const atomArchetypes = atoms.map(a => a.archetype?.type).filter(Boolean);
    const exportedAtoms = atoms.filter(a => a.isExported);
    const networkAtoms = atoms.filter(a => a.hasNetworkCalls);

    // Rule 1: If has fragile-network atoms + multiple network calls → network-hub
    if (atomArchetypes.includes('fragile-network') && networkAtoms.length >= 2) {
      return {
        type: 'network-hub',
        severity: 8,
        confidence: 1.0,
        source: 'atomic-composition'
      };
    }

    // Rule 2: If all atoms are private (not exported) → internal-module
    if (atoms.length > 0 && exportedAtoms.length === 0) {
      return {
        type: 'internal-module',
        severity: 3,
        confidence: 1.0,
        source: 'atomic-composition'
      };
    }

    // Rule 3: If has multiple hot-path atoms → critical-module
    const hotPathCount = atomArchetypes.filter(t => t === 'hot-path').length;
    if (hotPathCount >= 2) {
      return {
        type: 'critical-module',
        severity: 9,
        confidence: 1.0,
        source: 'atomic-composition'
      };
    }

    // Rule 4: If has god-function → likely god-object at file level
    if (atomArchetypes.includes('god-function')) {
      return {
        type: 'god-object',
        severity: 10,
        confidence: 0.9,
        source: 'atomic-inference'
      };
    }

    // Default: standard module
    return {
      type: 'standard',
      severity: 1,
      confidence: 1.0,
      source: 'atomic-default'
    };
  },

  /**
   * Complejidad molecular = suma de complejidades atómicas
   * @param {Array} atoms - Functions in the file
   * @returns {number} - Total complexity
   */
  moleculeComplexity: (atoms) => {
    return atoms.reduce((sum, atom) => sum + (atom.complexity || 0), 0);
  },

  /**
   * Riesgo molecular = máximo riesgo atómico
   * @param {Array} atoms - Functions in the file
   * @returns {number} - Max severity score
   */
  moleculeRisk: (atoms) => {
    if (atoms.length === 0) return 0;
    return Math.max(...atoms.map(a => a.archetype?.severity || 0));
  },

  /**
   * Exports molecular = átomos exportados
   * @param {Array} atoms - Functions in the file
   * @returns {Array<string>} - Exported function names
   */
  moleculeExports: (atoms) => {
    return atoms
      .filter(a => a.isExported)
      .map(a => a.name);
  },

  /**
   * Export count molecular = count de átomos exportados
   * @param {Array} atoms - Functions in the file
   * @returns {number} - Export count
   */
  moleculeExportCount: (atoms) => {
    return atoms.filter(a => a.isExported).length;
  },

  /**
   * Function count molecular = count total de átomos
   * @param {Array} atoms - Functions in the file
   * @returns {number} - Function count
   */
  moleculeFunctionCount: (atoms) => {
    return atoms.length;
  },

  /**
   * Network calls = OR lógico de átomos
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - Has network calls
   */
  moleculeHasNetworkCalls: (atoms) => {
    return atoms.some(a => a.hasNetworkCalls);
  },

  /**
   * DOM manipulation = OR lógico de átomos
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - Has DOM manipulation
   */
  moleculeHasDomManipulation: (atoms) => {
    return atoms.some(a => a.hasDomManipulation);
  },

  /**
   * Storage access = OR lógico de átomos
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - Has storage access
   */
  moleculeHasStorageAccess: (atoms) => {
    return atoms.some(a => a.hasStorageAccess);
  },

  /**
   * Error handling = AND lógico (todos tienen error handling)
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - All have error handling
   */
  moleculeHasErrorHandling: (atoms) => {
    if (atoms.length === 0) return false;
    return atoms.every(a => a.hasErrorHandling === true);
  },

  /**
   * Async patterns = OR lógico
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - Has async patterns
   */
  moleculeHasAsyncPatterns: (atoms) => {
    return atoms.some(a => a.isAsync === true);
  },

  /**
   * Side effects = OR de átomos con side effects
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - Has side effects
   */
  moleculeHasSideEffects: (atoms) => {
    return atoms.some(a =>
      a.hasNetworkCalls ||
      a.hasDomManipulation ||
      a.hasStorageAccess ||
      a.hasLogging
    );
  },

  /**
   * External call count = suma de external calls de átomos
   * @param {Array} atoms - Functions in the file
   * @returns {number} - Total external calls
   */
  moleculeExternalCallCount: (atoms) => {
    return atoms.reduce((sum, atom) =>
      sum + (atom.calls?.filter(c => c.type === 'external').length || 0), 0
    );
  },

  /**
   * Lifecycle hooks = OR de átomos con hooks
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - Has lifecycle hooks
   */
  moleculeHasLifecycleHooks: (atoms) => {
    return atoms.some(a => a.hasLifecycleHooks === true);
  },

  /**
   * Cleanup patterns = AND (todos tienen cleanup)
   * @param {Array} atoms - Functions in the file
   * @returns {boolean} - All have cleanup
   */
  moleculeHasCleanupPatterns: (atoms) => {
    const hooksAtoms = atoms.filter(a => a.hasLifecycleHooks);
    if (hooksAtoms.length === 0) return false;
    return hooksAtoms.every(a => a.hasCleanupPatterns === true);
  },

  /**
   * Network endpoints = union de endpoints de átomos
   * @param {Array} atoms - Functions in the file
   * @returns {Array<string>} - Unique endpoints
   */
  moleculeNetworkEndpoints: (atoms) => {
    const allEndpoints = atoms
      .flatMap(a => a.networkEndpoints || [])
      .filter(Boolean);
    return [...new Set(allEndpoints)];
  }
};

/**
 * Derivation Cache - Evita recalcular derivaciones
 */
export class DerivationCache {
  constructor() {
    this.cache = new Map();
    this.dependencyGraph = new Map(); // atom ID → Set<cacheKey>
  }

  /**
   * Deriva una propiedad molecular desde átomos
   * @param {string} moleculeId - Molecule identifier
   * @param {Array} atoms - Functions in the molecule
   * @param {string} ruleName - Name of derivation rule
   * @returns {*} - Derived value
   */
  derive(moleculeId, atoms, ruleName) {
    const cacheKey = `${moleculeId}::${ruleName}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Apply rule
    const rule = DerivationRules[ruleName];
    if (!rule) {
      throw new Error(`Unknown derivation rule: ${ruleName}`);
    }

    const result = rule(atoms);
    this.cache.set(cacheKey, result);

    // Register dependencies for invalidation
    for (const atom of atoms) {
      if (!this.dependencyGraph.has(atom.id)) {
        this.dependencyGraph.set(atom.id, new Set());
      }
      this.dependencyGraph.get(atom.id).add(cacheKey);
    }

    return result;
  }

  /**
   * Invalida todas las derivaciones que dependen de un átomo
   * @param {string} atomId - Atom identifier that changed
   */
  invalidate(atomId) {
    const affected = this.dependencyGraph.get(atomId) || new Set();
    for (const cacheKey of affected) {
      this.cache.delete(cacheKey);
    }

    // También limpiar del dependency graph
    this.dependencyGraph.delete(atomId);
  }

  /**
   * Invalida todas las derivaciones de una molécula
   * @param {string} moleculeId - Molecule identifier
   */
  invalidateMolecule(moleculeId) {
    const keysToDelete = [];
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${moleculeId}::`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Limpia toda la cache
   */
  clear() {
    this.cache.clear();
    this.dependencyGraph.clear();
  }

  /**
   * Obtiene estadísticas de la cache
   * @returns {Object} - Cache stats
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      dependencyCount: this.dependencyGraph.size,
      hitRate: this._hitRate || 0
    };
  }
}

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
    return DerivationRules[ruleName](atoms);
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
 * Valida que los átomos tengan la metadata requerida
 * @param {Array} atoms - Functions to validate
 * @returns {Object} - Validation result
 */
export function validateAtoms(atoms) {
  const errors = [];
  const warnings = [];

  for (const atom of atoms) {
    // Required fields
    if (!atom.id) errors.push(`Atom missing id`);
    if (!atom.name) errors.push(`Atom ${atom.id} missing name`);
    if (atom.complexity === undefined) warnings.push(`Atom ${atom.id} missing complexity`);

    // Type consistency
    if (atom.type !== 'atom') {
      errors.push(`Atom ${atom.id} has wrong type: ${atom.type}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
