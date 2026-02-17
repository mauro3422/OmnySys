/**
 * @fileoverview metadata-extractor.test.js
 * 
 * Tests para extractor de metadatos
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/utils/metadata-extractor
 */

import { describe, it, expect } from 'vitest';
import { extractMetadata } from '#layer-b/validators/lineage-validator/utils/metadata-extractor.js';
import { AtomBuilder } from '../../../../../factories/layer-b-lineage/builders.js';

describe('validators/lineage-validator/utils/metadata-extractor', () => {
  describe('extractMetadata', () => {
    it('should extract basic fields', () => {
      const atom = new AtomBuilder().build();
      
      const result = extractMetadata(atom);
      
      expect(result.id).toBe('func-123');
      expect(result.name).toBe('validateUser');
      expect(result.filePath).toBe('/src/utils.js');
      expect(result.lineNumber).toBe(42);
      expect(result.isExported).toBe(true);
    });

    it('should extract DNA', () => {
      const atom = new AtomBuilder().build();
      
      const result = extractMetadata(atom);
      
      expect(result.dna).toEqual(atom.dna);
    });

    it('should calculate dataFlow counts', () => {
      const atom = new AtomBuilder()
        .withInputs([
          { name: 'a' },
          { name: 'b' }
        ])
        .withOutputs([
          { type: 'string' }
        ])
        .withTransformations([
          { operation: 'validate' }
        ])
        .build();
      
      const result = extractMetadata(atom);
      
      expect(result.dataFlow.inputCount).toBe(2);
      expect(result.dataFlow.outputCount).toBe(1);
      expect(result.dataFlow.transformationCount).toBe(1);
    });

    it('should include flowType in dataFlow', () => {
      const atom = new AtomBuilder()
        .withFlowType('transform')
        .build();
      
      const result = extractMetadata(atom);
      
      expect(result.dataFlow.flowType).toBe('transform');
    });

    it('should default to unknown flowType', () => {
      const atom = new AtomBuilder().withoutDNA().build();
      
      const result = extractMetadata(atom);
      
      expect(result.dataFlow.flowType).toBe('unknown');
    });

    it('should count zero for missing dataFlow', () => {
      const atom = new AtomBuilder().withoutDataFlow().build();
      
      const result = extractMetadata(atom);
      
      expect(result.dataFlow.inputCount).toBe(0);
      expect(result.dataFlow.outputCount).toBe(0);
      expect(result.dataFlow.transformationCount).toBe(0);
    });

    it('should extract semantic fields', () => {
      const atom = new AtomBuilder().build();
      
      const result = extractMetadata(atom);
      
      expect(result.semantic.verb).toBe('validate');
      expect(result.semantic.domain).toBe('business');
      expect(result.semantic.entity).toBe('user');
      expect(result.semantic.operationType).toBe('check');
    });

    it('should return null semantic when missing', () => {
      const atom = new AtomBuilder().withoutSemantic().build();
      
      const result = extractMetadata(atom);
      
      expect(result.semantic).toBeNull();
    });

    it('should handle atom with only required fields', () => {
      const atom = {
        id: 'simple-1',
        name: 'simple',
        filePath: '/src/simple.js',
        lineNumber: 1,
        isExported: false
      };
      
      const result = extractMetadata(atom);
      
      expect(result.id).toBe('simple-1');
      expect(result.dataFlow.inputCount).toBe(0);
      expect(result.semantic).toBeNull();
    });

    it('should not include extra fields', () => {
      const atom = new AtomBuilder().build();
      atom.extraField = 'should not appear';
      
      const result = extractMetadata(atom);
      
      expect(result).not.toHaveProperty('extraField');
    });
  });
});
