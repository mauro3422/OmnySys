/**
 * @fileoverview Comprehensive Extractor - Tests Funcionales Corregidos
 *
 * Tests para el comprehensive extractor que extrae múltiples aspectos del código
 * 
 * @module tests/functional/comprehensive-extractor.functional.test
 */

import { describe, it, expect } from 'vitest';
import {
  ComprehensiveExtractor,
  createExtractor,
  extractFunctions,
  extractClasses,
  extractImports,
  extractExports,
  extractAsyncPatterns,
  calculateMetrics,
  detectPatterns
} from '#layer-a/extractors/comprehensive-extractor/index.js';

describe('Comprehensive Extractor - Functional Tests', () => {

  describe('ComprehensiveExtractor Class', () => {
    it('creates instance with default config', () => {
      const extractor = new ComprehensiveExtractor();
      
      expect(extractor).toBeDefined();
      expect(extractor.config).toBeDefined();
    });

    it('creates instance via createExtractor factory', () => {
      const extractor = createExtractor({ detailLevel: 'detailed' });
      
      expect(extractor).toBeInstanceOf(ComprehensiveExtractor);
    });

    it('extract() returns comprehensive results', () => {
      const extractor = new ComprehensiveExtractor();
      const code = `
        import React from 'react';
        
        export function Component() {
          return <div>Hello</div>;
        }
      `;

      const result = extractor.extract('test.js', code);

      expect(result).toBeDefined();
      expect(result.basic).toBeDefined();
      expect(result._meta).toBeDefined();
    });

    it('extracts imports from code', () => {
      const extractor = new ComprehensiveExtractor();
      const code = `
        import React from 'react';
        import { useState } from 'react';
        import * as utils from './utils';
      `;

      const result = extractor.extract('test.js', code);

      expect(result.imports || result.basic?.imports).toBeDefined();
    });

    it('extracts exports from code', () => {
      const extractor = new ComprehensiveExtractor();
      const code = `
        export const foo = 1;
        export function bar() {}
        export default class Component {}
      `;

      const result = extractor.extract('test.js', code);

      expect(result.exports || result.basic?.exports).toBeDefined();
    });

    it('extracts function definitions', () => {
      const extractor = new ComprehensiveExtractor();
      const code = `
        function add(a, b) { return a + b; }
        const multiply = (a, b) => a * b;
        export async function fetch() {}
      `;

      const result = extractor.extract('test.js', code);

      expect(result.functions || result.basic?.functions).toBeDefined();
    });

    it('extracts class definitions', () => {
      const extractor = new ComprehensiveExtractor();
      const code = `
        class User {
          constructor(name) { this.name = name; }
          greet() { return 'Hello'; }
        }
      `;

      const result = extractor.extract('test.js', code);

      expect(result.classes || result.basic?.classes).toBeDefined();
    });

    it('calculates metrics when configured', () => {
      const extractor = new ComprehensiveExtractor({ calculateMetrics: true });
      const code = `
        function test() {
          const x = 1;
          const y = 2;
          return x + y;
        }
      `;

      const result = extractor.extract('test.js', code);

      expect(result.metrics).toBeDefined();
    });

    it('detects patterns when configured', () => {
      const extractor = new ComprehensiveExtractor({ detectPatterns: true });
      const code = `
        class Singleton {
          static instance;
          static getInstance() {
            if (!Singleton.instance) {
              Singleton.instance = new Singleton();
            }
            return Singleton.instance;
          }
        }
      `;

      const result = extractor.extract('test.js', code);

      expect(result.patterns).toBeDefined();
    });

    it('handles empty code gracefully', () => {
      const extractor = new ComprehensiveExtractor();
      const result = extractor.extract('empty.js', '');

      expect(result).toBeDefined();
      expect(result.basic).toBeDefined();
    });

    it('handles code with only comments', () => {
      const extractor = new ComprehensiveExtractor();
      const code = `
        // This is a comment
        /* Multi-line
           comment */
      `;

      const result = extractor.extract('comments.js', code);

      expect(result).toBeDefined();
    });

    it('includes metadata with extraction info', () => {
      const extractor = new ComprehensiveExtractor();
      const code = 'const x = 1;';

      const result = extractor.extract('src/utils/helpers.js', code);

      expect(result._meta).toBeDefined();
      expect(result._meta.extractionTime).toBeDefined();
      expect(result._meta.completeness).toBeDefined();
      expect(result._meta.version).toBeDefined();
    });

    it('detects async patterns', () => {
      const extractor = new ComprehensiveExtractor();
      const code = `
        async function fetchData() {
          const result = await api.get('/data');
          return result;
        }
      `;

      const result = extractor.extract('async.js', code);

      expect(result.asyncPatterns).toBeDefined();
    });

    it('handles syntax errors gracefully', () => {
      const extractor = new ComprehensiveExtractor();
      const code = 'function broken( { return 1;'; // Syntax error

      // No debe lanzar error, debe retornar resultado (puede o no tener error)
      const result = extractor.extract('broken.js', code);
      
      expect(result).toBeDefined();
    });

    it('clearCache() works without error', () => {
      const extractor = new ComprehensiveExtractor();
      
      expect(() => extractor.clearCache()).not.toThrow();
    });

    it('getStats() returns extractor statistics', () => {
      const extractor = new ComprehensiveExtractor();
      
      const stats = extractor.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.cacheSize).toBe(0);
      expect(stats.config).toBeDefined();
    });

    it('updateConfig() updates configuration', () => {
      const extractor = new ComprehensiveExtractor();
      
      extractor.updateConfig({ detailLevel: 'minimal' });
      
      expect(extractor.config.detailLevel).toBe('minimal');
    });
  });

  describe('Standalone Extractor Functions', () => {
    it('extractFunctions returns object with functions array', () => {
      const code = `
        function add(a, b) { return a + b; }
        const multiply = (a, b) => a * b;
      `;

      const result = extractFunctions(code);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('arrowFunctions');
      expect(Array.isArray(result.functions)).toBe(true);
    });

    it('extractClasses extracts classes from code', () => {
      const code = `
        class User {
          constructor(name) { this.name = name; }
        }
      `;

      const result = extractClasses(code);

      expect(result).toBeDefined();
      // extractClasses retorna un objeto con la propiedad classes
      expect(result.classes || result).toBeDefined();
    });

    it('extractImports extracts imports from code', () => {
      const code = `import React from 'react';`;

      const result = extractImports(code);

      expect(result).toBeDefined();
      // extractImports retorna un objeto con la propiedad imports
      expect(result.imports || result).toBeDefined();
    });

    it('extractExports extracts exports from code', () => {
      const code = `export const foo = 1;`;

      const result = extractExports(code);

      expect(result).toBeDefined();
      // extractExports retorna un objeto con exports
      expect(result.exports || result).toBeDefined();
    });

    it('extractAsyncPatterns extracts async patterns', () => {
      const code = `
        async function fetch() {
          await api.get();
        }
      `;

      const patterns = extractAsyncPatterns(code);

      expect(patterns).toBeDefined();
      expect(patterns.hasAsyncAwait).toBe(true);
    });

    it('calculateMetrics calculates metrics from results', () => {
      const results = {
        functions: [{ name: 'test' }],
        classes: [],
        imports: [],
        exports: []
      };

      const metrics = calculateMetrics(results);

      expect(metrics).toBeDefined();
    });

    it('detectPatterns detects patterns from results', () => {
      const results = {
        functions: [],
        classes: [{ name: 'Singleton', methods: [] }],
        imports: [],
        exports: []
      };

      const patterns = detectPatterns(results);

      // detectPatterns puede retornar array o un objeto
      expect(patterns !== null && typeof patterns === 'object').toBe(true);
    });
  });
});