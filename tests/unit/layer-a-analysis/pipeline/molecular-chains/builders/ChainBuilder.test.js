/**
 * @fileoverview ChainBuilder.test.js
 * 
 * Tests for ChainBuilder - Complex chain building scenarios
 * 
 * @module tests/unit/molecular-chains/builders/ChainBuilder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChainBuilder } from '#molecular-chains/builders/ChainBuilder.js';
import { 
  ChainBuilderFactory, 
  MolecularChainsTestScenarios,
  MolecularChainsValidators 
} from '../molecular-chains-test.factory.js';

describe('ChainBuilder', () => {
  let factory;

  beforeEach(() => {
    factory = new ChainBuilderFactory();
  });

  // ============================================================================
  // Constructor and Basic Functionality
  // ============================================================================
  describe('constructor', () => {
    it('should create ChainBuilder with atoms array', () => {
      const atoms = [factory.createEntryPoint('main')];
      const builder = new ChainBuilder(atoms);
      
      expect(builder).toBeDefined();
      expect(builder.atoms).toEqual(atoms);
    });

    it('should index atoms by name', () => {
      factory.createEntryPoint('fn1');
      factory.createIntermediate('fn2', ['fn1'], []);
      
      const builder = new ChainBuilder(factory.getAtoms());
      
      expect(builder.atomByName.has('fn1')).toBe(true);
      expect(builder.atomByName.has('fn2')).toBe(true);
    });

    it('should index atoms by id', () => {
      const atom = factory.createEntryPoint('main');
      const builder = new ChainBuilder([atom]);
      
      expect(builder.atomById.has(atom.id)).toBe(true);
    });

    it('should initialize empty chains array', () => {
      const builder = new ChainBuilder([]);
      
      expect(builder.chains).toEqual([]);
    });
  });

  // ============================================================================
  // Entry Point Detection
  // ============================================================================
  describe('findEntryFunctions', () => {
    it('should identify exported functions as entry points', () => {
      factory.createEntryPoint('exportedFn');
      factory.createIntermediate('internalFn', ['exportedFn'], []);
      
      const builder = new ChainBuilder(factory.getAtoms());
      const entries = builder.findEntryFunctions();
      
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('exportedFn');
    });

    it('should identify functions with external callers as entry points', () => {
      factory.createAtom({
        name: 'externalCalled',
        calledBy: ['external::file::caller']
      });
      
      const builder = new ChainBuilder(factory.getAtoms());
      const entries = builder.findEntryFunctions();
      
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('externalCalled');
    });

    it('should identify orphan functions as entry points', () => {
      factory.createAtom({
        name: 'orphan',
        calledBy: [],
        isExported: false
      });
      
      const builder = new ChainBuilder(factory.getAtoms());
      const entries = builder.findEntryFunctions();
      
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('orphan');
    });

    it('should handle multiple entry points', () => {
      factory.createEntryPoint('entry1');
      factory.createEntryPoint('entry2');
      factory.createIntermediate('internal', ['entry1'], []);
      
      const builder = new ChainBuilder(factory.getAtoms());
      const entries = builder.findEntryFunctions();
      
      expect(entries).toHaveLength(2);
    });

    it('should not identify internal-only functions as entry points', () => {
      factory.createEntryPoint('entry');
      factory.createIntermediate('internal', ['entry'], []);
      
      const builder = new ChainBuilder(factory.getAtoms());
      const entries = builder.findEntryFunctions();
      
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('entry');
    });
  });

  // ============================================================================
  // Chain Building
  // ============================================================================
  describe('build', () => {
    it('should build chains from single entry point', () => {
      const { atoms } = MolecularChainsTestScenarios.linearChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      expect(result.chains).toBeDefined();
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it('should build chains with correct entry and exit functions', () => {
      const { atoms } = MolecularChainsTestScenarios.linearChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      const chain = result.chains[0];
      expect(chain.entryFunction).toBe('A');
      expect(chain.exitFunction).toBe('C');
    });

    it('should include all steps in chain', () => {
      const { atoms } = MolecularChainsTestScenarios.linearChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      const chain = result.chains[0];
      expect(chain.steps).toHaveLength(3);
      expect(chain.steps.map(s => s.function)).toEqual(['A', 'B', 'C']);
    });

    it('should generate unique chain IDs', () => {
      factory.createEntryPoint('entry1');
      factory.createEntryPoint('entry2');
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      const ids = result.chains.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should calculate total functions correctly', () => {
      const { atoms } = MolecularChainsTestScenarios.linearChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      expect(result.chains[0].totalFunctions).toBe(3);
    });

    it('should calculate complexity correctly', () => {
      factory.createEntryPoint('entry', { complexity: 5 });
      factory.createIntermediate('middle', ['entry'], [], { complexity: 3 });
      factory.createExit('exit', ['middle'], { complexity: 2 });
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      expect(result.chains[0].complexity).toBe(10);
    });

    it('should track side effects correctly', () => {
      factory.createEntryPoint('entry', { hasSideEffects: false });
      factory.createIntermediate('middle', ['entry'], [], { hasSideEffects: true });
      factory.createExit('exit', ['middle'], { hasSideEffects: false });
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      expect(result.chains[0].hasSideEffects).toBe(true);
    });

    it('should build summary with correct totals', () => {
      factory.createEntryPoint('entry1');
      factory.createEntryPoint('entry2');
      factory.createExit('exit1', ['entry1']);
      factory.createExit('exit2', ['entry2']);
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      expect(result.summary.totalChains).toBe(2);
      expect(result.summary.totalFunctions).toBe(4);
    });
  });

  // ============================================================================
  // Chain Merging
  // ============================================================================
  describe('mergeRelatedChains', () => {
    it('should merge chains with same entry point', () => {
      const { atoms } = MolecularChainsTestScenarios.branchingChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      // Should have merged chains from same entry
      const entryChains = result.chains.filter(c => c.entryFunction === 'A');
      expect(entryChains.length).toBeLessThanOrEqual(1);
    });

    it('should keep chains with different entry points separate', () => {
      factory.createEntryPoint('entry1');
      factory.createEntryPoint('entry2');
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      expect(result.chains.length).toBe(2);
    });
  });

  // ============================================================================
  // Complex Scenarios
  // ============================================================================
  describe('complex scenarios', () => {
    it('should handle diamond pattern correctly', () => {
      const { atoms, a, b, c, d } = MolecularChainsTestScenarios.diamondPattern();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      expect(result.chains.length).toBeGreaterThan(0);
      
      // Check that entry function is the diamond entry
      const entryChain = result.chains.find(c => c.entryFunction === 'A');
      expect(entryChain).toBeDefined();
    });

    it('should handle deep chains (10 levels)', () => {
      const { atoms } = MolecularChainsTestScenarios.deepChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      expect(result.chains.length).toBeGreaterThan(0);
      const chain = result.chains[0];
      expect(chain.steps.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle chains with data transformations', () => {
      const { atoms } = MolecularChainsTestScenarios.chainWithTransforms();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.chains[0].totalTransforms).toBeGreaterThan(0);
    });

    it('should handle converging chains', () => {
      const { atoms } = MolecularChainsTestScenarios.convergingChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      expect(result.chains.length).toBeGreaterThan(0);
      
      // Should have chains from both sources
      const chainsFromA = result.chains.find(c => c.entryFunction === 'A');
      const chainsFromB = result.chains.find(c => c.entryFunction === 'B');
      expect(chainsFromA || chainsFromB).toBeDefined();
    });

    it('should handle external dependencies correctly', () => {
      factory.createChainWithExternalDeps(
        'entry',
        ['externalLib', 'anotherLib'],
        ['internalFn']
      );
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      // Entry should still be identified correctly
      expect(result.chains.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('edge cases', () => {
    it('should handle empty atoms array', () => {
      const builder = new ChainBuilder([]);
      const result = builder.build();
      
      expect(result.chains).toEqual([]);
      expect(result.summary.totalChains).toBe(0);
    });

    it('should handle single atom', () => {
      factory.createEntryPoint('single');
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      expect(result.chains.length).toBe(1);
      expect(result.chains[0].steps).toHaveLength(1);
    });

    it('should detect circular references safely', () => {
      factory.createCircularChain(['A', 'B', 'C']);
      
      const builder = new ChainBuilder(factory.getAtoms());
      
      // Should not throw
      expect(() => builder.build()).not.toThrow();
      
      const result = builder.build();
      expect(result.chains.length).toBeGreaterThan(0);
    });

    it('should handle atoms with missing dataFlow', () => {
      factory.createAtom({
        name: 'incomplete',
        isExported: true,
        dataFlow: undefined
      });
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      expect(result.chains.length).toBeGreaterThan(0);
    });

    it('should handle atoms with missing calls array', () => {
      factory.createAtom({
        name: 'noCalls',
        isExported: true,
        calls: undefined
      });
      
      const builder = new ChainBuilder(factory.getAtoms());
      const result = builder.build();
      
      expect(result.chains.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Chain Validation
  // ============================================================================
  describe('chain validation', () => {
    it('should produce valid chain structures', () => {
      const { atoms } = MolecularChainsTestScenarios.linearChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      for (const chain of result.chains) {
        expect(MolecularChainsValidators.validateChain(chain)).toBe(true);
      }
    });

    it('should produce valid step structures', () => {
      const { atoms } = MolecularChainsTestScenarios.linearChain();
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      for (const chain of result.chains) {
        for (const step of chain.steps) {
          expect(MolecularChainsValidators.validateStep(step)).toBe(true);
        }
      }
    });
  });
});
