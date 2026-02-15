/**
 * @fileoverview completeness-calculator.test.js
 * 
 * Tests for the completeness calculator module
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor/completeness/completeness-calculator
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCompleteness,
  shouldNeedLLM,
  countActiveExtractors,
  assessQuality
} from '#layer-a/extractors/comprehensive-extractor/completeness/completeness-calculator.js';
import { createMockExtractionResult } from '#test-factories/comprehensive-extractor-test.factory.js';

describe('Completeness Calculator', () => {
  describe('calculateCompleteness', () => {
    it('should return 0 for empty results', () => {
      const result = calculateCompleteness({});
      expect(result).toBe(0);
    });

    it('should return 0 for null results', () => {
      const result = calculateCompleteness(null);
      expect(result).toBe(0);
    });

    it('should return 0 for undefined results', () => {
      const result = calculateCompleteness(undefined);
      expect(result).toBe(0);
    });

    it('should calculate completeness for basic metadata only', () => {
      const mock = createMockExtractionResult({
        hasFunctions: false,
        hasClasses: false,
        hasImports: false,
        hasExports: false,
        hasMetrics: false,
        hasPatterns: false
      });
      const result = calculateCompleteness(mock);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should have higher completeness with more extractors', () => {
      const minimal = createMockExtractionResult({
        hasFunctions: false,
        hasClasses: false,
        hasImports: false,
        hasExports: false
      });
      const full = createMockExtractionResult({
        hasFunctions: true,
        hasClasses: true,
        hasImports: true,
        hasExports: true
      });

      const minimalScore = calculateCompleteness(minimal);
      const fullScore = calculateCompleteness(full);

      expect(fullScore).toBeGreaterThan(minimalScore);
    });

    it('should return 100 for complete results', () => {
      const mock = createMockExtractionResult({
        hasFunctions: true,
        hasClasses: true,
        hasImports: true,
        hasExports: true,
        hasMetrics: true,
        hasPatterns: true
      });
      
      // Add actual data to each section
      mock.functions.functions = [{ name: 'test' }];
      mock.classes.classes = [{ name: 'TestClass' }];
      mock.imports.all = [{ source: './test' }];
      mock.exports.all = [{ name: 'test' }];
      mock.patterns.architectural = ['singleton'];

      const result = calculateCompleteness(mock);
      expect(result).toBe(100);
    });
  });

  describe('shouldNeedLLM', () => {
    it('should return false for simple results', () => {
      const mock = createMockExtractionResult({ completeness: 100 });
      mock.functions.functions = [];
      mock.classes.classes = [];
      mock.imports.metrics = { total: 0 };

      const result = shouldNeedLLM(mock, calculateCompleteness);
      expect(result).toBe(false);
    });

    it('should return true for low completeness', () => {
      const mock = createMockExtractionResult({ completeness: 30 });
      const result = shouldNeedLLM(mock, calculateCompleteness);
      expect(result).toBe(true);
    });

    it('should return true for complex classes', () => {
      const mock = createMockExtractionResult({ completeness: 100 });
      mock.classes.classes = [{
        name: 'ComplexClass',
        methods: Array(15).fill({ name: 'method' }),
        inheritanceDepth: 3
      }];

      const result = shouldNeedLLM(mock, calculateCompleteness);
      expect(result).toBe(true);
    });

    it('should return true for high async usage', () => {
      const mock = createMockExtractionResult({ completeness: 100 });
      mock.asyncPatterns = {
        asyncFunctionCount: 10,
        awaitCount: 20
      };

      const result = shouldNeedLLM(mock, calculateCompleteness);
      expect(result).toBe(true);
    });

    it('should return true for many dependencies', () => {
      const mock = createMockExtractionResult({ completeness: 100 });
      mock.imports.metrics = { total: 25 };

      const result = shouldNeedLLM(mock, calculateCompleteness);
      expect(result).toBe(true);
    });

    it('should return false when no complexity triggers', () => {
      const mock = createMockExtractionResult({ completeness: 80 });
      mock.functions.functions = [{ name: 'simple' }];
      mock.classes.classes = [{ name: 'SimpleClass', methods: [], inheritanceDepth: 0 }];
      mock.asyncPatterns = { asyncFunctionCount: 2, awaitCount: 3 };
      mock.imports.metrics = { total: 5 };

      const result = shouldNeedLLM(mock, calculateCompleteness);
      expect(result).toBe(false);
    });
  });

  describe('countActiveExtractors', () => {
    it('should return 0 for empty results', () => {
      const result = countActiveExtractors({});
      expect(result).toBe(0);
    });

    it('should count successful extractors', () => {
      const mock = createMockExtractionResult({
        hasFunctions: true,
        hasClasses: true,
        hasImports: false,
        hasExports: false
      });
      const result = countActiveExtractors(mock);
      expect(result).toBe(2);
    });

    it('should not count failed extractors', () => {
      const mock = createMockExtractionResult({ hasFunctions: true });
      mock.functions._metadata.success = false;
      
      const result = countActiveExtractors(mock);
      expect(result).toBe(0);
    });

    it('should return 4 for all successful extractors', () => {
      const mock = createMockExtractionResult({
        hasFunctions: true,
        hasClasses: true,
        hasImports: true,
        hasExports: true
      });
      const result = countActiveExtractors(mock);
      expect(result).toBe(4);
    });
  });

  describe('assessQuality', () => {
    it('should assess high quality for completeness >= 80', () => {
      const result = assessQuality({}, 85);
      expect(result.level).toBe('high');
    });

    it('should assess medium quality for completeness >= 50', () => {
      const result = assessQuality({}, 60);
      expect(result.level).toBe('medium');
    });

    it('should assess low quality for completeness < 50', () => {
      const result = assessQuality({}, 40);
      expect(result.level).toBe('low');
    });

    it('should include completeness score', () => {
      const result = assessQuality({}, 75);
      expect(result.completeness).toBe(75);
    });

    it('should include issues for low quality', () => {
      const result = assessQuality({}, 40);
      expect(result.issues).toContain('low_completeness');
    });

    it('should not include issues for high quality', () => {
      const result = assessQuality({}, 90);
      expect(result.issues).toHaveLength(0);
    });

    it('should include recommendations', () => {
      const result = assessQuality({}, 40);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should recommend LLM for low completeness', () => {
      const result = assessQuality({}, 40);
      expect(result.recommendations.some(r => r.includes('LLM'))).toBe(true);
    });

    it('should warn about no functions detected', () => {
      const mock = createMockExtractionResult({ hasFunctions: true });
      mock.functions.totalCount = 0;
      const result = assessQuality(mock, 80);
      expect(result.recommendations.some(r => r.includes('No functions'))).toBe(true);
    });
  });
});
