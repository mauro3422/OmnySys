/**
 * @fileoverview Tests for call-graph.js extractor
 * 
 * @module tests/call-graph
 */

import { describe, it, expect } from 'vitest';
import { extractCallGraph } from '#layer-a/extractors/metadata/call-graph.js';

describe('call-graph', () => {
  describe('basic structure', () => {
    it('should export extractCallGraph function', () => {
      expect(typeof extractCallGraph).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractCallGraph('');
      expect(result).toHaveProperty('functionDefinitions');
      expect(result).toHaveProperty('internalCalls');
      expect(result).toHaveProperty('externalCalls');
      expect(result).toHaveProperty('all');
    });
  });

  describe('function definition detection', () => {
    it('should detect regular function declarations', () => {
      const code = 'function myFunction() { return 42; }';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions).toHaveLength(1);
      expect(result.functionDefinitions[0]).toMatchObject({
        name: 'myFunction',
        params: [],
        isAsync: false,
        isExported: false
      });
    });

    it('should detect exported function declarations', () => {
      const code = 'export function myFunction() {}';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions[0].isExported).toBe(true);
    });

    it('should detect async function declarations', () => {
      const code = 'async function fetchData() {}';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions[0].isAsync).toBe(true);
    });

    it('should detect exported async functions', () => {
      const code = 'export async function fetchData() {}';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions[0]).toMatchObject({
        isAsync: true,
        isExported: true
      });
    });

    it('should detect function parameters', () => {
      const code = 'function fn(a, b, c) {}';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions[0].params).toEqual(['a', 'b', 'c']);
    });

    it('should detect function expressions', () => {
      const code = 'const myFn = function(a, b) {};';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions).toHaveLength(1);
      expect(result.functionDefinitions[0].name).toBe('myFn');
    });

    it('should detect arrow functions', () => {
      const code = 'const myFn = (x, y) => x + y;';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions).toHaveLength(1);
      expect(result.functionDefinitions[0].params).toEqual(['x', 'y']);
    });

    it('should detect async arrow functions', () => {
      const code = 'const myFn = async (x) => await fetch(x);';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions[0].isAsync).toBe(true);
    });

    it('should detect exported const arrow functions', () => {
      const code = 'export const myFn = (x) => x;';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions[0].isExported).toBe(true);
    });

    it('should include line numbers', () => {
      const code = 'function myFunction() {}';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions[0].line).toBeDefined();
      expect(typeof result.functionDefinitions[0].line).toBe('number');
    });
  });

  describe('internal call detection', () => {
    it('should detect calls to defined functions', () => {
      const code = `
        function helper() { return 42; }
        function main() { return helper(); }
      `;
      const result = extractCallGraph(code);
      expect(result.internalCalls).toHaveLength(1);
      expect(result.internalCalls[0]).toMatchObject({
        callee: 'helper',
        type: 'internal'
      });
    });

    it('should detect multiple internal calls', () => {
      const code = `
        function a() {}
        function b() {}
        function main() {
          a();
          b();
          a();
        }
      `;
      const result = extractCallGraph(code);
      expect(result.internalCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip keyword calls', () => {
      const code = `
        function test() {
          if (true) return;
          for (let i = 0; i < 10; i++) {}
        }
      `;
      const result = extractCallGraph(code);
      expect(result.internalCalls).toHaveLength(0);
    });
  });

  describe('external call detection', () => {
    it('should detect calls to imported functions', () => {
      const code = `
        import { helper } from './helpers.js';
        function main() { return helper(); }
      `;
      const result = extractCallGraph(code);
      expect(result.externalCalls).toHaveLength(1);
      expect(result.externalCalls[0]).toMatchObject({
        callee: 'helper',
        type: 'external'
      });
    });

    it('should detect default import calls', () => {
      const code = `
        import lodash from 'lodash';
        function main() { return lodash.map([], x => x); }
      `;
      const result = extractCallGraph(code);
      expect(result.externalCalls[0].callee).toBe('lodash');
    });

    it('should detect namespace import calls', () => {
      const code = `
        import * as utils from './utils.js';
        function main() { return utils.helper(); }
      `;
      const result = extractCallGraph(code);
      expect(result.externalCalls[0].callee).toBe('utils');
    });
  });

  describe('combined scenarios', () => {
    it('should handle complex module with imports and calls', () => {
      const code = `
        import { helper } from './helpers.js';
        import utils from './utils.js';
        
        export function publicFn() {
          return internalFn();
        }
        
        function internalFn() {
          return helper() + utils.doSomething();
        }
      `;
      const result = extractCallGraph(code);
      expect(result.functionDefinitions).toHaveLength(2);
      expect(result.internalCalls.length).toBeGreaterThanOrEqual(1);
      expect(result.externalCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should categorize all items correctly', () => {
      const code = `
        import { ext } from './ext.js';
        function internal() {}
        export function main() {
          internal();
          ext();
        }
      `;
      const result = extractCallGraph(code);
      const categories = result.all.map(item => item.category);
      expect(categories).toContain('definition');
      expect(categories).toContain('internal_call');
      expect(categories).toContain('external_call');
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractCallGraph('');
      expect(result.functionDefinitions).toHaveLength(0);
      expect(result.internalCalls).toHaveLength(0);
      expect(result.externalCalls).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should handle code with no functions', () => {
      const code = 'const x = 42;';
      const result = extractCallGraph(code);
      expect(result.functionDefinitions).toHaveLength(0);
    });

    it('should handle deeply nested calls', () => {
      const code = `
        function a() {}
        function b() { a(); }
        function c() { b(); }
        function d() { c(); }
      `;
      const result = extractCallGraph(code);
      expect(result.internalCalls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
