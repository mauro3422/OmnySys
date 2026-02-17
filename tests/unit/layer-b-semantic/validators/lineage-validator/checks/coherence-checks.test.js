/**
 * @fileoverview coherence-checks.test.js
 * 
 * Tests para validación de coherencia
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/checks/coherence-checks
 */

import { describe, it, expect } from 'vitest';
import { validateCoherence } from '#layer-b/validators/lineage-validator/checks/coherence-checks.js';
import { AtomBuilder } from '../../../../../factories/layer-b-lineage/builders.js';

describe('validators/lineage-validator/checks/coherence-checks', () => {
  describe('validateCoherence', () => {
    it('should validate coherent atom', () => {
      const atom = new AtomBuilder().build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(true);
    });

    it('should detect missing validation operation', () => {
      const atom = new AtomBuilder()
        .withVerb('validate')
        .withTransformations([{ operation: 'process' }])
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Semantic says "validate" but no validation operation found');
    });

    it('should accept validation with validation operation', () => {
      const atom = new AtomBuilder()
        .withVerb('validate')
        .withTransformations([{ operation: 'validation' }])
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.errors).not.toContain('Semantic says "validate" but no validation operation found');
    });

    it('should accept validation with check operation', () => {
      const atom = new AtomBuilder()
        .withVerb('validate')
        .withTransformations([{ operation: 'check' }])
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(true);
    });

    it('should accept validation with verify operation', () => {
      const atom = new AtomBuilder()
        .withVerb('validate')
        .withTransformations([{ operation: 'verify' }])
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(true);
    });

    it('should detect missing read operation for read flowType', () => {
      const atom = new AtomBuilder()
        .asReadOperation()
        .withTransformations([{ operation: 'process' }])
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('FlowType says "read" but no read operation found');
    });

    it('should accept read with read operation', () => {
      const atom = new AtomBuilder()
        .asReadOperation()
        .withTransformations([{ operation: 'read' }])
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.errors).not.toContain('FlowType says "read" but no read operation found');
    });

    it('should accept read with fetch operation', () => {
      const atom = new AtomBuilder()
        .asReadOperation()
        .withTransformations([{ operation: 'fetch' }])
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(true);
    });

    it('should detect missing side effect for persist flowType', () => {
      const atom = new AtomBuilder()
        .asWriteOperation()
        .withDataFlow({
          inputs: [],
          outputs: [{ type: 'string' }],
          transformations: [{ operation: 'write', hasSideEffects: false }]
        })
        .build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('FlowType says "persist" but no side effect output found');
    });

    it('should handle atom without semantic', () => {
      const atom = new AtomBuilder().withoutSemantic().build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(true);
    });

    it('should handle atom without DNA', () => {
      const atom = new AtomBuilder().withoutDNA().build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(true);
    });

    it('should handle atom without dataFlow', () => {
      const atom = new AtomBuilder().withoutDataFlow().build();
      
      const result = validateCoherence(atom);
      
      expect(result.valid).toBe(true);
    });
  });
});
