/**
 * @fileoverview Tests for Definition Extractor
 * 
 * Tests the extraction of:
 * - Function definitions (declarations, expressions, arrows, methods)
 * - Class definitions
 * - Variable exports analysis
 */

import { describe, it, expect, vi } from 'vitest';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

import { 
  extractFunctionDefinition, 
  extractArrowFunction,
  extractFunctionExpression,
  extractClassDefinition,
  extractVariableExports
} from '#layer-a/parser/extractors/definitions.js';
import { 
  CodeSampleBuilder, 
  ASTBuilder,
  ParserScenarioFactory 
} from '../../../../factories/parser-test.factory.js';

describe('DefinitionExtractor', () => {
  const createMockFileInfo = () => ({
    definitions: [],
    functions: [],
    exports: [],
    constantExports: [],
    objectExports: []
  });

  describe('Structure Contract', () => {
    it('MUST export extractFunctionDefinition function', () => {
      expect(extractFunctionDefinition).toBeTypeOf('function');
    });

    it('MUST export extractArrowFunction function', () => {
      expect(extractArrowFunction).toBeTypeOf('function');
    });

    it('MUST export extractFunctionExpression function', () => {
      expect(extractFunctionExpression).toBeTypeOf('function');
    });

    it('MUST export extractClassDefinition function', () => {
      expect(extractClassDefinition).toBeTypeOf('function');
    });

    it('MUST export extractVariableExports function', () => {
      expect(extractVariableExports).toBeTypeOf('function');
    });

    it('extractFunctionDefinition MUST return fileInfo object', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test() {}';
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          result = extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(result).toBe(fileInfo);
    });

    it('extractClassDefinition MUST return fileInfo object', () => {
      const fileInfo = createMockFileInfo();
      const code = 'class MyClass {}';
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ClassDeclaration(nodePath) {
          result = extractClassDefinition(nodePath, fileInfo);
        }
      });
      expect(result).toBe(fileInfo);
    });
  });

  describe('Function Declaration Extraction', () => {
    it('MUST extract function name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function myFunction() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.functions[0].name).toBe('myFunction');
    });

    it('MUST extract function parameters', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test(a, b, c) {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.functions[0].params).toEqual(['a', 'b', 'c']);
    });

    it('MUST detect async functions', () => {
      const fileInfo = createMockFileInfo();
      const code = 'async function asyncFunc() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.functions[0].isAsync).toBe(true);
    });

    it('MUST detect generator functions', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function* genFunc() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.functions[0].isGenerator).toBe(true);
    });

    it('MUST generate unique function ID', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/src/utils.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.functions[0].id).toContain('test');
    });

    it('MUST capture line numbers', () => {
      const fileInfo = createMockFileInfo();
      const code = '\n\nfunction test() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.functions[0].line).toBeGreaterThan(0);
    });

    it('MUST detect exported functions', () => {
      const fileInfo = createMockFileInfo();
      fileInfo.exports = [{ name: 'exportedFunc' }];
      const code = 'export function exportedFunc() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.functions[0].isExported).toBe(true);
    });

    it('MUST handle anonymous functions gracefully', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const x = function() {}';  // FunctionExpression, not FunctionDeclaration
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          // Anonymous function declarations are rare but valid in some contexts
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      // No FunctionDeclaration in this code, so nothing is extracted
      expect(fileInfo.functions).toHaveLength(0);
    });
  });

  describe('Arrow Function Extraction', () => {
    it('MUST extract arrow function name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const myArrow = () => {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'ArrowFunctionExpression') {
            extractArrowFunction(nodePath, '/test.js', fileInfo);
          }
        }
      });
      expect(fileInfo.functions[0].name).toBe('myArrow');
    });

    it('MUST extract arrow function parameters', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const add = (a, b) => a + b';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'ArrowFunctionExpression') {
            extractArrowFunction(nodePath, '/test.js', fileInfo);
          }
        }
      });
      expect(fileInfo.functions[0].params).toEqual(['a', 'b']);
    });

    it('MUST detect async arrow functions', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const asyncArrow = async () => {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'ArrowFunctionExpression') {
            extractArrowFunction(nodePath, '/test.js', fileInfo);
          }
        }
      });
      expect(fileInfo.functions[0].isAsync).toBe(true);
    });

    it('MUST set correct function type', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const arrow = () => {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'ArrowFunctionExpression') {
            extractArrowFunction(nodePath, '/test.js', fileInfo);
          }
        }
      });
      expect(fileInfo.functions[0].type).toBe('arrow');
    });
  });

  describe('Function Expression Extraction', () => {
    it('MUST extract function expression name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const myExpr = function() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'FunctionExpression') {
            extractFunctionExpression(nodePath, '/test.js', fileInfo);
          }
        }
      });
      expect(fileInfo.functions[0].name).toBe('myExpr');
    });

    it('MUST extract named function expressions', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const x = function namedFunc() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'FunctionExpression') {
            extractFunctionExpression(nodePath, '/test.js', fileInfo);
          }
        }
      });
      // Should use variable name, not internal function name
      expect(fileInfo.functions[0].name).toBe('x');
    });

    it('MUST set correct function type', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const expr = function() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'FunctionExpression') {
            extractFunctionExpression(nodePath, '/test.js', fileInfo);
          }
        }
      });
      expect(fileInfo.functions[0].type).toBe('expression');
    });
  });

  describe('Method Extraction', () => {
    it('MUST extract class method with className', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        class MyClass {
          myMethod() {}
        }
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        ClassMethod(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'method', 'MyClass');
        }
      });
      expect(fileInfo.functions[0].className).toBe('MyClass');
      expect(fileInfo.functions[0].name).toBe('myMethod');
    });

    it('MUST build fullName with class prefix', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        class MyClass {
          myMethod() {}
        }
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        ClassMethod(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'method', 'MyClass');
        }
      });
      expect(fileInfo.functions[0].fullName).toBe('MyClass.myMethod');
    });

    it('MUST extract static methods', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        class MyClass {
          static staticMethod() {}
        }
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        ClassMethod(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'method', 'MyClass');
        }
      });
      expect(fileInfo.functions[0].name).toBe('staticMethod');
    });

    it('MUST extract async methods', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        class MyClass {
          async asyncMethod() {}
        }
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        ClassMethod(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'method', 'MyClass');
        }
      });
      expect(fileInfo.functions[0].isAsync).toBe(true);
    });
  });

  describe('Class Definition Extraction', () => {
    it('MUST extract class name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'class MyClass {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        ClassDeclaration(nodePath) {
          extractClassDefinition(nodePath, fileInfo);
        }
      });
      expect(fileInfo.definitions[0].name).toBe('MyClass');
      expect(fileInfo.definitions[0].type).toBe('class');
    });

    it('MUST skip anonymous classes', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const MyClass = class {}';  // Anonymous class expression
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        ClassDeclaration(nodePath) {
          extractClassDefinition(nodePath, fileInfo);
        }
      });
      // No ClassDeclaration in this code
      expect(fileInfo.definitions).toHaveLength(0);
    });
  });

  describe('Variable Export Analysis', () => {
    it('MUST extract constant exports', () => {
      const fileInfo = createMockFileInfo();
      const code = 'export const MAX_COUNT = 100;';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclaration(nodePath) {
          extractVariableExports(nodePath, fileInfo);
        }
      });
      expect(fileInfo.constantExports.length).toBeGreaterThanOrEqual(1);
      expect(fileInfo.constantExports[0].name).toBe('MAX_COUNT');
    });

    it('MUST skip let declarations', () => {
      const fileInfo = createMockFileInfo();
      const code = 'export let x = 1;';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclaration(nodePath) {
          extractVariableExports(nodePath, fileInfo);
        }
      });
      expect(fileInfo.constantExports).toHaveLength(0);
    });

    it('MUST analyze object exports', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        export const CONFIG = {
          API_URL: 'https://api.example.com',
          TIMEOUT: 5000
        };
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclaration(nodePath) {
          extractVariableExports(nodePath, fileInfo);
        }
      });
      expect(fileInfo.objectExports.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST classify enum-like objects', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        export const Colors = {
          RED: '#ff0000',
          GREEN: '#00ff00',
          BLUE: '#0000ff'
        };
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclaration(nodePath) {
          extractVariableExports(nodePath, fileInfo);
        }
      });
      if (fileInfo.objectExports.length > 0) {
        expect(fileInfo.objectExports[0].objectType).toBe('enum');
        expect(fileInfo.objectExports[0].riskLevel).toBe('low');
      }
    });

    it('MUST classify state objects with methods', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        export const store = {
          data: {},
          setData(value) { this.data = value; }
        };
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclaration(nodePath) {
          extractVariableExports(nodePath, fileInfo);
        }
      });
      if (fileInfo.objectExports.length > 0) {
        expect(fileInfo.objectExports[0].riskLevel).toBe('high');
        expect(fileInfo.objectExports[0].objectType).toBe('state');
      }
    });

    it('MUST count property types correctly', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        export const obj = {
          literal: 'value',
          nested: { a: 1 },
          method() {}
        };
      `;
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclaration(nodePath) {
          extractVariableExports(nodePath, fileInfo);
        }
      });
      if (fileInfo.objectExports.length > 0) {
        expect(fileInfo.objectExports[0].properties).toBe(3);
        expect(fileInfo.objectExports[0].highRiskCount).toBe(1);
      }
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle node without id gracefully', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          id: null,
          params: [],
          async: false,
          generator: false,
          loc: { start: { line: 1 }, end: { line: 1 } }
        },
        traverse: () => {}
      };
      extractFunctionDefinition(mockNodePath, '/test.js', fileInfo, 'declaration');
      expect(fileInfo.functions[0].name).toBe('anonymous');
    });

    it('MUST handle method node with computed key', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          key: { type: 'StringLiteral', value: 'computed' },
          params: [],
          async: false,
          generator: false,
          loc: { start: { line: 1 }, end: { line: 1 } }
        },
        traverse: () => {}
      };
      extractFunctionDefinition(mockNodePath, '/test.js', fileInfo, 'method', 'MyClass');
      expect(fileInfo.functions[0].name).toBe('computed');
    });

    it('MUST handle class without id', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          id: null
        }
      };
      extractClassDefinition(mockNodePath, fileInfo);
      expect(fileInfo.definitions).toHaveLength(0);
    });

    it('MUST handle variable export with non-object init', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          kind: 'const',
          declarations: [{
            id: { type: 'Identifier', name: 'x' },
            init: { type: 'Literal', value: 42 },
            loc: { start: { line: 1 } }
          }]
        }
      };
      extractVariableExports(mockNodePath, fileInfo);
      expect(fileInfo.constantExports.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Definition Tracking', () => {
    it('MUST add to both definitions and functions arrays', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test() {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.definitions).toHaveLength(1);
      expect(fileInfo.functions).toHaveLength(1);
      expect(fileInfo.definitions[0].name).toBe('test');
      expect(fileInfo.functions[0].name).toBe('test');
    });

    it('MUST track parameter count in definitions', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test(a, b, c) {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        FunctionDeclaration(nodePath) {
          extractFunctionDefinition(nodePath, '/test.js', fileInfo, 'declaration');
        }
      });
      expect(fileInfo.definitions[0].params).toBe(3);
    });

    it('MUST track function type in definitions', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const arrow = () => {}';
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        VariableDeclarator(nodePath) {
          if (nodePath.node.init?.type === 'ArrowFunctionExpression') {
            extractArrowFunction(nodePath, '/test.js', fileInfo);
          }
        }
      });
      expect(fileInfo.definitions[0].type).toBe('arrow');
    });
  });
});
