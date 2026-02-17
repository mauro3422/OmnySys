/**
 * @fileoverview semantic-checks.test.js
 * 
 * Tests para validación semántica
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/checks/semantic-checks
 */

import { describe, it, expect } from 'vitest';
import { validateSemantic } from '#layer-b/validators/lineage-validator/checks/semantic-checks.js';

describe('validators/lineage-validator/checks/semantic-checks', () => {
  describe('validateSemantic', () => {
    it('should error on missing verb', () => {
      const semantic = { operationType: 'check' };
      
      const result = validateSemantic(semantic);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing semantic verb');
    });

    it('should error on missing operationType', () => {
      const semantic = { verb: 'validate' };
      
      const result = validateSemantic(semantic);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing operationType');
    });

    it('should accept known verbs', () => {
      const knownVerbs = ['get', 'set', 'update', 'delete', 'validate', 'process', 'handle', 'create', 'fetch'];
      
      knownVerbs.forEach(verb => {
        const semantic = { verb, operationType: 'check' };
        const result = validateSemantic(semantic);
        expect(result.errors).not.toContain(`Unknown verb: ${verb}`);
      });
    });

    it('should error on unknown verb', () => {
      const semantic = { verb: 'unknownVerb', operationType: 'check' };
      
      const result = validateSemantic(semantic);
      
      expect(result.errors).toContain('Unknown verb: unknownVerb');
    });

    it('should validate complete semantic', () => {
      const semantic = {
        verb: 'validate',
        operationType: 'check',
        domain: 'business',
        entity: 'user'
      };
      
      const result = validateSemantic(semantic);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty semantic object', () => {
      const result = validateSemantic({});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing semantic verb');
      expect(result.errors).toContain('Missing operationType');
    });
  });
});
