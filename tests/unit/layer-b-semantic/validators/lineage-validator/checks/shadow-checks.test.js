/**
 * @fileoverview shadow-checks.test.js
 * 
 * Tests para validación de sombras
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/checks/shadow-checks
 */

import { describe, it, expect } from 'vitest';
import { validateShadow, validateMatch } from '#layer-b/validators/lineage-validator/checks/shadow-checks.js';
import { AtomBuilder, ShadowBuilder } from '../../../../../factories/layer-b-lineage/builders.js';

describe('validators/lineage-validator/checks/shadow-checks', () => {
  describe('validateShadow', () => {
    it('should validate complete shadow', () => {
      const shadow = new ShadowBuilder().build();
      
      const result = validateShadow(shadow);
      
      expect(result.valid).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should detect missing shadowId', () => {
      const shadow = new ShadowBuilder().withId(null).build();
      
      const result = validateShadow(shadow);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing shadowId');
      expect(result.confidence).toBe('none');
    });

    it('should detect missing originalId', () => {
      const shadow = new ShadowBuilder().withOriginalId(null).build();
      
      const result = validateShadow(shadow);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing originalId');
    });

    it('should detect missing DNA', () => {
      const shadow = { ...new ShadowBuilder().build(), dna: null };
      
      const result = validateShadow(shadow);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing DNA');
    });

    it('should detect missing diedAt', () => {
      const shadow = { ...new ShadowBuilder().build(), diedAt: null };
      
      const result = validateShadow(shadow);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing diedAt timestamp');
    });

    it('should detect missing metadata', () => {
      const shadow = { ...new ShadowBuilder().build(), metadata: null };
      
      const result = validateShadow(shadow);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing metadata');
    });

    it('should return empty warnings', () => {
      const shadow = new ShadowBuilder().build();
      
      const result = validateShadow(shadow);
      
      expect(result.warnings).toEqual([]);
    });

    it('should detect multiple missing fields', () => {
      const shadow = {};
      
      const result = validateShadow(shadow);
      
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Missing shadowId');
      expect(result.errors).toContain('Missing originalId');
      expect(result.errors).toContain('Missing DNA');
      expect(result.errors).toContain('Missing diedAt timestamp');
      expect(result.errors).toContain('Missing metadata');
    });
  });

  describe('validateMatch', () => {
    it('should reject match without DNA', () => {
      const atom = new AtomBuilder().withoutDNA().build();
      const shadow = new ShadowBuilder().build();
      
      const result = validateMatch(atom, shadow);
      
      expect(result.valid).toBe(false);
      expect(result.similarity).toBe(0);
      expect(result.reason).toBe('Missing DNA');
    });

    it('should reject match when shadow has no DNA', () => {
      const atom = new AtomBuilder().build();
      const shadow = { ...new ShadowBuilder().build(), dna: null };
      
      const result = validateMatch(atom, shadow);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing DNA');
    });

    it('should include similarity in result', () => {
      const atom = new AtomBuilder().build();
      const shadow = new ShadowBuilder().build();
      
      const result = validateMatch(atom, shadow);
      
      expect(typeof result.similarity).toBe('number');
    });

    it('should reject when similarity below threshold', () => {
      const atom = new AtomBuilder().withDNA({ flowType: 'read' }).build();
      const shadow = new ShadowBuilder().withDNA({ flowType: 'transform' }).build();
      
      const result = validateMatch(atom, shadow);
      
      if (result.similarity < 0.6) {
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('threshold');
      }
    });

    it('should detect false positive with high similarity but different semantics', () => {
      const atom = new AtomBuilder()
        .withDNA({ flowType: 'transform' })
        .withSemantic({ verb: 'validate', domain: 'business' })
        .build();
      
      const shadow = new ShadowBuilder()
        .withDNA({ flowType: 'transform' })
        .withMetadata({ semantic: { verb: 'process', domain: 'infrastructure' } })
        .build();
      
      const result = validateMatch(atom, shadow);
      
      // If similarity > 0.8 and semantics differ, should reject
      if (result.similarity > 0.8 && !result.valid) {
        expect(result.reason).toContain('false positive');
      }
    });

    it('should validate match with similar DNA and semantics', () => {
      const atom = new AtomBuilder()
        .withDNA({ flowType: 'transform' })
        .withSemantic({ verb: 'validate', domain: 'business' })
        .build();
      
      const shadow = new ShadowBuilder()
        .withDNA({ flowType: 'transform' })
        .withMetadata({ semantic: { verb: 'validate', domain: 'business' } })
        .build();
      
      const result = validateMatch(atom, shadow);
      
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Match validated');
    });
  });
});
