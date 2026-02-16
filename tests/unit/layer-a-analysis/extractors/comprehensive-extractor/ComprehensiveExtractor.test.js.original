/**
 * @fileoverview ComprehensiveExtractor.test.js
 * 
 * Tests for the main ComprehensiveExtractor orchestrator
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor/ComprehensiveExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ComprehensiveExtractor, 
  createExtractor,
  DEFAULT_CONFIG 
} from '#layer-a/extractors/comprehensive-extractor/ComprehensiveExtractor.js';
import {
  ExtractionConfigBuilder,
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants
} from '../../../../factories/comprehensive-extractor-test.factory.js';

describe('ComprehensiveExtractor', () => {
  const FILE_PATH = 'test/file.js';
  let extractor;

  beforeEach(() => {
    extractor = new ComprehensiveExtractor();
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const extractor = new ComprehensiveExtractor();
      expect(extractor.config).toBeDefined();
      expect(extractor.config.extractors.functions).toBe(true);
      expect(extractor.config.extractors.classes).toBe(true);
    });

    it('should merge user config with defaults', () => {
      const customConfig = { detailLevel: 'detailed' };
      const extractor = new ComprehensiveExtractor(customConfig);
      expect(extractor.config.detailLevel).toBe('detailed');
      expect(extractor.config.extractors.functions).toBe(true);
    });

    it('should initialize with empty cache', () => {
      expect(extractor.cache.size).toBe(0);
    });

    it('should initialize stats object', () => {
      expect(extractor.stats).toBeDefined();
    });
  });

  describe('createExtractor factory function', () => {
    it('should create ComprehensiveExtractor instance', () => {
      const ext = createExtractor();
      expect(ext).toBeInstanceOf(ComprehensiveExtractor);
    });

    it('should apply config to created extractor', () => {
      const ext = createExtractor({ detailLevel: 'minimal' });
      expect(ext.config.detailLevel).toBe('minimal');
    });
  });

  describe('extract() - Basic Extraction', () => {
    it('should extract from empty file', () => {
      const scenario = ExtractionScenarioFactory.emptyFile();
      const result = extractor.extract(scenario.filePath, scenario.code);

      expect(ExtractionValidator.isValidExtractionResult(result)).toBe(true);
      expect(result.basic.filePath).toBe(scenario.filePath);
    });

    it('should extract from simple module', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      const result = extractor.extract(FILE_PATH, scenario.code);

      expect(ExtractionValidator.hasImports(result)).toBe(true);
      expect(ExtractionValidator.hasExports(result)).toBe(true);
      expect(ExtractionValidator.hasFunctions(result)).toBe(true);
    });

    it('should extract from complex module', () => {
      const scenario = ExtractionScenarioFactory.complexModule();
      const result = extractor.extract(FILE_PATH, scenario.code);

      expect(ExtractionValidator.hasImports(result)).toBe(true);
      expect(ExtractionValidator.hasClasses(result)).toBe(true);
      expect(ExtractionValidator.hasFunctions(result)).toBe(true);
      expect(ExtractionValidator.hasExports(result)).toBe(true);
    });

    it('should include basic metadata', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      const result = extractor.extract(FILE_PATH, scenario.code);

      expect(result.basic).toBeDefined();
      expect(result.basic.filePath).toBe(FILE_PATH);
      expect(typeof result.basic.size).toBe('number');
      expect(typeof result.basic.lineCount).toBe('number');
    });

    it('should include _meta information', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      const result = extractor.extract(FILE_PATH, scenario.code);

      expect(result._meta).toBeDefined();
      expect(typeof result._meta.extractionTime).toBe('number');
      expect(typeof result._meta.completeness).toBe('number');
      expect(result._meta.timestamp).toBeDefined();
      expect(result._meta.version).toBeDefined();
    });

    it('should include needsLLM flag', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      const result = extractor.extract(FILE_PATH, scenario.code);

      expect(typeof result.needsLLM).toBe('boolean');
    });
  });

  describe('extract() - Caching', () => {
    it('should cache extraction results', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      
      extractor.extract(FILE_PATH, scenario.code);
      expect(extractor.cache.size).toBe(1);
    });

    it('should return cached result on second extraction', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      
      const result1 = extractor.extract(FILE_PATH, scenario.code);
      const result2 = extractor.extract(FILE_PATH, scenario.code);
      
      expect(result1).toBe(result2);
    });

    it('should skip cache when skipCache option is true', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      
      const result1 = extractor.extract(FILE_PATH, scenario.code);
      const result2 = extractor.extract(FILE_PATH, scenario.code, { skipCache: true });
      
      expect(result1).not.toBe(result2);
    });
  });

  describe('extract() - Configurable Extractors', () => {
    it('should extract only functions when configured', () => {
      const config = ExtractionConfigBuilder.functionsOnly();
      const ext = new ComprehensiveExtractor(config);
      const scenario = ExtractionScenarioFactory.complexModule();
      
      const result = ext.extract(FILE_PATH, scenario.code);
      
      expect(result.functions).toBeDefined();
      expect(result.classes).toBeUndefined();
      expect(result.imports).toBeUndefined();
      expect(result.exports).toBeUndefined();
    });

    it('should extract only classes when configured', () => {
      const config = ExtractionConfigBuilder.classesOnly();
      const ext = new ComprehensiveExtractor(config);
      const scenario = ExtractionScenarioFactory.complexModule();
      
      const result = ext.extract(FILE_PATH, scenario.code);
      
      expect(result.classes).toBeDefined();
      expect(result.functions).toBeUndefined();
      expect(result.imports).toBeUndefined();
      expect(result.exports).toBeUndefined();
    });

    it('should not calculate metrics when disabled', () => {
      const config = ExtractionConfigBuilder.standard().withMetrics(false);
      const ext = new ComprehensiveExtractor(config);
      const scenario = ExtractionScenarioFactory.simpleModule();
      
      const result = ext.extract(FILE_PATH, scenario.code);
      
      expect(result.metrics).toBeUndefined();
    });

    it('should not detect patterns when disabled', () => {
      const config = ExtractionConfigBuilder.standard().withPatternDetection(false);
      const ext = new ComprehensiveExtractor(config);
      const scenario = ExtractionScenarioFactory.simpleModule();
      
      const result = ext.extract(FILE_PATH, scenario.code);
      
      expect(result.patterns).toBeUndefined();
    });
  });

  describe('extract() - Error Handling', () => {
    it('should handle extraction errors gracefully', () => {
      const result = extractor.extract(FILE_PATH, null);
      
      expect(result.error).toBeDefined();
      expect(result._meta.error).toBe(true);
      expect(result.needsLLM).toBe(true);
    });

    it('should return basic metadata even on error', () => {
      const result = extractor.extract(FILE_PATH, null);
      
      expect(result.basic).toBeDefined();
      expect(result.basic.filePath).toBe(FILE_PATH);
    });
  });

  describe('clearCache()', () => {
    it('should clear all cached results', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      extractor.extract(FILE_PATH, scenario.code);
      
      extractor.clearCache();
      
      expect(extractor.cache.size).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return extractor statistics', () => {
      const stats = extractor.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.cacheSize).toBe('number');
      expect(stats.config).toBeDefined();
    });

    it('should reflect current cache size', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      extractor.extract(FILE_PATH, scenario.code);
      
      const stats = extractor.getStats();
      expect(stats.cacheSize).toBe(1);
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration', () => {
      extractor.updateConfig({ detailLevel: 'detailed' });
      
      expect(extractor.config.detailLevel).toBe('detailed');
    });

    it('should clear cache when config is updated', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      extractor.extract(FILE_PATH, scenario.code);
      
      extractor.updateConfig({ detailLevel: 'detailed' });
      
      expect(extractor.cache.size).toBe(0);
    });
  });

  describe('File Type Detection', () => {
    it('should detect test files', () => {
      const code = 'function test() {}';
      const result = extractor.extract('test/file.test.js', code);
      
      expect(result.basic.isTestFile).toBe(true);
    });

    it('should detect config files', () => {
      const code = 'export default {}';
      const result = extractor.extract('test/app.config.js', code);
      
      expect(result.basic.isConfigFile).toBe(true);
    });

    it('should detect TypeScript files', () => {
      const code = 'function test(): void {}';
      const result = extractor.extract('test/file.ts', code);
      
      expect(result.basic.isTypeScript).toBe(true);
    });

    it('should detect JSX files', () => {
      const code = 'const x = <div />';
      const result = extractor.extract('test/file.jsx', code);
      
      expect(result.basic.isJSX).toBe(true);
    });
  });

  describe('Completeness Calculation', () => {
    it('should calculate completeness for empty file', () => {
      const scenario = ExtractionScenarioFactory.emptyFile();
      const result = extractor.extract(scenario.filePath, scenario.code);
      
      expect(typeof result._meta.completeness).toBe('number');
    });

    it('should have higher completeness for files with more constructs', () => {
      const simpleScenario = ExtractionScenarioFactory.simpleModule();
      const complexScenario = ExtractionScenarioFactory.complexModule();
      
      const simpleResult = extractor.extract(FILE_PATH, simpleScenario.code);
      const complexResult = extractor.extract(FILE_PATH, complexScenario.code);
      
      expect(complexResult._meta.completeness).toBeGreaterThanOrEqual(simpleResult._meta.completeness);
    });
  });

  describe('needsLLM flag', () => {
    it('should set needsLLM based on completeness', () => {
      const scenario = ExtractionScenarioFactory.emptyFile();
      const result = extractor.extract(scenario.filePath, scenario.code);
      
      // Empty file should need LLM
      expect(result.needsLLM).toBe(true);
    });

    it('should set needsLLM for complex files', () => {
      const scenario = ExtractionScenarioFactory.complexModule();
      const result = extractor.extract(FILE_PATH, scenario.code);
      
      // Complex files might still need LLM based on complexity
      expect(typeof result.needsLLM).toBe('boolean');
    });
  });

  describe('options override', () => {
    it('should allow per-extraction option overrides', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      
      const result = extractor.extract(FILE_PATH, scenario.code, {
        calculateMetrics: false
      });
      
      expect(result.metrics).toBeUndefined();
    });

    it('should not affect extractor config with per-extraction options', () => {
      const scenario = ExtractionScenarioFactory.simpleModule();
      const originalConfig = { ...extractor.config };
      
      extractor.extract(FILE_PATH, scenario.code, { detailLevel: 'minimal' });
      
      expect(extractor.config.detailLevel).toBe(originalConfig.detailLevel);
    });
  });
});
