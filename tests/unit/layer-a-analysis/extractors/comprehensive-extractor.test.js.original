/**
 * @fileoverview Tests for ComprehensiveExtractor - Meta-Factory Pattern
 * 
 * Main orchestrator for comprehensive code extraction.
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor
 */

import { describe, it, expect } from 'vitest';
import { createTestSuite } from '#test-factories/test-suite-generator';
import { ComprehensiveExtractor, createExtractor } from '#layer-a/extractors/comprehensive-extractor/index.js';

// Contract-based test suite
createTestSuite({
  module: 'extractors/comprehensive-extractor',
  exports: { ComprehensiveExtractor, createExtractor },
  contracts: ['structure'],
  contractOptions: {
    exportNames: ['ComprehensiveExtractor', 'createExtractor']
  },
  specificTests: [
    {
      name: 'ComprehensiveExtractor can be instantiated',
      fn: () => {
        const extractor = new ComprehensiveExtractor();
        expect(extractor).toBeInstanceOf(ComprehensiveExtractor);
        expect(extractor.config).toBeDefined();
        expect(extractor.cache).toBeInstanceOf(Map);
      }
    },
    {
      name: 'extracts functions from code',
      fn: () => {
        const extractor = new ComprehensiveExtractor();
        const result = extractor.extract('test.js', 'function add(a, b) { return a + b; }');
        
        expect(result).toBeDefined();
        expect(result._meta).toBeDefined();
        expect(result._meta.extractionTime).toBeDefined();
      }
    },
    {
      name: 'handles empty code gracefully',
      fn: () => {
        const extractor = new ComprehensiveExtractor();
        const result = extractor.extract('empty.js', '');
        
        expect(result).toBeDefined();
        expect(result.basic).toBeDefined();
        expect(result._meta).toBeDefined();
      }
    },
    {
      name: 'createExtractor factory function works',
      fn: () => {
        const extractor = createExtractor({ extractors: { functions: true } });
        
        expect(extractor).toBeInstanceOf(ComprehensiveExtractor);
        expect(extractor.config.extractors.functions).toBe(true);
      }
    },
    {
      name: 'caches results for same input',
      fn: () => {
        const extractor = new ComprehensiveExtractor();
        const code = 'function test() {}';
        
        const result1 = extractor.extract('cache.js', code);
        const result2 = extractor.extract('cache.js', code);
        
        // Should be the same cached object
        expect(result1).toBe(result2);
      }
    },
    {
      name: 'clearCache resets cache',
      fn: () => {
        const extractor = new ComprehensiveExtractor();
        extractor.extract('test.js', 'function test() {}');
        
        expect(extractor.cache.size).toBeGreaterThan(0);
        
        extractor.clearCache();
        
        expect(extractor.cache.size).toBe(0);
      }
    }
  ]
});
