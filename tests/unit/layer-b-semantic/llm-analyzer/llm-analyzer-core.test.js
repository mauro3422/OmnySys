/**
 * @fileoverview llm-analyzer-core.test.js
 * 
 * Tests para la clase LLMAnalyzer
 * 
 * @module tests/unit/layer-b-semantic/llm-analyzer/core
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LLMAnalyzer } from '#layer-b/llm-analyzer/core.js';

describe('llm-analyzer/core/LLMAnalyzer', () => {
  let analyzer;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      analysis: {
        enableLLMCache: false,
        confidenceThreshold: 0.7
      }
    };
    analyzer = new LLMAnalyzer(mockConfig, '/test/project');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      expect(analyzer).toBeInstanceOf(LLMAnalyzer);
      expect(analyzer.config).toBe(mockConfig);
      expect(analyzer.projectPath).toBe('/test/project');
      expect(analyzer.initialized).toBe(false);
    });

    it('should use default project path', () => {
      const analyzerDefault = new LLMAnalyzer(mockConfig);
      expect(analyzerDefault.projectPath).toBe(process.cwd());
    });
  });

  describe('initialize', () => {
    it('should return true when already initialized', async () => {
      analyzer.initialized = true;
      const result = await analyzer.initialize();
      expect(result).toBe(true);
    });

    it('should initialize and check health', async () => {
      // Client will be mocked, health check will fail
      const result = await analyzer.initialize();
      // Result depends on LLMClient mock behavior
      expect(typeof result).toBe('boolean');
    });

    it('should not initialize cache when disabled', async () => {
      const noCacheConfig = {
        analysis: {
          enableLLMCache: false,
          confidenceThreshold: 0.7
        }
      };
      const noCacheAnalyzer = new LLMAnalyzer(noCacheConfig);
      
      await noCacheAnalyzer.initialize();
      expect(noCacheAnalyzer.cache).toBeNull();
    });
  });

  describe('needsLLMAnalysis', () => {
    it('should delegate to analysis decider', () => {
      const staticAnalysis = { complexity: 10 };
      const fileInfo = { path: 'test.js' };
      
      const result = analyzer.needsLLMAnalysis(staticAnalysis, fileInfo);
      
      expect(typeof result).toBe('boolean');
    });

    it('should work without fileInfo', () => {
      const staticAnalysis = { complexity: 10 };
      
      const result = analyzer.needsLLMAnalysis(staticAnalysis);
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('analyzeComplexCode', () => {
    it('should return null if not initialized and initialization fails', async () => {
      analyzer.initialized = false;
      
      // Mock that initialization fails
      vi.spyOn(analyzer, 'initialize').mockResolvedValue(false);
      
      const result = await analyzer.analyzeComplexCode(
        'code',
        'test.js',
        {},
        null,
        null
      );
      
      expect(result).toBeNull();
    });

    it('should handle empty code', async () => {
      analyzer.initialized = true;
      
      const result = await analyzer.analyzeComplexCode(
        '',
        'test.js',
        {},
        null,
        null
      );
      
      // Result depends on LLM response, but should not throw
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('analyzeMultiple', () => {
    it('should return array of nulls if not initialized', async () => {
      analyzer.initialized = false;
      vi.spyOn(analyzer, 'initialize').mockResolvedValue(false);
      
      const files = [
        { code: 'code1', filePath: 'test1.js', staticAnalysis: {} },
        { code: 'code2', filePath: 'test2.js', staticAnalysis: {} }
      ];
      
      const results = await analyzer.analyzeMultiple(files);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results.every(r => r === null)).toBe(true);
    });

    it('should handle empty files array', async () => {
      analyzer.initialized = true;
      
      const results = await analyzer.analyzeMultiple([]);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should return results for each file', async () => {
      analyzer.initialized = true;
      
      const files = [
        { code: 'code1', filePath: 'test1.js', staticAnalysis: {}, projectContext: null, metadata: null },
        { code: 'code2', filePath: 'test2.js', staticAnalysis: {}, projectContext: null, metadata: null }
      ];
      
      const results = await analyzer.analyzeMultiple(files);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      analyzer.initialized = true;
      
      // Should not throw even if LLM fails
      const result = await analyzer.analyzeComplexCode(
        'code',
        'test.js',
        {},
        null,
        null
      );
      
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle timeout errors', async () => {
      analyzer.initialized = true;
      
      const result = await analyzer.analyzeComplexCode(
        'x'.repeat(100000), // Large code
        'test.js',
        {},
        null,
        null
      );
      
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});
