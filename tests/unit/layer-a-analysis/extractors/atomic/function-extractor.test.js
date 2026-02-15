/**
 * @fileoverview function-extractor.test.js
 * 
 * Tests for function declaration and function expression extractors
 * 
 * @module tests/unit/layer-a-analysis/extractors/atomic/function-extractor
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import * as traverseModule from '@babel/traverse';
const traverse = traverseModule.default || traverseModule;
import {
  extractFunctionDeclaration,
  extractFunctionExpression
} from '#layer-a/extractors/atomic/function-extractor.js';
import {
  CodeSampleBuilder,
  FunctionBuilder,
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Function Extractor', () => {
  const FILE_PATH = 'test/file.js';

  describe('extractFunctionDeclaration', () => {
    it('should extract basic function declaration', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('testFunction', ['a', 'b'], 'return a + b;');
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(ExtractionValidator.validateFullAtom(atom)).toBe(true);
      expect(atom.name).toBe('testFunction');
      expect(atom.type).toBe(TestConstants.ATOM_TYPES.FUNCTION);
      expect(atom.file).toBe(FILE_PATH);
    });

    it('should extract function with no parameters', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('noParams', [], 'return 42;');
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.signature.params).toHaveLength(0);
    });

    it('should extract function with multiple parameters', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('manyParams', ['a', 'b', 'c', 'd']);
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.signature.params).toHaveLength(4);
      expect(atom.signature.params.map(p => p.name)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should extract async function', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('asyncFn', ['url'], 'return fetch(url);', { async: true });
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.signature.async).toBe(true);
      expect(atom.signature.returnType).toBe('Promise');
    });

    it('should extract generator function', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('genFn', [], 'yield 1; yield 2;', { generator: true });
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.signature.generator).toBe(true);
    });

    it('should extract exported function', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('exportedFn', [], '', { exported: true });
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.exported).toBe(true);
    });

    it('should extract non-exported function', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('privateFn', []);
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.exported).toBe(false);
    });

    it('should set correct line and column', () => {
      const builder = new CodeSampleBuilder()
        .withBlankLine()
        .withBlankLine()
        .withFunction('linedFunction', []);
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.line).toBe(3);
      expect(atom.column).toBeGreaterThanOrEqual(0);
    });

    it('should create correct atom ID', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('myFunction', []);
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.id).toBe(`${FILE_PATH}::myFunction`);
    });

    it('should calculate complexity', () => {
      const scenario = ExtractionScenarioFactory.complexFunction('complex');
      const ast = parse(scenario.code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        FunctionDeclaration(path) {
          atom = extractFunctionDeclaration(path, FILE_PATH);
        }
      });

      expect(atom.complexity).toBeGreaterThan(1);
    });

    it('should extract calls within function', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('caller', [], 'foo(); bar();');
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract data flow', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('withFlow', ['input'], 'return input;');
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.dataFlow).toBeDefined();
      expect(atom.dataFlow.inputs.length).toBeGreaterThan(0);
      expect(atom.dataFlow.outputs.length).toBeGreaterThan(0);
    });

    it('should set visibility to public by default', () => {
      const builder = new CodeSampleBuilder()
        .withFunction('publicFn', []);
      const path = builder.findNode('FunctionDeclaration');

      const atom = extractFunctionDeclaration(path, FILE_PATH);

      expect(atom.visibility).toBe('public');
    });

    it('should extract function with default parameter', () => {
      const code = 'function withDefault(x = 10) { return x; }';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        FunctionDeclaration(path) {
          atom = extractFunctionDeclaration(path, FILE_PATH);
        }
      });

      expect(atom.signature.params).toHaveLength(1);
      // Default parameters have AssignmentPattern structure, name fallback used
      expect(atom.signature.params[0].name).toBeDefined();
    });

    it('should handle anonymous function (fallback name)', () => {
      const code = 'export default function() { return 1; }';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        FunctionDeclaration(path) {
          atom = extractFunctionDeclaration(path, FILE_PATH);
        }
      });

      expect(atom.name).toBe('anonymous');
    });
  });

  describe('extractFunctionExpression', () => {
    it('should extract function expression', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('myExpr', ['x'], 'return x * 2;');
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(ExtractionValidator.validateFullAtom(atom)).toBe(true);
      expect(atom.name).toBe('myExpr');
      expect(atom.type).toBe(TestConstants.ATOM_TYPES.FUNCTION_EXPRESSION);
    });

    it('should extract async function expression', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('asyncExpr', ['url'], 'return fetch(url);', { async: true });
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.signature.async).toBe(true);
    });

    it('should extract generator function expression', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('genExpr', [], 'yield 1;', { generator: true });
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.signature.generator).toBe(true);
    });

    it('should extract exported function expression', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('exportedExpr', [], 'return 1;', { exported: true });
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.exported).toBe(true);
    });

    it('should handle function expression without variable name', () => {
      const code = 'const anonExpr = function() { return 1; }';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        FunctionExpression(path) {
          atom = extractFunctionExpression(path, FILE_PATH);
        }
      });

      expect(atom.name).toBe('anonExpr');
    });

    it('should create correct atom ID', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('myExpr', []);
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.id).toBe(`${FILE_PATH}::myExpr`);
    });

    it('should set correct line and column', () => {
      const builder = new CodeSampleBuilder()
        .withBlankLine()
        .withFunctionExpression('linedExpr', []);
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.line).toBe(2);
    });

    it('should calculate complexity for function expression', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('complexExpr', ['x'], 'if (x) { return 1; } return 0;');
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.complexity).toBe(2);
    });

    it('should extract calls from function expression', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('callerExpr', [], 'helper();');
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.calls.length).toBeGreaterThan(0);
    });

    it('should extract data flow from function expression', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('flowExpr', ['input'], 'console.log(input); return input;');
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.dataFlow.inputs.length).toBeGreaterThan(0);
      expect(atom.dataFlow.outputs.length).toBeGreaterThan(0);
    });

    it('should set visibility to public by default', () => {
      const builder = new CodeSampleBuilder()
        .withFunctionExpression('publicExpr', []);
      const path = builder.findNode('FunctionExpression');

      const atom = extractFunctionExpression(path, FILE_PATH);

      expect(atom.visibility).toBe('public');
    });

    it('should extract named function expression', () => {
      const code = 'const x = function namedFn() { return namedFn; }';
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
      });
      let atom;

      traverse(ast, {
        FunctionExpression(path) {
          atom = extractFunctionExpression(path, FILE_PATH);
        }
      });

      // Name should come from variable, not internal function name
      expect(atom.name).toBe('x');
    });
  });

  describe('comparison between declaration and expression', () => {
    it('should produce similar atoms for equivalent functions', () => {
      const declBuilder = new CodeSampleBuilder()
        .withFunction('test', ['a'], 'return a;');
      const exprBuilder = new CodeSampleBuilder()
        .withFunctionExpression('test', ['a'], 'return a;');

      const declPath = declBuilder.findNode('FunctionDeclaration');
      const exprPath = exprBuilder.findNode('FunctionExpression');

      const declAtom = extractFunctionDeclaration(declPath, FILE_PATH);
      const exprAtom = extractFunctionExpression(exprPath, FILE_PATH);

      expect(declAtom.name).toBe(exprAtom.name);
      expect(declAtom.signature.params).toHaveLength(exprAtom.signature.params.length);
      expect(declAtom.visibility).toBe(exprAtom.visibility);
    });

    it('should have different types for declaration vs expression', () => {
      const declBuilder = new CodeSampleBuilder().withFunction('test', []);
      const exprBuilder = new CodeSampleBuilder().withFunctionExpression('test', []);

      const declPath = declBuilder.findNode('FunctionDeclaration');
      const exprPath = exprBuilder.findNode('FunctionExpression');

      const declAtom = extractFunctionDeclaration(declPath, FILE_PATH);
      const exprAtom = extractFunctionExpression(exprPath, FILE_PATH);

      expect(declAtom.type).toBe(TestConstants.ATOM_TYPES.FUNCTION);
      expect(exprAtom.type).toBe(TestConstants.ATOM_TYPES.FUNCTION_EXPRESSION);
    });
  });
});
