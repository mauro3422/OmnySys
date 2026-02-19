/**
 * @fileoverview Tests for Derivation Engine
 * 
 * Tests molecular derivation rules and caching mechanisms
 * following SSOT principles.
 * 
 * @module shared/__tests__/derivation-engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  DerivationRules, 
  DerivationCache, 
  composeMolecularMetadata,
  validateAtoms 
} from '../derivation-engine/index.js';

describe('DerivationRules', () => {
  describe('moleculeArchetype', () => {
    it('should detect network-hub from fragile-network atoms', () => {
      const atoms = [
        { archetype: { type: 'fragile-network' }, hasNetworkCalls: true },
        { archetype: { type: 'fragile-network' }, hasNetworkCalls: true }
      ];
      
      const result = DerivationRules.moleculeArchetype(atoms);
      
      assert.strictEqual(result.type, 'network-hub');
      assert.strictEqual(result.severity, 8);
      assert.strictEqual(result.confidence, 1.0);
    });

    it('should detect internal-module when no atoms are exported', () => {
      const atoms = [
        { isExported: false },
        { isExported: false },
        { isExported: false }
      ];
      
      const result = DerivationRules.moleculeArchetype(atoms);
      
      assert.strictEqual(result.type, 'internal-module');
      assert.strictEqual(result.severity, 3);
    });

    it('should detect critical-module with multiple hot-path atoms', () => {
      const atoms = [
        { archetype: { type: 'hot-path' }, isExported: true },
        { archetype: { type: 'hot-path' }, isExported: true }
      ];
      
      const result = DerivationRules.moleculeArchetype(atoms);
      
      assert.strictEqual(result.type, 'critical-module');
      assert.strictEqual(result.severity, 9);
    });

    it('should detect god-object from god-function atoms', () => {
      const atoms = [
        { archetype: { type: 'god-function' }, isExported: true }
      ];
      
      const result = DerivationRules.moleculeArchetype(atoms);
      
      assert.strictEqual(result.type, 'god-object');
      assert.strictEqual(result.severity, 10);
    });

    it('should default to standard for normal files', () => {
      const atoms = [
        { isExported: true },
        { isExported: false }
      ];
      
      const result = DerivationRules.moleculeArchetype(atoms);
      
      assert.strictEqual(result.type, 'standard');
      assert.strictEqual(result.severity, 1);
    });

    it('should handle empty atom array', () => {
      const result = DerivationRules.moleculeArchetype([]);
      
      assert.strictEqual(result.type, 'standard');
    });
  });

  describe('moleculeComplexity', () => {
    it('should sum complexity of all atoms', () => {
      const atoms = [
        { complexity: 5 },
        { complexity: 10 },
        { complexity: 3 }
      ];
      
      const result = DerivationRules.moleculeComplexity(atoms);
      
      assert.strictEqual(result, 18);
    });

    it('should handle atoms without complexity', () => {
      const atoms = [
        { complexity: 5 },
        {},
        { complexity: 3 }
      ];
      
      const result = DerivationRules.moleculeComplexity(atoms);
      
      assert.strictEqual(result, 8);
    });

    it('should return 0 for empty array', () => {
      const result = DerivationRules.moleculeComplexity([]);
      
      assert.strictEqual(result, 0);
    });
  });

  describe('moleculeRisk', () => {
    it('should return max severity from atoms', () => {
      const atoms = [
        { archetype: { severity: 3 } },
        { archetype: { severity: 8 } },
        { archetype: { severity: 5 } }
      ];
      
      const result = DerivationRules.moleculeRisk(atoms);
      
      assert.strictEqual(result, 8);
    });

    it('should return 0 for empty array', () => {
      const result = DerivationRules.moleculeRisk([]);
      
      assert.strictEqual(result, 0);
    });
  });

  describe('moleculeHasSideEffects', () => {
    it('should detect network side effects', () => {
      const atoms = [
        { hasNetworkCalls: true, hasDomManipulation: false, hasStorageAccess: false, hasLogging: false }
      ];
      
      const result = DerivationRules.moleculeHasSideEffects(atoms);
      
      assert.strictEqual(result, true);
    });

    it('should return false for pure functions', () => {
      const atoms = [
        { hasNetworkCalls: false, hasDomManipulation: false, hasStorageAccess: false, hasLogging: false }
      ];
      
      const result = DerivationRules.moleculeHasSideEffects(atoms);
      
      assert.strictEqual(result, false);
    });
  });
});

describe('DerivationCache', () => {
  it('should cache derivation results', () => {
    const cache = new DerivationCache();
    const atoms = [{ complexity: 5 }];
    
    const result1 = cache.derive('file1.js', atoms, 'moleculeComplexity');
    const result2 = cache.derive('file1.js', atoms, 'moleculeComplexity');
    
    assert.strictEqual(result1, 5);
    assert.strictEqual(result2, 5);
    assert.strictEqual(cache.cache.size, 1);
  });

  it('should invalidate derivations for changed atom', () => {
    const cache = new DerivationCache();
    const atoms = [{ id: 'atom1', complexity: 5 }];
    cache.derive('file1.js', atoms, 'moleculeComplexity');
    
    cache.invalidate('atom1');
    
    assert.strictEqual(cache.cache.size, 0);
  });
});

describe('composeMolecularMetadata', () => {
  it('should compose complete molecular metadata', () => {
    const atoms = [
      { 
        id: 'file.js::funcA',
        name: 'funcA',
        complexity: 5,
        isExported: true,
        hasNetworkCalls: true,
        archetype: { type: 'standard', severity: 1 }
      }
    ];
    
    const result = composeMolecularMetadata('file.js', atoms);
    
    assert.strictEqual(result.id, 'file.js');
    assert.strictEqual(result.type, 'molecule');
    assert.strictEqual(result.atomCount, 1);
    assert.strictEqual(result.totalComplexity, 5);
    assert.deepStrictEqual(result.exports, ['funcA']);
    assert.strictEqual(result.hasNetworkCalls, true);
    assert.strictEqual(result.archetype.type, 'standard');
    assert.ok(result.derivedAt);
  });
});

describe('validateAtoms', () => {
  it('should validate correct atoms', () => {
    const atoms = [
      { id: 'file.js::funcA', name: 'funcA', type: 'atom', complexity: 5 }
    ];
    
    const result = validateAtoms(atoms);
    
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it('should detect missing id', () => {
    const atoms = [{ name: 'funcA', type: 'atom' }];
    
    const result = validateAtoms(atoms);
    
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('missing id')));
  });
});
