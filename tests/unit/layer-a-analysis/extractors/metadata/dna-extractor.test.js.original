/**
 * @fileoverview Tests for dna-extractor.js
 * 
 * @module tests/dna-extractor
 */

import { describe, it, expect } from 'vitest';
import { extractDNA, compareDNA, validateDNA } from '#layer-a/extractors/metadata/dna-extractor.js';
import { MetadataBuilder, expectValidDNA } from './metadata-test.factory.js';

describe('dna-extractor', () => {
  describe('extractDNA', () => {
    describe('basic structure', () => {
      it('should export extractDNA function', () => {
        expect(typeof extractDNA).toBe('function');
      });

      it('should return valid DNA structure', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna = extractDNA(atom);
        expectValidDNA(dna);
      });
    });

    describe('null/undefined handling', () => {
      it('should handle null atom gracefully', () => {
        const dna = extractDNA(null);
        expect(dna.id).toBe('no-dataflow');
        expect(dna.flowType).toBe('unknown');
      });

      it('should handle undefined atom gracefully', () => {
        const dna = extractDNA(undefined);
        expect(dna.id).toBe('no-dataflow');
      });

      it('should handle atom without dataFlow', () => {
        const dna = extractDNA({ name: 'test' });
        expect(dna.id).toBe('no-dataflow');
        expect(dna.complexityScore).toBe(1);
      });

      it('should handle empty dataFlow', () => {
        const dna = extractDNA({ dataFlow: {} });
        expect(dna.id).toBe('no-dataflow');
      });
    });

    describe('structural hash', () => {
      it('should generate consistent structural hash', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna1 = extractDNA(atom);
        const dna2 = extractDNA(atom);
        expect(dna1.structuralHash).toBe(dna2.structuralHash);
      });

      it('should generate different hashes for different structures', () => {
        const atom1 = MetadataBuilder.simpleFunction().build();
        const atom2 = MetadataBuilder.asyncFunction().build();
        const dna1 = extractDNA(atom1);
        const dna2 = extractDNA(atom2);
        expect(dna1.structuralHash).not.toBe(dna2.structuralHash);
      });

      it('should generate 16-character hash', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna = extractDNA(atom);
        expect(dna.structuralHash).toHaveLength(16);
      });
    });

    describe('pattern hash', () => {
      it('should generate pattern hash', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna = extractDNA(atom);
        expect(dna.patternHash).toBeDefined();
        expect(dna.patternHash.length).toBeGreaterThan(0);
      });

      it('should use standardized pattern hash if available', () => {
        const atom = MetadataBuilder.simpleFunction()
          .withStandardized('custom-hash-123')
          .build();
        const dna = extractDNA(atom);
        expect(dna.patternHash).toBe('custom-hash-123');
      });

      it('should generate 12-character hash when computing', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(['a'], [{ operation: 'transform' }], ['b'])
          .build();
        const dna = extractDNA(atom);
        expect(dna.patternHash).toHaveLength(12);
      });
    });

    describe('flow type detection', () => {
      it('should detect read-transform-return flow', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(
            [{ type: 'param' }],
            [{ operation: 'calculation' }],
            [{ type: 'return' }]
          )
          .build();
        const dna = extractDNA(atom);
        expect(dna.flowType).toBe('transform-return');
      });

      it('should detect read-persist flow', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(
            [{ type: 'param' }],
            [],
            [{ type: 'side_effect' }]
          )
          .build();
        const dna = extractDNA(atom);
        expect(dna.flowType).toBe('side-effect-only');
      });

      it('should detect read-transform-persist-return flow', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(
            [{ type: 'param' }],
            [{ operation: 'calculation' }],
            [{ type: 'side_effect' }, { type: 'return' }]
          )
          .build();
        const dna = extractDNA(atom);
        expect(dna.flowType).toBe('read-transform-persist-return');
      });

      it('should detect unknown flow for empty dataFlow', () => {
        const atom = new MetadataBuilder()
          .withDataFlow([], [], [])
          .build();
        const dna = extractDNA(atom);
        expect(dna.flowType).toBe('unknown');
      });
    });

    describe('operation sequence', () => {
      it('should extract operation sequence', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(['a'], [{ operation: 'map' }], ['return'])
          .build();
        const dna = extractDNA(atom);
        expect(dna.operationSequence).toContain('receive');
        expect(dna.operationSequence).toContain('map');
        expect(dna.operationSequence).toContain('return');
      });

      it('should include emit for side effects', () => {
        const atom = MetadataBuilder.sideEffectFunction().build();
        const dna = extractDNA(atom);
        expect(dna.operationSequence).toContain('emit');
      });

      it('should maintain operation order', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(
            ['a'],
            [{ operation: 'map' }, { operation: 'filter' }],
            ['return']
          )
          .build();
        const dna = extractDNA(atom);
        expect(dna.operationSequence).toEqual(['receive', 'map', 'filter', 'return']);
      });
    });

    describe('complexity score', () => {
      it('should have minimum complexity of 1', () => {
        const atom = new MetadataBuilder()
          .withDataFlow([], [], [])
          .build();
        const dna = extractDNA(atom);
        expect(dna.complexityScore).toBeGreaterThanOrEqual(1);
      });

      it('should increase with inputs', () => {
        const atom1 = new MetadataBuilder().withDataFlow(['a'], [], []).build();
        const atom2 = new MetadataBuilder().withDataFlow(['a', 'b', 'c'], [], []).build();
        const dna1 = extractDNA(atom1);
        const dna2 = extractDNA(atom2);
        expect(dna2.complexityScore).toBeGreaterThan(dna1.complexityScore);
      });

      it('should increase with transformations', () => {
        const atom1 = new MetadataBuilder().withDataFlow([], ['t1'], []).build();
        const atom2 = new MetadataBuilder().withDataFlow([], ['t1', 't2', 't3'], []).build();
        const dna1 = extractDNA(atom1);
        const dna2 = extractDNA(atom2);
        expect(dna2.complexityScore).toBeGreaterThan(dna1.complexityScore);
      });

      it('should increase with side effects', () => {
        const atom1 = new MetadataBuilder()
          .withDataFlow([], [], [{ type: 'return' }])
          .build();
        const atom2 = new MetadataBuilder()
          .withDataFlow([], [], [{ type: 'side_effect' }])
          .build();
        const dna1 = extractDNA(atom1);
        const dna2 = extractDNA(atom2);
        expect(dna2.complexityScore).toBeGreaterThan(dna1.complexityScore);
      });

      it('should not exceed 10', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(
            ['a', 'b', 'c', 'd', 'e'],
            ['t1', 't2', 't3', 't4', 't5', 't6'],
            [{ type: 'return' }, { type: 'side_effect' }]
          )
          .build();
        const dna = extractDNA(atom);
        expect(dna.complexityScore).toBeLessThanOrEqual(10);
      });
    });

    describe('counts', () => {
      it('should count inputs correctly', () => {
        const atom = new MetadataBuilder()
          .withDataFlow(['a', 'b', 'c'], [], [])
          .build();
        const dna = extractDNA(atom);
        expect(dna.inputCount).toBe(3);
      });

      it('should count outputs correctly', () => {
        const atom = new MetadataBuilder()
          .withDataFlow([], [], [{ type: 'return' }, { type: 'side_effect' }])
          .build();
        const dna = extractDNA(atom);
        expect(dna.outputCount).toBe(2);
      });

      it('should count transformations correctly', () => {
        const atom = new MetadataBuilder()
          .withDataFlow([], [{ operation: 'map' }, { operation: 'filter' }], [])
          .build();
        const dna = extractDNA(atom);
        expect(dna.transformationCount).toBe(2);
      });
    });

    describe('semantic fingerprint', () => {
      it('should generate semantic fingerprint', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna = extractDNA(atom);
        expect(dna.semanticFingerprint).toBeDefined();
      });

      it('should use semantic data when available', () => {
        const atom = new MetadataBuilder()
          .withSemantic('create', 'user', 'profile')
          .build();
        const dna = extractDNA(atom);
        expect(dna.semanticFingerprint).toBe('create:user:profile');
      });

      it('should return unknown without semantic data', () => {
        const atom = new MetadataBuilder().build();
        const dna = extractDNA(atom);
        expect(dna.semanticFingerprint).toBe('unknown');
      });
    });

    describe('metadata', () => {
      it('should include extraction timestamp', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna = extractDNA(atom);
        expect(dna.extractedAt).toBeDefined();
        expect(new Date(dna.extractedAt)).toBeInstanceOf(Date);
      });

      it('should include version', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna = extractDNA(atom);
        expect(dna.version).toBe('1.0');
      });

      it('should generate unique id', () => {
        const atom = MetadataBuilder.simpleFunction().build();
        const dna = extractDNA(atom);
        expect(dna.id).toBeDefined();
        expect(dna.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('compareDNA', () => {
    it('should export compareDNA function', () => {
      expect(typeof compareDNA).toBe('function');
    });

    it('should return 0 for null inputs', () => {
      expect(compareDNA(null, null)).toBe(0);
      expect(compareDNA(null, {})).toBe(0);
      expect(compareDNA({}, null)).toBe(0);
    });

    it('should return 1 for identical DNA', () => {
      const atom = MetadataBuilder.simpleFunction().build();
      const dna = extractDNA(atom);
      expect(compareDNA(dna, dna)).toBe(1);
    });

    it('should return high similarity for similar DNA', () => {
      const atom1 = MetadataBuilder.simpleFunction().build();
      const atom2 = MetadataBuilder.simpleFunction().build();
      const dna1 = extractDNA(atom1);
      const dna2 = extractDNA(atom2);
      expect(compareDNA(dna1, dna2)).toBeGreaterThan(0.9);
    });

    it('should return lower similarity for different DNA', () => {
      const atom1 = MetadataBuilder.simpleFunction().build();
      const atom2 = MetadataBuilder.asyncFunction().build();
      const dna1 = extractDNA(atom1);
      const dna2 = extractDNA(atom2);
      expect(compareDNA(dna1, dna2)).toBeLessThan(1);
    });

    it('should consider flow type when structural hash differs', () => {
      const dna1 = {
        structuralHash: 'hash1',
        patternHash: 'pattern1',
        flowType: 'transform-return',
        operationSequence: ['receive', 'return'],
        semanticFingerprint: 'test'
      };
      const dna2 = {
        structuralHash: 'hash2',
        patternHash: 'pattern2',
        flowType: 'transform-return',
        operationSequence: ['receive', 'process', 'return'],
        semanticFingerprint: 'test'
      };
      expect(compareDNA(dna1, dna2)).toBeGreaterThan(0);
    });
  });

  describe('validateDNA', () => {
    it('should export validateDNA function', () => {
      expect(typeof validateDNA).toBe('function');
    });

    it('should validate correct DNA', () => {
      const atom = MetadataBuilder.simpleFunction().build();
      const dna = extractDNA(atom);
      const validation = validateDNA(dna);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing id', () => {
      const dna = { structuralHash: 'test', patternHash: 'test', flowType: 'test', complexityScore: 5 };
      const validation = validateDNA(dna);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing DNA ID');
    });

    it('should detect missing structural hash', () => {
      const dna = { id: 'test', patternHash: 'test', flowType: 'test', complexityScore: 5 };
      const validation = validateDNA(dna);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing structural hash');
    });

    it('should detect missing pattern hash', () => {
      const dna = { id: 'test', structuralHash: 'test', flowType: 'test', complexityScore: 5 };
      const validation = validateDNA(dna);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing pattern hash');
    });

    it('should detect unknown flow type', () => {
      const dna = { id: 'test', structuralHash: 'test', patternHash: 'test', flowType: 'unknown', complexityScore: 5 };
      const validation = validateDNA(dna);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Unknown flow type');
    });

    it('should detect invalid complexity score', () => {
      const atom = MetadataBuilder.simpleFunction().build();
      const dna = extractDNA(atom);
      dna.complexityScore = 15;
      const validation = validateDNA(dna);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid complexity score');
    });

    it('should detect complexity score below 1', () => {
      const atom = MetadataBuilder.simpleFunction().build();
      const dna = extractDNA(atom);
      dna.complexityScore = 0;
      const validation = validateDNA(dna);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid complexity score');
    });
  });
});
