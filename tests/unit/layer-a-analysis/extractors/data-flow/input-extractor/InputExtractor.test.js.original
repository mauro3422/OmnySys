/**
 * @fileoverview InputExtractor Class Tests
 * 
 * Tests for the main InputExtractor class.
 * 
 * @module tests/data-flow/input-extractor/InputExtractor
 */

import { describe, it, expect } from 'vitest';
import { InputExtractor } from '../../../../../../src/layer-a-static/extractors/data-flow/visitors/input-extractor/InputExtractor.js';
import { InputBuilder, TestFixtures, parseCode } from '../__factories__/data-flow-test.factory.js';

describe('InputExtractor', () => {
  describe('Simple Parameters', () => {
    it('should extract single parameter', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(x) { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].name).toBe('x');
      expect(inputs[0].type).toBe('simple');
      expect(inputs[0].position).toBe(0);
    });

    it('should extract multiple parameters', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(a, b, c) { return a + b + c; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(3);
      expect(inputs.map(i => i.name)).toEqual(['a', 'b', 'c']);
    });

    it('should extract no parameters from parameterless function', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo() { return 42; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(0);
    });
  });

  describe('Default Values', () => {
    it('should detect parameters with defaults', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(x = 5) { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].hasDefault).toBe(true);
    });

    it('should extract string default values', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function greet(name = "World") { return name; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].defaultValue).toBeDefined();
    });

    it('should extract numeric default values', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function calc(x = 42) { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].defaultValue).toBeDefined();
    });

    it('should handle mixed defaults', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(a, b = 1, c = "test") { return a + b + c; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].hasDefault).toBe(false);
      expect(inputs[1].hasDefault).toBe(true);
      expect(inputs[2].hasDefault).toBe(true);
    });
  });

  describe('Destructured Parameters', () => {
    it('should extract object destructuring', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo({ a, b }) { return a + b; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].type).toBe('destructured-object');
      expect(inputs[0].properties).toHaveLength(2);
    });

    it('should extract array destructuring', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo([a, b, c]) { return a; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].type).toBe('destructured-array');
      expect(inputs[0].properties).toHaveLength(3);
    });

    it('should map destructured property names correctly', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo({ name: userName, age }) { return userName; }');
      
      const inputs = extractor.extract(ast);

      const prop = inputs[0].properties.find(p => p.original === 'name');
      expect(prop.local).toBe('userName');
    });

    it('should handle destructuring with defaults', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo({ x = 1, y = 2 } = {}) { return x + y; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].hasDefault).toBe(true);
      expect(inputs[0].properties[0].hasDefault).toBe(true);
    });

    it('should handle nested destructuring', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo({ user: { name } }) { return name; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].type).toBe('destructured-object');
    });
  });

  describe('Rest Parameters', () => {
    it('should extract rest parameter', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(...args) { return args; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].type).toBe('rest');
      expect(inputs[0].isRest).toBe(true);
    });

    it('should handle rest with regular params', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(first, ...rest) { return rest; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(2);
      expect(inputs[0].type).toBe('simple');
      expect(inputs[1].type).toBe('rest');
    });
  });

  describe('Function Types', () => {
    it('should handle function declarations', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(x) { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
    });

    it('should handle function expressions', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('const foo = function(x) { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
    });

    it('should handle arrow functions', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('const foo = (x) => x;');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
    });

    it('should handle arrow functions with block', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('const foo = (x) => { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
    });

    it('should handle exported functions', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('export function foo(x) { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
    });

    it('should handle default exported functions', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('export default function(x) { return x; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
    });
  });

  describe('Usage Tracking', () => {
    it('should track simple usages', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(x) { return x + 1; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].usages).toBeDefined();
      expect(inputs[0].usages.length).toBeGreaterThan(0);
    });

    it('should track property access', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(obj) { return obj.name; }');
      
      const inputs = extractor.extract(ast);

      const usage = inputs[0].usages.find(u => u.type === 'property_access');
      expect(usage).toBeDefined();
      expect(usage.property).toBe('name');
    });

    it('should track function call arguments', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(x) { return bar(x); }');
      
      const inputs = extractor.extract(ast);

      const usage = inputs[0].usages.find(u => u.type === 'argument_pass');
      expect(usage).toBeDefined();
    });

    it('should track multiple usages', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(x) { const y = x + 1; return x * y; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].usages.length).toBeGreaterThan(1);
    });

    it('should track destructured property usages', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo({ a, b }) { return a + b; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].usages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle null AST gracefully', () => {
      const extractor = new InputExtractor('foo');
      
      const inputs = extractor.extract(null);

      expect(inputs).toEqual([]);
    });

    it('should handle AST without function', () => {
      const extractor = new InputExtractor('foo');
      const ast = parseCode('const x = 5;');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toEqual([]);
    });

    it('should handle malformed parameters', () => {
      const extractor = new InputExtractor('foo');
      // This should not throw
      const ast = parseCode('function foo() { return 1; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle this parameter', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(this, x) { return this[x]; }');
      
      const inputs = extractor.extract(ast);

      // TypeScript 'this' parameter should be handled
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should handle many parameters', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(a, b, c, d, e, f, g, h, i, j) { return a; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(10);
    });

    it('should preserve parameter order', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(z, a, m) { return z; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs[0].name).toBe('z');
      expect(inputs[1].name).toBe('a');
      expect(inputs[2].name).toBe('m');
    });

    it('should handle empty destructuring', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo({}) { return 1; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(1);
    });
  });
});
