/**
 * @fileoverview defaults.test.js
 * 
 * Tests for the default configuration module
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor/config/defaults
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  EXTRACTOR_STATS,
  DETAIL_LEVELS,
  mergeConfig
} from '#layer-a/extractors/comprehensive-extractor/config/defaults.js';

describe('Config - Defaults', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have extractors object', () => {
      expect(DEFAULT_CONFIG.extractors).toBeDefined();
      expect(typeof DEFAULT_CONFIG.extractors).toBe('object');
    });

    it('should have all extractors enabled by default', () => {
      expect(DEFAULT_CONFIG.extractors.functions).toBe(true);
      expect(DEFAULT_CONFIG.extractors.classes).toBe(true);
      expect(DEFAULT_CONFIG.extractors.imports).toBe(true);
      expect(DEFAULT_CONFIG.extractors.exports).toBe(true);
    });

    it('should have detailLevel set to standard', () => {
      expect(DEFAULT_CONFIG.detailLevel).toBe('standard');
    });

    it('should have includeSource set to false', () => {
      expect(DEFAULT_CONFIG.includeSource).toBe(false);
    });

    it('should have calculateMetrics set to true', () => {
      expect(DEFAULT_CONFIG.calculateMetrics).toBe(true);
    });

    it('should have detectPatterns set to true', () => {
      expect(DEFAULT_CONFIG.detectPatterns).toBe(true);
    });

    it('should have timeout set to 30000', () => {
      expect(DEFAULT_CONFIG.timeout).toBe(30000);
    });
  });

  describe('EXTRACTOR_STATS', () => {
    it('should have total count', () => {
      expect(typeof EXTRACTOR_STATS.total).toBe('number');
      expect(EXTRACTOR_STATS.total).toBe(4);
    });

    it('should have categories object', () => {
      expect(EXTRACTOR_STATS.categories).toBeDefined();
      expect(typeof EXTRACTOR_STATS.categories).toBe('object');
    });

    it('should have function category', () => {
      expect(EXTRACTOR_STATS.categories.function).toBeDefined();
      expect(EXTRACTOR_STATS.categories.function.count).toBe(1);
      expect(typeof EXTRACTOR_STATS.categories.function.impact).toBe('string');
    });

    it('should have class category', () => {
      expect(EXTRACTOR_STATS.categories.class).toBeDefined();
      expect(EXTRACTOR_STATS.categories.class.count).toBe(1);
    });

    it('should have import category', () => {
      expect(EXTRACTOR_STATS.categories.import).toBeDefined();
      expect(EXTRACTOR_STATS.categories.import.count).toBe(1);
    });

    it('should have export category', () => {
      expect(EXTRACTOR_STATS.categories.export).toBeDefined();
      expect(EXTRACTOR_STATS.categories.export.count).toBe(1);
    });

    it('should have llmReduction value', () => {
      expect(typeof EXTRACTOR_STATS.llmReduction).toBe('string');
    });
  });

  describe('DETAIL_LEVELS', () => {
    it('should have minimal level', () => {
      expect(DETAIL_LEVELS.minimal).toBeDefined();
      expect(DETAIL_LEVELS.minimal.includeSource).toBe(false);
      expect(DETAIL_LEVELS.minimal.includeAST).toBe(false);
      expect(DETAIL_LEVELS.minimal.maxDepth).toBe(1);
    });

    it('should have standard level', () => {
      expect(DETAIL_LEVELS.standard).toBeDefined();
      expect(DETAIL_LEVELS.standard.includeSource).toBe(false);
      expect(DETAIL_LEVELS.standard.includeAST).toBe(false);
      expect(DETAIL_LEVELS.standard.maxDepth).toBe(2);
    });

    it('should have detailed level', () => {
      expect(DETAIL_LEVELS.detailed).toBeDefined();
      expect(DETAIL_LEVELS.detailed.includeSource).toBe(true);
      expect(DETAIL_LEVELS.detailed.includeAST).toBe(true);
      expect(DETAIL_LEVELS.detailed.maxDepth).toBe(5);
    });
  });

  describe('mergeConfig', () => {
    it('should return default config when no user config provided', () => {
      const result = mergeConfig();
      expect(result.extractors.functions).toBe(DEFAULT_CONFIG.extractors.functions);
      expect(result.detailLevel).toBe(DEFAULT_CONFIG.detailLevel);
    });

    it('should merge user config with defaults', () => {
      const userConfig = { detailLevel: 'detailed' };
      const result = mergeConfig(userConfig);
      expect(result.detailLevel).toBe('detailed');
      expect(result.extractors.functions).toBe(DEFAULT_CONFIG.extractors.functions);
    });

    it('should merge extractors deeply', () => {
      const userConfig = { extractors: { functions: false } };
      const result = mergeConfig(userConfig);
      expect(result.extractors.functions).toBe(false);
      expect(result.extractors.classes).toBe(DEFAULT_CONFIG.extractors.classes);
    });

    it('should not mutate default config', () => {
      const originalDetailLevel = DEFAULT_CONFIG.detailLevel;
      mergeConfig({ detailLevel: 'minimal' });
      expect(DEFAULT_CONFIG.detailLevel).toBe(originalDetailLevel);
    });

    it('should handle empty user config', () => {
      const result = mergeConfig({});
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should handle null user config', () => {
      const result = mergeConfig(null);
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should preserve all default extractors when partial override', () => {
      const userConfig = { extractors: { imports: false } };
      const result = mergeConfig(userConfig);
      expect(result.extractors.imports).toBe(false);
      expect(result.extractors.functions).toBe(true);
      expect(result.extractors.classes).toBe(true);
      expect(result.extractors.exports).toBe(true);
    });
  });
});
