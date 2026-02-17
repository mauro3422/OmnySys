/**
 * @fileoverview schema-validator-index.test.js
 * 
 * Tests para el facade principal del schema-validator
 * 
 * @module tests/unit/layer-b-semantic/schema-validator/index
 */

import { describe, it, expect } from 'vitest';
import {
  schema,
  validateSemanticConnection,
  validateSideEffects,
  validateRiskScore,
  validateFileAnalysis,
  validateEnhancedSystemMap,
  filterByConfidence,
  filterBySeverity,
  generateValidationReport
} from '#layer-b/schema-validator/index.js';

describe('schema-validator/index - Main Facade', () => {
  describe('Schema Export', () => {
    it('should export schema', () => {
      expect(schema).toBeDefined();
    });
  });

  describe('Validator Exports', () => {
    it('should export validateSemanticConnection', () => {
      expect(typeof validateSemanticConnection).toBe('function');
    });

    it('should export validateSideEffects', () => {
      expect(typeof validateSideEffects).toBe('function');
    });

    it('should export validateRiskScore', () => {
      expect(typeof validateRiskScore).toBe('function');
    });

    it('should export validateFileAnalysis', () => {
      expect(typeof validateFileAnalysis).toBe('function');
    });

    it('should export validateEnhancedSystemMap', () => {
      expect(typeof validateEnhancedSystemMap).toBe('function');
    });
  });

  describe('Filter Exports', () => {
    it('should export filterByConfidence', () => {
      expect(typeof filterByConfidence).toBe('function');
    });

    it('should export filterBySeverity', () => {
      expect(typeof filterBySeverity).toBe('function');
    });
  });

  describe('Report Export', () => {
    it('should export generateValidationReport', () => {
      expect(typeof generateValidationReport).toBe('function');
    });
  });
});
