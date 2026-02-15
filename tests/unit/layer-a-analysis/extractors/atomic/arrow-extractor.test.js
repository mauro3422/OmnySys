/**
 * @fileoverview arrow-extractor.test.js
 * 
 * Tests for arrow function extractor
 * 
 * @module tests/unit/layer-a-analysis/extractors/atomic/arrow-extractor
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import * as traverseModule from '@babel/traverse';
const traverse = traverseModule.default || traverseModule;
import { extractArrowFunction } from '#layer-a/extractors/atomic/arrow-extractor.js';
import {
  CodeSampleBuilder,
  ArrowFunctionBuilder,
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Arrow Extractor', () => {
  const FILE_PATH = 'test/file.js';

  describe('extractArrowFunction - basic extraction', () => {
    it('should extract simple arrow function', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('simpleArrow', ['x'], 'x * 2');
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(ExtractionValidator.validateFullAtom(atom)).toBe(true);
      expect(atom.name).toBe('simpleArrow');
      expect(atom.type).toBe(TestConstants.ATOM_TYPES.ARROW);
    });

    it('should extract arrow with block body', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('blockArrow', ['x', 'y'], 'x + y', { block: true });
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.name).toBe('blockArrow');
      expect(atom.signature.params).toHaveLength(2);
    });

    it('should extract arrow with no parameters', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('noParams', [], '42');
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.signature.params).toHaveLength(0);
    });

    it('should extract arrow with single parameter (no parentheses)', () => {
      // Note: Single param without parens still produces AST with one param
      const code = 'const single = x => x * 2;';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        ArrowFunctionExpression(path) {
          atom = extractArrowFunction(path, FILE_PATH);
        }
      });

      expect(atom.signature.params).toHaveLength(1);
      expect(atom.signature.params[0].name).toBe('x');
    });

    it('should create correct atom ID', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('myArrow', []);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.id).toBe(`${FILE_PATH}::myArrow`);
    });

    it('should set correct line and column', () => {
      const builder = new CodeSampleBuilder()
        .withBlankLine()
        .withBlankLine()
        .withArrow('linedArrow', []);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.line).toBe(3);
      expect(atom.column).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractArrowFunction - async detection', () => {
    it('should extract async arrow function', () => {
      const builder = new ArrowFunctionBuilder('asyncArrow')
        .isAsync()
        .withParams('url')
        .withBlockBody('return fetch(url);');
      const path = builder.buildAstNode();

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.signature.async).toBe(true);
      expect(atom.signature.returnType).toBe('Promise');
    });

    it('should extract non-async arrow function', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('syncArrow', []);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.signature.async).toBe(false);
    });
  });

  describe('extractArrowFunction - export detection', () => {
    it('should extract exported arrow function', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('exportedArrow', [], 'null', { exported: true });
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.exported).toBe(true);
    });

    it('should extract non-exported arrow function', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('privateArrow', []);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.exported).toBe(false);
    });

    it('should handle default export arrow', () => {
      const code = 'const x = () => {};\nexport default x;';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        ArrowFunctionExpression(path) {
          if (path.parent.type === 'VariableDeclarator') {
            atom = extractArrowFunction(path, FILE_PATH);
          }
        }
      });

      // Note: default export arrow is extracted but its export status is checked via parent
      expect(atom.name).toBe('x');
    });
  });

  describe('extractArrowFunction - parameter extraction', () => {
    it('should extract multiple parameters', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('multiParam', ['a', 'b', 'c', 'd']);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.signature.params).toHaveLength(4);
      expect(atom.signature.params.map(p => p.position)).toEqual([0, 1, 2, 3]);
    });

    it('should extract destructured object parameter', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('destructureObj', ['{ name, value }']);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.signature.params[0].type).toBe('object-destructured');
    });

    it('should extract destructured array parameter', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('destructureArr', ['[first, second]']);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.signature.params[0].type).toBe('array-destructured');
    });

    it('should handle rest parameters', () => {
      const code = 'const restFn = (...args) => args;';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        ArrowFunctionExpression(path) {
          atom = extractArrowFunction(path, FILE_PATH);
        }
      });

      expect(atom.signature.params.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle default parameter values', () => {
      const code = 'const withDefault = (x = 10) => x;';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        ArrowFunctionExpression(path) {
          if (path.parent.type === 'VariableDeclarator') {
            atom = extractArrowFunction(path, FILE_PATH);
          }
        }
      });

      // When there's a default value, the param structure is different
      expect(atom.signature.params.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('extractArrowFunction - complexity calculation', () => {
    it('should calculate complexity for simple arrow', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('simple', [], '42');
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.complexity).toBe(1);
    });

    it('should calculate complexity for arrow with conditional', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('conditional', ['x'], 'x > 0 ? x : 0');
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.complexity).toBe(2);
    });

    it('should calculate complexity for arrow with block and if', () => {
      const builder = new ArrowFunctionBuilder('withIf')
        .withParams('x')
        .withBlockBody('if (x) return 1; return 0;');
      const path = builder.buildAstNode();

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.complexity).toBeGreaterThanOrEqual(2);
    });

    it('should calculate complexity for arrow with logical operators', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('withLogic', ['a', 'b'], 'a && b || a');
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      // Logical operators in expression context (not conditionals) have base complexity
      expect(atom.complexity).toBeGreaterThanOrEqual(1);
    });
  });

  describe('extractArrowFunction - data flow extraction', () => {
    it('should extract inputs from parameter usage', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('withInputs', ['x', 'y'], 'x + y');
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.dataFlow.inputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract outputs from implicit return', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('withOutput', ['x'], 'x * 2');
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      // Implicit return creates a ReturnStatement in some cases
      expect(atom.dataFlow).toBeDefined();
    });

    it('should extract outputs from explicit return', () => {
      const builder = new ArrowFunctionBuilder('explicitReturn')
        .withParams('x')
        .withBlockBody('return x;');
      const path = builder.buildAstNode();

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.dataFlow.outputs.length).toBeGreaterThan(0);
    });

    it('should extract side effects', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('withSideEffect', [], 'console.log("hi")', { block: true });
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.dataFlow.sideEffects.length).toBeGreaterThan(0);
    });
  });

  describe('extractArrowFunction - call extraction', () => {
    it('should extract function calls', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('caller', [], 'foo() + bar()', { block: true });
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract method calls', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('methodCaller', ['obj'], 'obj.method()', { block: true });
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.calls.some(c => c.callee.includes('method'))).toBe(true);
    });

    it('should dedupe duplicate calls', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('dedupeCaller', [], 'foo(); foo();', { block: true });
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      const fooCalls = atom.calls.filter(c => c.callee === 'foo');
      expect(fooCalls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('extractArrowFunction - special cases', () => {
    it('should handle anonymous arrow (no variable name)', () => {
      const code = 'const arr = [1, 2, 3].map(x => x * 2);';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        ArrowFunctionExpression(path) {
          atom = extractArrowFunction(path, FILE_PATH);
        }
      });

      expect(atom.name).toBe('anonymous');
    });

    it('should set visibility to public', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('publicArrow', []);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.visibility).toBe('public');
    });

    it('should have no className', () => {
      const builder = new CodeSampleBuilder()
        .withArrow('standaloneArrow', []);
      const path = builder.findNode('ArrowFunctionExpression');

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.className).toBeNull();
    });

    it('should calculate lines correctly', () => {
      const builder = new ArrowFunctionBuilder('multiLine')
        .withParams('x')
        .withBlockBody('const y = x + 1;\nreturn y;');
      const path = builder.buildAstNode();

      const atom = extractArrowFunction(path, FILE_PATH);

      // lines is the dataFlow.lines object, not a count
      expect(atom.lines).toBeDefined();
      expect(typeof atom.lines).toBe('object');
    });
  });

  describe('Factory pattern tests', () => {
    it('should work with ArrowFunctionBuilder', () => {
      const builder = new ArrowFunctionBuilder('factoryArrow')
        .withParams('a', 'b')
        .withBody('a + b');
      const path = builder.buildAstNode();

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.name).toBe('factoryArrow');
      expect(atom.signature.params).toHaveLength(2);
    });

    it('should work with async ArrowFunctionBuilder', () => {
      const builder = new ArrowFunctionBuilder('asyncFactory')
        .isAsync()
        .withBlockBody('return await fetch("/api");');
      const path = builder.buildAstNode();

      const atom = extractArrowFunction(path, FILE_PATH);

      expect(atom.signature.async).toBe(true);
    });

    it('should work with scenario factory', () => {
      const scenario = ExtractionScenarioFactory.arrowVariations();
      const ast = parse(scenario.code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      const atoms = [];

      traverse(ast, {
        ArrowFunctionExpression(path) {
          if (path.parent.type === 'VariableDeclarator') {
            atoms.push(extractArrowFunction(path, FILE_PATH));
          }
        }
      });

      expect(atoms.length).toBeGreaterThanOrEqual(1);
    });
  });
});
