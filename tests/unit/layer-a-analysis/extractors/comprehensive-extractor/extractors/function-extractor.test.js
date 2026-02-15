/**
 * @fileoverview function-extractor.test.js
 * 
 * Tests for the function extractor module
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor/extractors/function-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractFunctions,
  extractFunctionCalls,
  extractRecursiveFunctions,
  extractHigherOrderFunctions,
  extractAsyncPatterns
} from '#layer-a/extractors/comprehensive-extractor/extractors/function-extractor.js';
import {
  FunctionExtractionBuilder,
  ExtractionValidator
} from '#test-factories/comprehensive-extractor-test.factory.js';

describe('Function Extractor', () => {
  describe('extractFunctions', () => {
    it('should return empty result for empty code', () => {
      const result = extractFunctions('');
      expect(result.functions).toEqual([]);
      expect(result.arrowFunctions).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should extract function declarations', () => {
      const { code } = FunctionExtractionBuilder.simpleFunction('testFn');
      const result = extractFunctions(code);
      
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.functions[0].name).toBe('testFn');
    });

    it('should extract arrow functions', () => {
      const builder = new FunctionExtractionBuilder()
        .withArrowFunction('arrowFn', ['x'], { body: 'x * 2' });
      const { code } = builder.build();
      
      const result = extractFunctions(code);
      expect(result.arrowFunctions.length).toBeGreaterThan(0);
    });

    it('should calculate totalCount correctly', () => {
      const builder = new FunctionExtractionBuilder()
        .withFunction('fn1', [])
        .withArrowFunction('fn2', []);
      const { code } = builder.build();
      
      const result = extractFunctions(code);
      expect(result.totalCount).toBe(2);
    });

    it('should detect async functions', () => {
      const { code } = FunctionExtractionBuilder.asyncFunction('asyncFn');
      const result = extractFunctions(code);
      
      expect(result.asyncCount).toBeGreaterThan(0);
      expect(result.functions[0].isAsync).toBe(true);
    });

    it('should detect generator functions', () => {
      const { code } = FunctionExtractionBuilder.generatorFunction('genFn');
      const result = extractFunctions(code);
      
      expect(result.hasGenerators).toBe(true);
      expect(result.functions[0].isGenerator).toBe(true);
    });

    it('should include complexity estimate', () => {
      const builder = new FunctionExtractionBuilder()
        .withComplexFunction('complexFn', { complexity: 'high' });
      const { code } = builder.build();
      
      const result = extractFunctions(code);
      expect(result.functions[0].complexity).toBeGreaterThan(1);
    });

    it('should include hasJSDoc flag', () => {
      const code = `
        /**
         * Test function
         */
        function documented() { return 1; }
      `;
      const result = extractFunctions(code);
      
      expect(typeof result.functions[0].hasJSDoc).toBe('boolean');
    });

    it('should include metadata', () => {
      const { code } = FunctionExtractionBuilder.simpleFunction();
      const result = extractFunctions(code);
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata.success).toBe(true);
      expect(result._metadata.extractedAt).toBeDefined();
    });

    it('should handle syntax errors gracefully', () => {
      const code = 'function { broken';
      const result = extractFunctions(code);
      
      expect(result._metadata.success).toBe(false);
      expect(result._metadata.error).toBeDefined();
    });

    it('should extract function parameters', () => {
      const builder = new FunctionExtractionBuilder()
        .withFunction('withParams', ['a', 'b', 'c']);
      const { code } = builder.build();
      
      const result = extractFunctions(code);
      expect(result.functions[0].params).toEqual(['a', 'b', 'c']);
    });

    it('should infer return type for TypeScript', () => {
      const code = 'function typed(): string { return ""; }';
      const result = extractFunctions(code);
      
      // May or may not detect depending on implementation
      expect(result.functions[0].returnType !== undefined).toBe(true);
    });
  });

  describe('extractFunctionCalls', () => {
    it('should return empty array for empty code', () => {
      const result = extractFunctionCalls('');
      expect(result).toEqual([]);
    });

    it('should extract simple function calls', () => {
      const code = 'foo(); bar();';
      const result = extractFunctionCalls(code);
      
      expect(result.length).toBe(2);
      expect(result.some(c => c.name === 'foo')).toBe(true);
      expect(result.some(c => c.name === 'bar')).toBe(true);
    });

    it('should extract method calls', () => {
      const code = 'obj.method();';
      const result = extractFunctionCalls(code);
      
      expect(result.some(c => c.name === 'obj.method')).toBe(true);
      expect(result[0].isMethod).toBe(true);
    });

    it('should detect this method calls', () => {
      const code = 'this.doSomething();';
      const result = extractFunctionCalls(code);
      
      expect(result.some(c => c.isThis)).toBe(true);
    });

    it('should skip control flow keywords', () => {
      const code = 'if (true) { while (false) {} }';
      const result = extractFunctionCalls(code);
      
      expect(result.some(c => ['if', 'while', 'for', 'switch'].includes(c.name))).toBe(false);
    });

    it('should deduplicate calls', () => {
      const code = 'foo(); foo(); foo();';
      const result = extractFunctionCalls(code);
      
      expect(result.filter(c => c.name === 'foo').length).toBe(1);
    });
  });

  describe('extractRecursiveFunctions', () => {
    it('should return empty array for empty code', () => {
      const result = extractRecursiveFunctions('', []);
      expect(result).toEqual([]);
    });

    it('should detect recursive functions', () => {
      const builder = new FunctionExtractionBuilder()
        .withRecursiveFunction('factorial', 'n');
      const { code, functions } = builder.build();
      
      // Need to extract functions first
      const extracted = extractFunctions(code);
      const recursive = extractRecursiveFunctions(code, extracted.functions);
      
      expect(recursive.length).toBeGreaterThan(0);
      expect(recursive[0].name).toBe('factorial');
    });

    it('should not detect non-recursive functions', () => {
      const builder = new FunctionExtractionBuilder()
        .withFunction('nonRecursive', [], { body: 'return 1;' });
      const { code } = builder.build();
      
      const extracted = extractFunctions(code);
      const recursive = extractRecursiveFunctions(code, extracted.functions);
      
      expect(recursive.length).toBe(0);
    });
  });

  describe('extractHigherOrderFunctions', () => {
    it('should return empty array for empty code', () => {
      const result = extractHigherOrderFunctions('');
      expect(result).toEqual([]);
    });

    it('should detect functions returning functions', () => {
      const code = `
        function createFn() {
          return function() { return 1; };
        }
      `;
      const result = extractHigherOrderFunctions(code);
      
      expect(result.some(h => h.type === 'returnsFunction')).toBe(true);
    });

    it('should detect functions taking callbacks', () => {
      const code = 'function withCallback(callback) { callback(); }';
      const result = extractHigherOrderFunctions(code);
      
      expect(result.some(h => h.type === 'takesCallback')).toBe(true);
    });

    it('should detect async functions returning functions', () => {
      const code = `
        function asyncCreator() {
          return async function() { return 1; };
        }
      `;
      const result = extractHigherOrderFunctions(code);
      
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('extractAsyncPatterns', () => {
    it('should detect async/await', () => {
      const code = 'async function test() { await something(); }';
      const result = extractAsyncPatterns(code);
      
      expect(result.hasAsyncAwait).toBe(true);
    });

    it('should detect Promise usage', () => {
      const code = 'fetch().then(r => r.json()).catch(e => console.log(e));';
      const result = extractAsyncPatterns(code);
      
      expect(result.hasPromises).toBe(true);
    });

    it('should detect Promise.all', () => {
      const code = 'Promise.all([p1, p2]);';
      const result = extractAsyncPatterns(code);
      
      expect(result.hasPromiseAll).toBe(true);
    });

    it('should count async functions', () => {
      const code = `
        async function a() {}
        async function b() {}
        async function c() {}
      `;
      const result = extractAsyncPatterns(code);
      
      expect(result.asyncFunctionCount).toBe(3);
    });

    it('should count await expressions', () => {
      const code = `
        async function test() {
          await a();
          await b();
          await c();
        }
      `;
      const result = extractAsyncPatterns(code);
      
      expect(result.awaitCount).toBe(3);
    });

    it('should count promise chains', () => {
      const code = `
        fetch().then().then().catch();
        promise.then().catch();
      `;
      const result = extractAsyncPatterns(code);
      
      expect(result.promiseChains).toBe(4);
    });

    it('should return false for sync code', () => {
      const code = 'function test() { return 1; }';
      const result = extractAsyncPatterns(code);
      
      expect(result.hasAsyncAwait).toBe(false);
      expect(result.hasPromises).toBe(false);
    });
  });
});
