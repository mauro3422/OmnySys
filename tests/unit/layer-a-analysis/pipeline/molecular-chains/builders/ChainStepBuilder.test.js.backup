/**
 * @fileoverview ChainStepBuilder.test.js
 * 
 * Tests for ChainStepBuilder - Building individual chain steps
 * 
 * @module tests/unit/molecular-chains/builders/ChainStepBuilder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChainStepBuilder } from '#molecular-chains/builders/ChainStepBuilder.js';
import { ChainBuilderFactory } from '../molecular-chains-test.factory.js';

describe('ChainStepBuilder', () => {
  let factory;
  let builder;

  beforeEach(() => {
    factory = new ChainBuilderFactory();
    const atoms = factory.getAtoms();
    const atomByName = new Map();
    builder = new ChainStepBuilder(atoms, atomByName);
  });

  // ============================================================================
  // Constructor
  // ============================================================================
  describe('constructor', () => {
    it('should create ChainStepBuilder', () => {
      expect(builder).toBeDefined();
    });

    it('should store atoms reference', () => {
      expect(builder.atoms).toBeDefined();
    });

    it('should store atomByName reference', () => {
      expect(builder.atomByName).toBeDefined();
    });
  });

  // ============================================================================
  // Step Creation
  // ============================================================================
  describe('create', () => {
    it('should create step for simple atom', () => {
      const atom = factory.createEntryPoint('testFn');
      
      const step = builder.create(atom);
      
      expect(step).toBeDefined();
      expect(step.function).toBe('testFn');
      expect(step.atomId).toBe(atom.id);
    });

    it('should include input configuration', () => {
      const atom = factory.createEntryPoint('testFn', {
        inputs: [{ name: 'param1', type: 'simple' }]
      });
      
      const step = builder.create(atom);
      
      expect(step.input).toBeDefined();
      expect(Array.isArray(step.input.variables)).toBe(true);
    });

    it('should include output configuration', () => {
      const atom = factory.createEntryPoint('testFn', {
        outputs: [{ type: 'return' }]
      });
      
      const step = builder.create(atom);
      
      expect(step.output).toBeDefined();
      expect(step.output.type).toBeDefined();
    });

    it('should mark pure functions correctly', () => {
      const atom = factory.createEntryPoint('pureFn', {
        hasSideEffects: false
      });
      
      const step = builder.create(atom);
      
      expect(step.output.type).toBe('pure');
    });

    it('should mark functions with side effects correctly', () => {
      const atom = factory.createEntryPoint('effectFn', {
        hasSideEffects: true
      });
      
      const step = builder.create(atom);
      
      expect(step.output.type).toBe('mixed');
    });

    it('should include internal transforms', () => {
      const atom = factory.createEntryPoint('transformFn', {
        transformations: [
          { type: 'MAP', from: 'input', to: 'output', line: 10 }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.internalTransforms).toBeDefined();
      expect(step.internalTransforms).toHaveLength(1);
      expect(step.internalTransforms[0].type).toBe('MAP');
    });

    it('should include calls array', () => {
      const atom = factory.createEntryPoint('caller', {
        calls: [{ name: 'callee', type: 'internal', args: [] }]
      });
      
      const step = builder.create(atom);
      
      expect(step.calls).toBeDefined();
      expect(step.calls).toHaveLength(1);
      expect(step.calls[0].function).toBe('callee');
    });

    it('should include output usedBy', () => {
      const atom = factory.createEntryPoint('called', {
        calledBy: ['file::caller']
      });
      
      const step = builder.create(atom);
      
      expect(step.output.usedBy).toBeDefined();
      expect(step.output.usedBy).toContain('file::caller');
    });
  });

  // ============================================================================
  // Input Source Detection
  // ============================================================================
  describe('determineInputSource', () => {
    it('should return external for exported functions', () => {
      const atom = factory.createEntryPoint('exported');
      
      const step = builder.create(atom);
      
      expect(step.input.source).toBe('external');
    });

    it('should return caller_arguments for functions with callers', () => {
      const atom = factory.createIntermediate('called', ['caller'], []);
      
      const step = builder.create(atom);
      
      expect(step.input.source).toBe('caller_arguments');
    });

    it('should return unknown for orphan functions', () => {
      const atom = factory.createAtom({
        name: 'orphan',
        calledBy: [],
        isExported: false
      });
      
      const step = builder.create(atom);
      
      expect(step.input.source).toBe('unknown');
    });
  });

  // ============================================================================
  // External Input Detection
  // ============================================================================
  describe('findExternalInputs', () => {
    it('should identify external inputs when no caller matches', () => {
      factory = new ChainBuilderFactory();
      const entry = factory.createEntryPoint('entry', {
        inputs: [{ name: 'config', type: 'object' }]
      });
      
      const atoms = factory.getAtoms();
      const atomByName = new Map(atoms.map(a => [a.name, a]));
      builder = new ChainStepBuilder(atoms, atomByName);
      
      const step = builder.create(entry);
      
      expect(step.input.externalDependencies).toBeDefined();
    });

    it('should handle atoms with no inputs', () => {
      const atom = factory.createEntryPoint('noInputs', {
        dataFlow: { inputs: [], outputs: [] }
      });
      
      const step = builder.create(atom);
      
      expect(step.input.variables).toEqual([]);
      expect(step.input.externalDependencies).toEqual([]);
    });

    it('should handle missing dataFlow', () => {
      const atom = factory.createEntryPoint('noDataFlow', {
        dataFlow: undefined
      });
      
      const step = builder.create(atom);
      
      expect(step.input).toBeDefined();
      expect(step.internalTransforms).toEqual([]);
    });
  });

  // ============================================================================
  // Transform Mapping
  // ============================================================================
  describe('transform mapping', () => {
    it('should map transformation type correctly', () => {
      const atom = factory.createEntryPoint('fn', {
        transformations: [
          { operation: 'FILTER', from: 'data', to: 'filtered', line: 5 }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.internalTransforms[0].type).toBe('FILTER');
    });

    it('should handle multiple transformations', () => {
      const atom = factory.createEntryPoint('fn', {
        transformations: [
          { type: 'PARSE', from: 'raw', to: 'parsed', line: 1 },
          { type: 'VALIDATE', from: 'parsed', to: 'valid', line: 2 },
          { type: 'TRANSFORM', from: 'valid', to: 'result', line: 3 }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.internalTransforms).toHaveLength(3);
    });

    it('should include line numbers in transforms', () => {
      const atom = factory.createEntryPoint('fn', {
        transformations: [
          { type: 'MAP', from: 'in', to: 'out', line: 42 }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.internalTransforms[0].line).toBe(42);
    });
  });

  // ============================================================================
  // Call Mapping
  // ============================================================================
  describe('call mapping', () => {
    it('should map call type correctly', () => {
      const atom = factory.createEntryPoint('caller', {
        calls: [
          { name: 'internalFn', type: 'internal', args: [] },
          { name: 'externalFn', type: 'external', args: [] }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.calls[0].type).toBe('internal');
      expect(step.calls[1].type).toBe('external');
    });

    it('should map call arguments', () => {
      const atom = factory.createEntryPoint('caller', {
        calls: [
          { 
            name: 'callee', 
            type: 'internal', 
            args: [{ name: 'arg1' }, { name: 'arg2' }] 
          }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.calls[0].args).toHaveLength(2);
    });

    it('should handle calls with no args', () => {
      const atom = factory.createEntryPoint('caller', {
        calls: [{ name: 'callee', type: 'internal' }]
      });
      
      const step = builder.create(atom);
      
      expect(step.calls[0].args).toEqual([]);
    });

    it('should handle empty calls array', () => {
      const atom = factory.createEntryPoint('noCalls', {
        calls: []
      });
      
      const step = builder.create(atom);
      
      expect(step.calls).toEqual([]);
    });
  });

  // ============================================================================
  // Variable Extraction
  // ============================================================================
  describe('variable extraction', () => {
    it('should extract input variable names', () => {
      const atom = factory.createEntryPoint('fn', {
        inputs: [
          { name: 'a', type: 'simple' },
          { name: 'b', type: 'simple' }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.input.variables).toEqual(['a', 'b']);
    });

    it('should extract output variable names', () => {
      const atom = factory.createEntryPoint('fn', {
        outputs: [
          { type: 'return' },
          { type: 'side_effect', target: 'console' }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.output.variables).toContain('return');
      expect(step.output.variables).toContain('console');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('edge cases', () => {
    it('should handle atom with all properties undefined', () => {
      const atom = factory.createEntryPoint('empty');
      atom.dataFlow = undefined;
      atom.calls = undefined;
      atom.calledBy = undefined;
      atom.hasSideEffects = undefined;
      
      const step = builder.create(atom);
      
      expect(step).toBeDefined();
      expect(step.function).toBe('empty');
    });

    it('should handle null transformation fields', () => {
      const atom = factory.createEntryPoint('fn', {
        transformations: [
          { type: null, from: undefined, to: undefined }
        ]
      });
      
      const step = builder.create(atom);
      
      expect(step.internalTransforms).toHaveLength(1);
    });
  });

  // ============================================================================
  // Default Export
  // ============================================================================
  describe('default export', () => {
    it('should export ChainStepBuilder as default', async () => {
      const module = await import('#molecular-chains/builders/ChainStepBuilder.js');
      
      expect(module.default).toBe(ChainStepBuilder);
    });
  });
});
