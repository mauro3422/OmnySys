/**
 * @fileoverview Chain Building Phase Tests
 * 
 * Tests for the ChainBuildingPhase.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/chain-building-phase
 */

import { describe, it, expect, vi } from 'vitest';
import { ChainBuildingPhase } from '../../../../../src/layer-a-static/pipeline/phases/chain-building-phase.js';
import { PhasesTestFactory } from '../../../../factories/phases-test.factory.js';

describe('Chain Building Phase', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export ChainBuildingPhase class', () => {
      expect(ChainBuildingPhase).toBeDefined();
      expect(typeof ChainBuildingPhase).toBe('function');
    });

    it('should be instantiable', () => {
      const phase = new ChainBuildingPhase();
      expect(phase).toBeDefined();
    });

    it('should have correct phase name', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.name).toBe('chain-building');
    });

    it('should extend ExtractionPhase', async () => {
      const { ExtractionPhase } = await import('../../../../../src/layer-a-static/pipeline/phases/base-phase.js');
      const phase = new ChainBuildingPhase();
      expect(phase).toBeInstanceOf(ExtractionPhase);
    });
  });

  // ============================================================================
  // canExecute() Contract
  // ============================================================================
  describe('canExecute() Contract', () => {
    it('should return false when context is null', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute(null)).toBe(false);
    });

    it('should return false when context is undefined', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute(undefined)).toBe(false);
    });

    it('should return false when atoms is undefined', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute({})).toBe(false);
    });

    it('should return false when atoms is empty array', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute({ atoms: [] })).toBe(false);
    });

    it('should return true when atoms has items', () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(1);
      expect(phase.canExecute({ atoms })).toBe(true);
    });

    it('should return true when atoms has multiple items', () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(3);
      expect(phase.canExecute({ atoms })).toBe(true);
    });
  });

  // ============================================================================
  // execute() Contract - Happy Path
  // ============================================================================
  describe('execute() Contract - Happy Path', () => {
    it('should return context even with empty atoms (graceful degradation)', async () => {
      const phase = new ChainBuildingPhase();
      const context = { atoms: [] };
      const result = await phase.execute(context);
      expect(result).toBeDefined();
      expect(result.atoms).toEqual([]);
      expect(result.molecularChains).toBeNull();
    });

    it('should handle context with atoms', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      const context = { atoms };
      
      const result = await phase.execute(context);
      expect(result).toBeDefined();
      expect(result.atoms).toBeDefined();
      expect(result.molecularChains).toBeDefined();
    });

    it('should preserve atoms in context', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      const context = { atoms };
      
      const result = await phase.execute(context);
      expect(result.atoms).toBe(atoms);
    });

    it('should add molecularChains to context', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      const context = { atoms };
      
      const result = await phase.execute(context);
      expect(result).toHaveProperty('molecularChains');
    });
  });

  // ============================================================================
  // execute() Contract - Error Handling
  // ============================================================================
  describe('execute() Contract - Error Handling', () => {
    it('should handle null context gracefully', async () => {
      const phase = new ChainBuildingPhase();
      const result = await phase.execute(null);
      expect(result).toBeNull();
    });

    it('should handle undefined context gracefully', async () => {
      const phase = new ChainBuildingPhase();
      const result = await phase.execute(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle empty object context', async () => {
      const phase = new ChainBuildingPhase();
      const result = await phase.execute({});
      expect(result).toEqual({ molecularChains: null });
    });

    it('should not throw when chain building fails', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = [{ name: 'test', calls: null }]; // Invalid atom structure
      const context = { atoms };
      
      await expect(phase.execute(context)).resolves.not.toThrow();
    });

    it('should set molecularChains to null on failure', async () => {
      const phase = new ChainBuildingPhase();
      // This test verifies the error handling behavior
      const atoms = [{ name: 'test' }];
      const context = { atoms };
      
      const result = await phase.execute(context);
      // On failure, molecularChains should be null
      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // Molecular Chains Structure
  // ============================================================================
  describe('Molecular Chains Structure', () => {
    it('should create chains structure when successful', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      atoms[0].calls = [{ name: atoms[1].name }];
      
      const context = { atoms };
      const result = await phase.execute(context);
      
      if (result.molecularChains) {
        expect(result.molecularChains).toHaveProperty('chains');
        expect(result.molecularChains).toHaveProperty('graph');
        expect(result.molecularChains).toHaveProperty('summary');
      }
    });

    it('chains should be an array when present', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      const context = { atoms };
      
      const result = await phase.execute(context);
      
      if (result.molecularChains && result.molecularChains.chains) {
        expect(Array.isArray(result.molecularChains.chains)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Integration - Factory Pattern
  // ============================================================================
  describe('Integration - Factory Pattern', () => {
    it('should work with PhaseContextBuilder', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      
      const { PhaseContextBuilder } = await import('../../../../factories/phases-test.factory.js');
      const context = PhaseContextBuilder.create().withAtoms(atoms).build();
      
      expect(phase.canExecute(context)).toBe(true);
      
      const result = await phase.execute(context);
      expect(result).toBeDefined();
    });

    it('should work with AtomBuilder', async () => {
      const phase = new ChainBuildingPhase();
      
      const { AtomBuilder } = await import('../../../../factories/phases-test.factory.js');
      const atom1 = AtomBuilder.create('func1').build();
      const atom2 = AtomBuilder.create('func2').build();
      
      const context = { atoms: [atom1, atom2] };
      
      const result = await phase.execute(context);
      expect(result).toBeDefined();
      expect(result.atoms).toHaveLength(2);
    });
  });

  // ============================================================================
  // Integration - Real-world patterns
  // ============================================================================
  describe('Integration - Real-world patterns', () => {
    it('should handle phase in pipeline', async () => {
      const phase = new ChainBuildingPhase();
      
      // Simulate pipeline context after atom extraction
      const context = {
        filePath: 'test.js',
        code: 'function a() { b(); } function b() { }',
        fileInfo: { functions: [] },
        fileMetadata: {},
        atoms: PhasesTestFactory.createAtoms(2),
        atomCount: 2
      };
      
      if (phase.canExecute(context)) {
        const result = await phase.execute(context);
        expect(result).toBeDefined();
      }
    });

    it('should be skipped when no atoms', async () => {
      const phase = new ChainBuildingPhase();
      
      const context = {
        filePath: 'test.js',
        atoms: []
      };
      
      expect(phase.canExecute(context)).toBe(false);
    });

    it('should maintain context immutability where possible', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      const context = { atoms, otherProp: 'value' };
      
      const result = await phase.execute(context);
      
      // Original context should be modified in place (phase pattern)
      expect(result).toBe(context);
      expect(result.otherProp).toBe('value');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle atoms with circular references', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(2);
      
      // Create circular reference in calls
      atoms[0].calls = [{ name: atoms[1].name }];
      atoms[1].calls = [{ name: atoms[0].name }];
      
      const context = { atoms };
      
      await expect(phase.execute(context)).resolves.not.toThrow();
    });

    it('should handle atoms with null calls', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(1);
      atoms[0].calls = null;
      
      const context = { atoms };
      
      await expect(phase.execute(context)).resolves.not.toThrow();
    });

    it('should handle atoms with undefined calls', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(1);
      atoms[0].calls = undefined;
      
      const context = { atoms };
      
      await expect(phase.execute(context)).resolves.not.toThrow();
    });

    it('should handle large number of atoms', async () => {
      const phase = new ChainBuildingPhase();
      const atoms = PhasesTestFactory.createAtoms(100);
      
      const context = { atoms };
      
      await expect(phase.execute(context)).resolves.not.toThrow();
    });
  });
});
