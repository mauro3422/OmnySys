/**
 * @fileoverview OutputExtractor Tests
 * 
 * Tests for the OutputExtractor class that extracts function outputs
 * (returns, throws, side effects) from function ASTs.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/visitors/output-extractor/OutputExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OutputExtractor } from '#layer-a/extractors/data-flow/visitors/output-extractor/OutputExtractor.js';
import { OutputTestBuilder, ASTNodeBuilder } from '#test-factories/data-flow-test.factory.js';

describe('OutputExtractor', () => {
  describe('constructor', () => {
    it('should initialize with function code and empty transformations', () => {
      const extractor = new OutputExtractor('function test() {}');
      expect(extractor.code).toBe('function test() {}');
      expect(extractor.transformations).toEqual([]);
      expect(extractor.outputs).toEqual([]);
    });

    it('should initialize with provided transformations', () => {
      const transformations = [{ to: 'x', from: 'y' }];
      const extractor = new OutputExtractor('function test() {}', transformations);
      expect(extractor.transformations).toEqual(transformations);
    });
  });

  describe('extract - simple returns', () => {
    it('should extract explicit return statement', () => {
      const { ast } = new OutputTestBuilder().withSimpleReturn('x').build();
      const extractor = new OutputExtractor('function test(x) { return x; }');
      const outputs = extractor.extract(ast);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('return');
      expect(outputs[0].value).toBe('x');
    });

    it('should extract return with literal value', () => {
      const { ast } = new OutputTestBuilder().withSimpleReturn('42').build();
      const extractor = new OutputExtractor('function test() { return 42; }');
      const outputs = extractor.extract(ast);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('return');
    });

    it('should extract return with object expression', () => {
      const returnObj = ASTNodeBuilder.objectExpression([
        { key: 'name', value: ASTNodeBuilder.identifier('name') },
        { key: 'value', value: ASTNodeBuilder.identifier('value') }
      ]);
      const ast = ASTNodeBuilder.functionDeclaration('test', ['name', 'value'], [
        ASTNodeBuilder.returnStatement(returnObj, 2)
      ]);
      
      const extractor = new OutputExtractor('function test(name, value) { return { name, value }; }');
      const outputs = extractor.extract(ast);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('return');
      expect(outputs[0].shape).toBe('object');
    });
  });

  describe('extract - implicit returns', () => {
    it('should extract implicit return from arrow function expression', () => {
      const { ast } = new OutputTestBuilder().withArrowReturn('x * 2').build();
      const extractor = new OutputExtractor('x => x * 2');
      const outputs = extractor.extract(ast);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('return');
      expect(outputs[0].implicit).toBe(true);
    });

    it('should handle arrow function returning object literal', () => {
      const objExpr = ASTNodeBuilder.objectExpression([
        { key: 'id', value: ASTNodeBuilder.identifier('id') }
      ]);
      const ast = ASTNodeBuilder.arrowFunctionExpression(['id'], objExpr, true);
      
      const extractor = new OutputExtractor('id => ({ id })');
      const outputs = extractor.extract(ast);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('return');
      expect(outputs[0].shape).toBe('object');
    });
  });

  describe('extract - undefined returns', () => {
    it('should add undefined return for function without explicit return', () => {
      const { ast } = new OutputTestBuilder().withNoReturn().build();
      const extractor = new OutputExtractor('function test() { console.log("hello"); }');
      const outputs = extractor.extract(ast);

      expect(outputs.length).toBeGreaterThan(0);
      const undefinedReturn = outputs.find(o => o.value === 'undefined');
      expect(undefinedReturn).toBeDefined();
      expect(undefinedReturn.type).toBe('return');
    });

    it('should handle empty function body', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', [], []);
      const extractor = new OutputExtractor('function test() {}');
      const outputs = extractor.extract(ast);

      expect(outputs.length).toBeGreaterThan(0);
    });
  });

  describe('extract - throw statements', () => {
    it('should extract throw statement', () => {
      const { ast } = new OutputTestBuilder().withThrow('Error message').build();
      const extractor = new OutputExtractor('function test() { throw "Error message"; }');
      const outputs = extractor.extract(ast);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('throw');
    });

    it('should extract throw with Error constructor', () => {
      const errorCall = ASTNodeBuilder.callExpression('Error', [ASTNodeBuilder.literal('custom error')]);
      const ast = ASTNodeBuilder.functionDeclaration('test', [], [
        ASTNodeBuilder.throwStatement(errorCall, 2)
      ]);
      
      const extractor = new OutputExtractor('function test() { throw new Error("custom error"); }');
      const outputs = extractor.extract(ast);

      expect(outputs[0].type).toBe('throw');
    });
  });

  describe('extract - side effects', () => {
    it('should extract console.log side effect', () => {
      const { ast } = new OutputTestBuilder().withSideEffect('console.log', ['hello']).build();
      const extractor = new OutputExtractor('function test() { console.log("hello"); }');
      const outputs = extractor.extract(ast);

      const sideEffect = outputs.find(o => o.type === 'side_effect');
      expect(sideEffect).toBeDefined();
    });

    it('should extract localStorage access as side effect', () => {
      const localStorageCall = ASTNodeBuilder.callExpression(
        ASTNodeBuilder.memberExpression('localStorage', 'setItem'),
        [ASTNodeBuilder.literal('key'), ASTNodeBuilder.literal('value')]
      );
      const ast = ASTNodeBuilder.functionDeclaration('test', [], [
        ASTNodeBuilder.expressionStatement(localStorageCall, 2)
      ]);
      
      const extractor = new OutputExtractor('function test() { localStorage.setItem("key", "value"); }');
      const outputs = extractor.extract(ast);

      const sideEffect = outputs.find(o => o.type === 'side_effect');
      expect(sideEffect).toBeDefined();
    });

    it('should extract DOM manipulation as side effect', () => {
      const domCall = ASTNodeBuilder.callExpression(
        ASTNodeBuilder.memberExpression('document', 'getElementById'),
        [ASTNodeBuilder.literal('app')]
      );
      const ast = ASTNodeBuilder.functionDeclaration('test', [], [
        ASTNodeBuilder.expressionStatement(domCall, 2)
      ]);
      
      const extractor = new OutputExtractor('function test() { document.getElementById("app"); }');
      const outputs = extractor.extract(ast);

      const sideEffect = outputs.find(o => o.type === 'side_effect');
      expect(sideEffect).toBeDefined();
    });
  });

  describe('extract - control flow', () => {
    it('should handle if statement with return in consequent', () => {
      const { ast } = new OutputTestBuilder().withConditionalReturn().build();
      const extractor = new OutputExtractor('function test(x) { if (x) return 1; else return 0; }');
      const outputs = extractor.extract(ast);

      expect(outputs.filter(o => o.type === 'return')).toHaveLength(2);
    });

    it('should handle try-catch with returns in both blocks', () => {
      const { ast } = new OutputTestBuilder().withTryCatchReturn().build();
      const extractor = new OutputExtractor('function test() { try { return "success"; } catch (e) { return "error"; } }');
      const outputs = extractor.extract(ast);

      expect(outputs.filter(o => o.type === 'return')).toHaveLength(2);
    });

    it('should handle switch statement with returns', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', ['type'], [
        {
          type: 'SwitchStatement',
          discriminant: ASTNodeBuilder.identifier('type'),
          cases: [
            {
              type: 'SwitchCase',
              test: ASTNodeBuilder.literal('A'),
              consequent: [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1), 3)]
            },
            {
              type: 'SwitchCase',
              test: ASTNodeBuilder.literal('B'),
              consequent: [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(2), 5)]
            }
          ],
          loc: { start: { line: 2 }, end: { line: 6 } }
        }
      ]);
      
      const extractor = new OutputExtractor('function test(type) { switch(type) { case "A": return 1; case "B": return 2; } }');
      const outputs = extractor.extract(ast);

      expect(outputs.filter(o => o.type === 'return')).toHaveLength(2);
    });
  });

  describe('extract - edge cases', () => {
    it('should return empty array when function AST is null', () => {
      const extractor = new OutputExtractor('function test() {}');
      const outputs = extractor.extract(null);
      expect(outputs).toEqual([]);
    });

    it('should return empty array when function node has no body', () => {
      const ast = { type: 'Program', body: [] };
      const extractor = new OutputExtractor('function test() {}');
      const outputs = extractor.extract(ast);
      expect(outputs).toEqual([]);
    });

    it('should handle multiple side effects in same function', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', [], [
        ASTNodeBuilder.expressionStatement(ASTNodeBuilder.callExpression('console.log', [ASTNodeBuilder.literal('1')]), 2),
        ASTNodeBuilder.expressionStatement(ASTNodeBuilder.callExpression('console.warn', [ASTNodeBuilder.literal('2')]), 3),
        ASTNodeBuilder.expressionStatement(ASTNodeBuilder.callExpression('console.error', [ASTNodeBuilder.literal('3')]), 4)
      ]);
      
      const extractor = new OutputExtractor('function test() { console.log("1"); console.warn("2"); console.error("3"); }');
      const outputs = extractor.extract(ast);

      const sideEffects = outputs.filter(o => o.type === 'side_effect');
      expect(sideEffects.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('state tracking', () => {
    it('should track hasReturn flag correctly', () => {
      const { ast } = new OutputTestBuilder().withSimpleReturn('x').build();
      const extractor = new OutputExtractor('function test(x) { return x; }');
      extractor.extract(ast);
      expect(extractor.hasReturn).toBe(true);
    });

    it('should track hasSideEffect flag correctly', () => {
      const { ast } = new OutputTestBuilder().withSideEffect('console.log').build();
      const extractor = new OutputExtractor('function test() { console.log("test"); }');
      extractor.extract(ast);
      expect(extractor.hasSideEffect).toBe(true);
    });
  });
});
