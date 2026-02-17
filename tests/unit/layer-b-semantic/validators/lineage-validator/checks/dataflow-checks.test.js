/**
 * @fileoverview dataflow-checks.test.js
 * 
 * Tests para validación de data flow
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/checks/dataflow-checks
 */

import { describe, it, expect } from 'vitest';
import { validateDataFlow } from '#layer-b/validators/lineage-validator/checks/dataflow-checks.js';

describe('validators/lineage-validator/checks/dataflow-checks', () => {
  describe('validateDataFlow', () => {
    it('should return error for missing dataFlow', () => {
      const result = validateDataFlow(null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing dataFlow');
    });

    it('should validate empty inputs', () => {
      const dataFlow = {
        inputs: [],
        outputs: [{ type: 'string' }]
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.valid).toBe(true);
    });

    it('should error when inputs is not array', () => {
      const dataFlow = {
        inputs: 'not an array',
        outputs: [{ type: 'string' }]
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('dataFlow.inputs must be an array');
    });

    it('should warn about void function', () => {
      const dataFlow = {
        inputs: [],
        outputs: [],
        transformations: []
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.warnings).toContain('Atom has no outputs or transformations (possible void function)');
    });

    it('should accept function with transformations only', () => {
      const dataFlow = {
        inputs: [{ name: 'x' }],
        outputs: [],
        transformations: [{ operation: 'process' }]
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept function with outputs only', () => {
      const dataFlow = {
        inputs: [{ name: 'x' }],
        outputs: [{ type: 'string' }]
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about output without type', () => {
      const dataFlow = {
        inputs: [],
        outputs: [{}, { type: 'string' }]
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.warnings).toContain('Output 0 missing type');
    });

    it('should validate multiple outputs', () => {
      const dataFlow = {
        inputs: [],
        outputs: [
          { type: 'string' },
          { type: 'number' },
          {} // missing type
        ]
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.warnings).toContain('Output 2 missing type');
      expect(result.warnings).not.toContain('Output 0 missing type');
      expect(result.warnings).not.toContain('Output 1 missing type');
    });

    it('should handle undefined outputs', () => {
      const dataFlow = {
        inputs: []
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.warnings).toContain('Atom has no outputs or transformations (possible void function)');
    });

    it('should handle valid data flow', () => {
      const dataFlow = {
        inputs: [{ name: 'user', type: 'object' }],
        outputs: [{ type: 'boolean' }],
        transformations: [{ operation: 'validation' }]
      };
      
      const result = validateDataFlow(dataFlow);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
