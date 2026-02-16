/**
 * @fileoverview Usage Analyzer Tests
 * 
 * Tests for the usage analysis functions.
 * 
 * @module tests/data-flow/input-extractor/usage-analyzer
 */

import { describe, it, expect } from 'vitest';
import { findUsages } from '../../../../../../src/layer-a-static/extractors/data-flow/visitors/input-extractor/analyzers/usage-analyzer.js';
import { parseCode } from '../__factories__/data-flow-test.factory.js';

describe('findUsages', () => {
  it('should return empty map for no inputs', () => {
    const ast = parseCode('function foo() {}');
    const functionNode = ast.program.body[0];
    
    const usages = findUsages(functionNode, []);

    expect(usages.size).toBe(0);
  });

  it('should find simple references', () => {
    const ast = parseCode('function foo(x) { return x; }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'x' }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('x')).toHaveLength(1);
    expect(usages.get('x')[0].type).toBe('reference');
  });

  it('should find multiple references', () => {
    const ast = parseCode('function foo(x) { const y = x + 1; return x * y; }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'x' }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('x').length).toBeGreaterThanOrEqual(2);
  });

  it('should track property access', () => {
    const ast = parseCode('function foo(obj) { return obj.name; }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'obj' }];
    
    const usages = findUsages(functionNode, inputs);

    const usage = usages.get('obj').find(u => u.type === 'property_access');
    expect(usage).toBeDefined();
    expect(usage.property).toBe('name');
  });

  it('should track nested property access', () => {
    const ast = parseCode('function foo(obj) { return obj.a.b.c; }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'obj' }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('obj').length).toBeGreaterThan(0);
  });

  it('should track computed property access', () => {
    const ast = parseCode('function foo(obj, key) { return obj[key]; }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'obj' }, { name: 'key' }];
    
    const usages = findUsages(functionNode, inputs);

    const objUsage = usages.get('obj').find(u => u.type === 'property_access');
    expect(objUsage).toBeDefined();
  });

  it('should track argument passing', () => {
    const ast = parseCode('function foo(x) { return bar(x); }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'x' }];
    
    const usages = findUsages(functionNode, inputs);

    const usage = usages.get('x').find(u => u.type === 'argument_pass');
    expect(usage).toBeDefined();
    expect(usage.toFunction).toBe('bar');
  });

  it('should track argument position', () => {
    const ast = parseCode('function foo(x, y) { return bar(x, y); }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'x' }, { name: 'y' }];
    
    const usages = findUsages(functionNode, inputs);

    const xUsage = usages.get('x').find(u => u.type === 'argument_pass');
    const yUsage = usages.get('y').find(u => u.type === 'argument_pass');

    expect(xUsage.argumentPosition).toBe(0);
    expect(yUsage.argumentPosition).toBe(1);
  });

  it('should track spread operator', () => {
    const ast = parseCode('function foo(args) { return bar(...args); }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'args' }];
    
    const usages = findUsages(functionNode, inputs);

    const usage = usages.get('args').find(u => u.type === 'spread');
    expect(usage).toBeDefined();
  });

  it('should track destructured property usages', () => {
    const ast = parseCode('function foo({ a, b }) { return a + b; }');
    const functionNode = ast.program.body[0];
    const inputs = [{
      name: '__destructured_0',
      type: 'destructured-object',
      properties: [
        { original: 'a', local: 'a' },
        { original: 'b', local: 'b' }
      ]
    }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('__destructured_0').length).toBeGreaterThan(0);
  });

  it('should track array destructured usages', () => {
    const ast = parseCode('function foo([a, b]) { return a + b; }');
    const functionNode = ast.program.body[0];
    const inputs = [{
      name: '__destructured_0',
      type: 'destructured-array',
      properties: [
        { index: 0, local: 'a' },
        { index: 1, local: 'b' }
      ]
    }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('__destructured_0').length).toBeGreaterThan(0);
  });

  it('should handle no body', () => {
    const ast = parseCode('function foo(x);');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'x' }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('x')).toEqual([]);
  });

  it('should handle arrow function expression body', () => {
    const ast = parseCode('const foo = (x) => x;');
    const functionNode = ast.program.body[0].declarations[0].init;
    const inputs = [{ name: 'x' }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('x').length).toBeGreaterThan(0);
  });

  it('should respect depth limit', () => {
    const ast = parseCode(`
      function foo(x) {
        return {
          a: {
            b: {
              c: {
                d: {
                  e: x
                }
              }
            }
          }
        };
      }
    `);
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'x' }];
    
    // Should not throw with deep nesting
    const usages = findUsages(functionNode, inputs);

    expect(usages).toBeDefined();
  });

  it('should track multiple input usages', () => {
    const ast = parseCode('function foo(a, b, c) { return a + b + c; }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages.get('a').length).toBeGreaterThan(0);
    expect(usages.get('b').length).toBeGreaterThan(0);
    expect(usages.get('c').length).toBeGreaterThan(0);
  });

  it('should not track non-input variables', () => {
    const ast = parseCode('function foo(x) { const y = 5; return y; }');
    const functionNode = ast.program.body[0];
    const inputs = [{ name: 'x' }];
    
    const usages = findUsages(functionNode, inputs);

    // Should not track y since it's not an input
    expect(usages.has('y')).toBe(false);
  });

  it('should track this expressions', () => {
    const ast = parseCode('function foo() { return this.value; }');
    const functionNode = ast.program.body[0];
    const inputs = [];
    
    const usages = findUsages(functionNode, inputs);

    expect(usages).toBeDefined();
  });
});
