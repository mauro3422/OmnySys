/**
 * @fileoverview Parameter Extractor Tests
 * 
 * Tests for the parameter extraction functions.
 * 
 * @module tests/data-flow/input-extractor/param-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractParameters,
  parseParameter,
  parseDestructuring
} from '../../../../../../src/layer-a-static/extractors/data-flow/visitors/input-extractor/extractors/param-extractor.js';
import { parseCode } from '../__factories__/data-flow-test.factory.js';

describe('extractParameters', () => {
  it('should extract empty array for no parameters', () => {
    const ast = parseCode('function foo() {}');
    const functionNode = ast.program.body[0];
    
    const params = extractParameters(functionNode.params);

    expect(params).toEqual([]);
  });

  it('should extract single parameter', () => {
    const ast = parseCode('function foo(x) {}');
    const functionNode = ast.program.body[0];
    
    const params = extractParameters(functionNode.params);

    expect(params).toHaveLength(1);
    expect(params[0].name).toBe('x');
  });

  it('should extract multiple parameters', () => {
    const ast = parseCode('function foo(a, b, c) {}');
    const functionNode = ast.program.body[0];
    
    const params = extractParameters(functionNode.params);

    expect(params).toHaveLength(3);
    expect(params.map(p => p.name)).toEqual(['a', 'b', 'c']);
  });

  it('should assign correct positions', () => {
    const ast = parseCode('function foo(a, b, c) {}');
    const functionNode = ast.program.body[0];
    
    const params = extractParameters(functionNode.params);

    expect(params[0].position).toBe(0);
    expect(params[1].position).toBe(1);
    expect(params[2].position).toBe(2);
  });
});

describe('parseParameter', () => {
  describe('Simple Parameters', () => {
    it('should parse simple identifier', () => {
      const ast = parseCode('function foo(x) {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result).toEqual({
        name: 'x',
        position: 0,
        type: 'simple',
        hasDefault: false
      });
    });

    it('should parse multiple identifiers', () => {
      const ast = parseCode('function foo(a, b) {}');
      const params = ast.program.body[0].params;
      
      const result1 = parseParameter(params[0], 0);
      const result2 = parseParameter(params[1], 1);

      expect(result1.name).toBe('a');
      expect(result2.name).toBe('b');
    });
  });

  describe('Parameters with Defaults', () => {
    it('should parse parameter with default', () => {
      const ast = parseCode('function foo(x = 5) {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result.hasDefault).toBe(true);
    });

    it('should parse parameter with string default', () => {
      const ast = parseCode('function foo(x = "default") {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result.hasDefault).toBe(true);
      expect(result.defaultValue).toBeDefined();
    });

    it('should parse parameter with null default', () => {
      const ast = parseCode('function foo(x = null) {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result.hasDefault).toBe(true);
    });
  });

  describe('Destructured Parameters', () => {
    it('should parse object destructuring', () => {
      const ast = parseCode('function foo({ a, b }) {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result.type).toBe('destructured-object');
      expect(result.properties).toHaveLength(2);
    });

    it('should parse array destructuring', () => {
      const ast = parseCode('function foo([a, b]) {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result.type).toBe('destructured-array');
      expect(result.properties).toHaveLength(2);
    });

    it('should handle destructuring with defaults', () => {
      const ast = parseCode('function foo({ a } = {}) {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result.hasDefault).toBe(true);
    });
  });

  describe('Rest Parameters', () => {
    it('should parse rest parameter', () => {
      const ast = parseCode('function foo(...args) {}');
      const param = ast.program.body[0].params[0];
      
      const result = parseParameter(param, 0);

      expect(result.type).toBe('rest');
      expect(result.isRest).toBe(true);
      expect(result.name).toBe('args');
    });
  });

  describe('Unknown Parameter Types', () => {
    it('should return null for unknown types', () => {
      const unknownParam = { type: 'UnknownType' };
      
      const result = parseParameter(unknownParam, 0);

      expect(result).toBeNull();
    });
  });
});

describe('parseDestructuring', () => {
  describe('Object Destructuring', () => {
    it('should parse simple object destructuring', () => {
      const ast = parseCode('function foo({ a, b }) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.type).toBe('destructured-object');
      expect(result.properties).toHaveLength(2);
    });

    it('should map property names correctly', () => {
      const ast = parseCode('function foo({ a, b }) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.properties[0].original).toBe('a');
      expect(result.properties[0].local).toBe('a');
    });

    it('should handle aliased properties', () => {
      const ast = parseCode('function foo({ a: x, b: y }) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.properties[0].original).toBe('a');
      expect(result.properties[0].local).toBe('x');
    });

    it('should handle properties with defaults', () => {
      const ast = parseCode('function foo({ a = 1 }) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.properties[0].hasDefault).toBe(true);
    });

    it('should handle mixed aliased and regular', () => {
      const ast = parseCode('function foo({ a, b: renamed }) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.properties[0].local).toBe('a');
      expect(result.properties[1].local).toBe('renamed');
    });
  });

  describe('Array Destructuring', () => {
    it('should parse simple array destructuring', () => {
      const ast = parseCode('function foo([a, b]) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.type).toBe('destructured-array');
      expect(result.properties).toHaveLength(2);
    });

    it('should assign correct indices', () => {
      const ast = parseCode('function foo([a, b, c]) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.properties[0].index).toBe(0);
      expect(result.properties[1].index).toBe(1);
      expect(result.properties[2].index).toBe(2);
    });

    it('should handle array elements with defaults', () => {
      const ast = parseCode('function foo([a = 1]) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.properties[0].hasDefault).toBe(true);
    });

    it('should skip empty slots', () => {
      const ast = parseCode('function foo([a, , c]) {}');
      const pattern = ast.program.body[0].params[0];
      
      const result = parseDestructuring(pattern, 0);

      expect(result.properties).toHaveLength(2);
    });
  });

  describe('Default Values', () => {
    it('should handle object destructuring with default', () => {
      const ast = parseCode('function foo({ a } = {}) {}');
      const pattern = ast.program.body[0].params[0];
      const defaultValue = ast.program.body[0].params[0].right;
      
      const result = parseDestructuring(pattern, 0, defaultValue);

      expect(result.hasDefault).toBe(true);
    });

    it('should handle array destructuring with default', () => {
      const ast = parseCode('function foo([a] = []) {}');
      const pattern = ast.program.body[0].params[0];
      const defaultValue = ast.program.body[0].params[0].right;
      
      const result = parseDestructuring(pattern, 0, defaultValue);

      expect(result.hasDefault).toBe(true);
    });
  });

  describe('Unknown Patterns', () => {
    it('should return null for unknown pattern types', () => {
      const unknownPattern = { type: 'UnknownPattern' };
      
      const result = parseDestructuring(unknownPattern, 0);

      expect(result).toBeNull();
    });
  });
});
