/**
 * @fileoverview main-validator.test.js
 * 
 * Tests para el validador principal de lineage
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/validators/main-validator
 */

import { describe, it, expect } from 'vitest';
import { validateForLineage } from '#layer-b/validators/lineage-validator/validators/main-validator.js';
import { AtomBuilder } from '../../../../../factories/layer-b-lineage/builders.js';

describe('validators/lineage-validator/validators/main-validator', () => {
  describe('validateForLineage', () => {
    it('should validate complete atom', () => {
      const atom = new AtomBuilder().build();
      
      const result = validateForLineage(atom);
      
      expect(result.valid).toBe(true);
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should return valid: false for null atom', () => {
      const result = validateForLineage(null);
      
      expect(result.valid).toBe(false);
      expect(result.confidence).toBe('none');
      expect(result.errors).toContain('Atom is null');
    });

    it('should detect missing ID', () => {
      const atom = new AtomBuilder().withId(null).build();
      
      const result = validateForLineage(atom);
      
      expect(result.errors).toContain('Atom missing ID');
    });

    it('should detect missing name', () => {
      const atom = new AtomBuilder().withName(null).build();
      
      const result = validateForLineage(atom);
      
      expect(result.errors).toContain('Atom missing name');
    });

    it('should detect missing DNA', () => {
      const atom = new AtomBuilder().withoutDNA().build();
      
      const result = validateForLineage(atom);
      
      expect(result.errors).toContain('Atom missing DNA');
    });

    it('should warn about missing semantic', () => {
      const atom = new AtomBuilder().withoutSemantic().build();
      
      const result = validateForLineage(atom);
      
      expect(result.warnings).toContain('Missing semantic analysis');
    });

    it('should return metadata when valid', () => {
      const atom = new AtomBuilder().build();
      
      const result = validateForLineage(atom);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.id).toBe('func-123');
      expect(result.metadata.name).toBe('validateUser');
    });

    it('should not return metadata when invalid', () => {
      const atom = new AtomBuilder().asInvalid().build();
      
      const result = validateForLineage(atom);
      
      expect(result.metadata).toBeNull();
    });

    it('should return high confidence for valid atom', () => {
      const atom = new AtomBuilder().build();
      
      const result = validateForLineage(atom);
      
      expect(result.confidence).toBe('high');
    });

    it('should handle strict mode', () => {
      const atom = new AtomBuilder().withoutSemantic().build();
      
      const result = validateForLineage(atom, { strict: true });
      
      // In strict mode, warnings become errors
      expect(result.errors.some(e => e.includes('Missing semantic'))).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should validate data flow', () => {
      const atom = new AtomBuilder()
        .withDataFlow({ inputs: null })
        .build();
      
      const result = validateForLineage(atom);
      
      expect(result.errors.some(e => e.includes('dataFlow'))).toBe(true);
    });
  });
});
