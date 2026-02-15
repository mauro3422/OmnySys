/**
 * @fileoverview Tests for data-flow.js extractor
 * 
 * @module tests/data-flow
 */

import { describe, it, expect } from 'vitest';
import { extractDataFlow } from '#layer-a/extractors/metadata/data-flow.js';

describe('data-flow', () => {
  describe('basic structure', () => {
    it('should export extractDataFlow function', () => {
      expect(typeof extractDataFlow).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractDataFlow('');
      expect(result).toHaveProperty('assignments');
      expect(result).toHaveProperty('returnStatements');
      expect(result).toHaveProperty('parameterUsage');
      expect(result).toHaveProperty('spreadUsage');
      expect(result).toHaveProperty('all');
    });
  });

  describe('assignment detection', () => {
    it('should detect const declarations', () => {
      const code = 'const x = 42;';
      const result = extractDataFlow(code);
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0]).toMatchObject({
        type: 'const',
        variable: 'x',
        value: '42'
      });
    });

    it('should detect let declarations', () => {
      const code = 'let x = 10;';
      const result = extractDataFlow(code);
      expect(result.assignments[0].type).toBe('let');
    });

    it('should detect var declarations', () => {
      const code = 'var x = "hello";';
      const result = extractDataFlow(code);
      expect(result.assignments[0].type).toBe('var');
    });

    it('should capture complex values', () => {
      const code = 'const obj = { a: 1, b: 2 };';
      const result = extractDataFlow(code);
      expect(result.assignments[0].value).toBe('{ a: 1, b: 2 }');
    });

    it('should include line numbers', () => {
      const code = 'const x = 5;';
      const result = extractDataFlow(code);
      expect(result.assignments[0].line).toBeDefined();
      expect(typeof result.assignments[0].line).toBe('number');
    });

    it('should detect multiple assignments', () => {
      const code = `
        const a = 1;
        const b = 2;
        const c = 3;
      `;
      const result = extractDataFlow(code);
      expect(result.assignments).toHaveLength(3);
    });
  });

  describe('return statement detection', () => {
    it('should detect simple returns', () => {
      const code = 'function f() { return 42; }';
      const result = extractDataFlow(code);
      expect(result.returnStatements).toHaveLength(1);
      expect(result.returnStatements[0]).toMatchObject({
        value: '42'
      });
    });

    it('should detect returns with expressions', () => {
      const code = 'function f() { return a + b; }';
      const result = extractDataFlow(code);
      expect(result.returnStatements[0].value).toBe('a + b');
    });

    it('should detect multiple returns', () => {
      const code = `
        function f(x) {
          if (x) return 1;
          return 0;
        }
      `;
      const result = extractDataFlow(code);
      expect(result.returnStatements).toHaveLength(2);
    });

    it('should detect empty returns', () => {
      const code = 'function f() { return; }';
      const result = extractDataFlow(code);
      expect(result.returnStatements[0].value).toBe('');
    });
  });

  describe('destructuring detection', () => {
    it('should detect object destructuring', () => {
      const code = 'const { a, b, c } = obj;';
      const result = extractDataFlow(code);
      expect(result.spreadUsage).toHaveLength(1);
      expect(result.spreadUsage[0]).toMatchObject({
        type: 'object',
        variables: ['a', 'b', 'c']
      });
    });

    it('should detect array destructuring', () => {
      const code = 'const [ x, y ] = arr;';
      const result = extractDataFlow(code);
      expect(result.spreadUsage[0]).toMatchObject({
        type: 'array',
        variables: ['x', 'y']
      });
    });

    it('should detect spread operator', () => {
      const code = 'const arr = [...items];';
      const result = extractDataFlow(code);
      expect(result.spreadUsage[0].type).toBe('spread');
    });

    it('should detect nested destructuring', () => {
      const code = 'const { a: { b } } = obj;';
      const result = extractDataFlow(code);
      expect(result.spreadUsage.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parameter usage detection', () => {
    it('should detect function parameters', () => {
      const code = 'function f(a, b, c) {}';
      const result = extractDataFlow(code);
      expect(result.parameterUsage).toHaveLength(1);
      expect(result.parameterUsage[0]).toMatchObject({
        params: ['a', 'b', 'c'],
        count: 3
      });
    });

    it('should detect arrow function parameters', () => {
      const code = 'const f = (x, y) => x + y;';
      const result = extractDataFlow(code);
      expect(result.parameterUsage[0].params).toEqual(['x', 'y']);
    });

    it('should detect parameter count', () => {
      const code = `
        function a() {}
        function b(x) {}
        function c(x, y, z) {}
      `;
      const result = extractDataFlow(code);
      expect(result.parameterUsage).toHaveLength(3);
    });

    it('should handle destructured parameters', () => {
      const code = 'function f({ a, b }) {}';
      const result = extractDataFlow(code);
      expect(result.parameterUsage[0].params).toContain('{ a, b }');
    });
  });

  describe('all array', () => {
    it('should combine all data flow items', () => {
      const code = `
        const x = 5;
        function f(a) {
          return a + x;
        }
      `;
      const result = extractDataFlow(code);
      expect(result.all.length).toBeGreaterThanOrEqual(2);
    });

    it('should categorize items correctly', () => {
      const code = `
        const x = 5;
        function f(a) { return a; }
        const { y } = obj;
      `;
      const result = extractDataFlow(code);
      const categories = result.all.map(item => item.category);
      expect(categories).toContain('assignment');
      expect(categories).toContain('return');
      expect(categories).toContain('spread');
      expect(categories).toContain('parameter');
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractDataFlow('');
      expect(result.assignments).toHaveLength(0);
      expect(result.returnStatements).toHaveLength(0);
      expect(result.spreadUsage).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should handle code without data flow', () => {
      const code = '/* comment only */';
      const result = extractDataFlow(code);
      expect(result.all).toHaveLength(0);
    });

    it('should handle complex expressions', () => {
      const code = `
        const result = items
          .map(x => x * 2)
          .filter(x => x > 5)
          .reduce((a, b) => a + b, 0);
      `;
      const result = extractDataFlow(code);
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].value).toContain('map');
    });
  });
});
