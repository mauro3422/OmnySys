/**
 * @fileoverview lineage-validator-index.test.js
 * 
 * Tests para el facade principal del lineage-validator
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/index
 */

import { describe, it, expect } from 'vitest';
import {
  validateForLineage,
  validateDataFlow,
  validateCoherence,
  validateSemantic,
  validateShadow,
  validateMatch,
  calculateConfidence,
  extractMetadata
} from '#layer-b/validators/lineage-validator/index.js';

describe('validators/lineage-validator/index', () => {
  describe('exports', () => {
    it('should export validateForLineage', () => {
      expect(typeof validateForLineage).toBe('function');
    });

    it('should export validateDataFlow', () => {
      expect(typeof validateDataFlow).toBe('function');
    });

    it('should export validateCoherence', () => {
      expect(typeof validateCoherence).toBe('function');
    });

    it('should export validateSemantic', () => {
      expect(typeof validateSemantic).toBe('function');
    });

    it('should export validateShadow', () => {
      expect(typeof validateShadow).toBe('function');
    });

    it('should export validateMatch', () => {
      expect(typeof validateMatch).toBe('function');
    });

    it('should export calculateConfidence', () => {
      expect(typeof calculateConfidence).toBe('function');
    });

    it('should export extractMetadata', () => {
      expect(typeof extractMetadata).toBe('function');
    });
  });
});
