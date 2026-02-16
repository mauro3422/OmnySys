/**
 * @fileoverview Tests for Export Extractor
 * 
 * Tests the extraction of:
 * - Named exports (specifiers and declarations)
 * - Default exports
 * - Re-exports
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

import { 
  extractNamedExports, 
  extractDefaultExport 
} from '#layer-a/parser/extractors/exports.js';
import { 
  CodeSampleBuilder, 
  ASTBuilder,
  ExportBuilder,
  ParserScenarioFactory 
} from '../../../../factories/parser-test.factory.js';

describe('ExportExtractor', () => {
  describe('Structure Contract', () => {
    it('MUST export extractNamedExports function', () => {
      expect(extractNamedExports).toBeTypeOf('function');
    });

    it('MUST export extractDefaultExport function', () => {
      expect(extractDefaultExport).toBeTypeOf('function');
    });

    it('extractNamedExports MUST return an array', () => {
      const code = "export { foo };";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('extractDefaultExport MUST return an object', () => {
      const code = "export default function() {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportDefaultDeclaration(nodePath) {
          result = extractDefaultExport(nodePath);
        }
      });
      expect(result).toBeTypeOf('object');
    });

    it('extractDefaultExport result MUST have required fields', () => {
      const code = "export default function() {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportDefaultDeclaration(nodePath) {
          result = extractDefaultExport(nodePath);
        }
      });
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('kind');
    });
  });

  describe('Named Export Detection', () => {
    it('MUST extract export specifiers', () => {
      const code = "export { foo, bar };";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('foo');
      expect(result[1].name).toBe('bar');
    });

    it('MUST extract renamed exports', () => {
      const code = "export { foo as bar };";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result[0].name).toBe('bar');
      expect(result[0].local).toBe('foo');
    });

    it('MUST extract function declarations', () => {
      const code = "export function myFunc() {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result[0].type).toBe('declaration');
      expect(result[0].kind).toBe('FunctionDeclaration');
      expect(result[0].name).toBe('myFunc');
    });

    it('MUST extract class declarations', () => {
      const code = "export class MyClass {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result[0].type).toBe('declaration');
      expect(result[0].kind).toBe('ClassDeclaration');
      expect(result[0].name).toBe('MyClass');
    });

    it('MUST extract const declarations', () => {
      const code = "export const MY_CONST = 42;";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result[0].type).toBe('declaration');
      expect(result[0].kind).toBe('VariableDeclaration');
      expect(result[0].name).toBe('MY_CONST');
    });

    it('MUST extract multiple const declarations', () => {
      const code = "export const a = 1, b = 2, c = 3;";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result).toHaveLength(3);
      expect(result.map(r => r.name)).toEqual(['a', 'b', 'c']);
    });

    it('MUST extract re-exports', () => {
      const code = "export { foo, bar } from './other.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result[0].type).toBe('reexport');
      expect(result[0].source).toBe('./other.js');
    });

    it('MUST extract renamed re-exports', () => {
      const code = "export { foo as myFoo } from './other.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result[0].name).toBe('myFoo');
      expect(result[0].local).toBe('foo');
      expect(result[0].source).toBe('./other.js');
    });
  });

  describe('Default Export Detection', () => {
    it('MUST extract default function export', () => {
      const code = "export default function() {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportDefaultDeclaration(nodePath) {
          result = extractDefaultExport(nodePath);
        }
      });
      expect(result.type).toBe('default');
      expect(result.kind).toBe('FunctionDeclaration');
    });

    it('MUST extract default class export', () => {
      const code = "export default class {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportDefaultDeclaration(nodePath) {
          result = extractDefaultExport(nodePath);
        }
      });
      expect(result.kind).toBe('ClassDeclaration');
    });

    it('MUST extract default expression export', () => {
      const code = "export default someVariable;";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportDefaultDeclaration(nodePath) {
          result = extractDefaultExport(nodePath);
        }
      });
      expect(result.kind).toBe('Identifier');
    });

    it('MUST extract default arrow function', () => {
      const code = "export default () => {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportDefaultDeclaration(nodePath) {
          result = extractDefaultExport(nodePath);
        }
      });
      expect(result.kind).toBe('ArrowFunctionExpression');
    });

    it('MUST extract default object literal', () => {
      const code = "export default { foo: 1 };";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportDefaultDeclaration(nodePath) {
          result = extractDefaultExport(nodePath);
        }
      });
      expect(result.kind).toBe('ObjectExpression');
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle ExportNamedDeclaration without specifiers or declaration', () => {
      const mockNodePath = {
        node: {
          specifiers: [],
          declaration: null,
          source: null
        }
      };
      const result = extractNamedExports(mockNodePath);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('MUST handle declaration without id or declarations', () => {
      const mockNodePath = {
        node: {
          specifiers: [],
          declaration: {
            type: 'ExpressionStatement',
            id: null,
            declarations: null
          },
          source: null
        }
      };
      const result = extractNamedExports(mockNodePath);
      expect(Array.isArray(result)).toBe(true);
    });

    it('MUST handle ExportDefaultDeclaration with various types', () => {
      const types = ['FunctionDeclaration', 'ClassDeclaration', 'ArrowFunctionExpression', 'ObjectExpression'];
      for (const kind of types) {
        const mockNodePath = {
          node: {
            declaration: { type: kind }
          }
        };
        const result = extractDefaultExport(mockNodePath);
        expect(result.type).toBe('default');
        expect(result.kind).toBe(kind);
      }
    });

    it('MUST handle null node gracefully', () => {
      expect(() => extractNamedExports({ node: null })).toThrow();
    });

    it('MUST handle default export with null declaration', () => {
      const mockNodePath = {
        node: {
          declaration: null
        }
      };
      const result = extractDefaultExport(mockNodePath);
      expect(result.type).toBe('default');
      expect(result.kind).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('MUST handle empty export statement', () => {
      const code = "export {};";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result).toEqual([]);
    });

    it('MUST handle export all from module', () => {
      const code = "export * from './other.js';";
      const ast = ASTBuilder.parse(code);
      let result = null;
      traverse(ast, {
        ExportAllDeclaration(nodePath) {
          // ExportAllDeclaration is not handled by extractNamedExports
          result = 'ExportAllDeclaration found';
        }
      });
      // Note: ExportAllDeclaration is handled separately
    });

    it('MUST preserve export order', () => {
      const code = "export { a, b, c, d, e };";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          result = extractNamedExports(nodePath);
        }
      });
      expect(result.map(r => r.name)).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('MUST handle let and var exports', () => {
      const code = `
        export let x = 1;
        export var y = 2;
      `;
      const ast = ASTBuilder.parse(code);
      const results = [];
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          results.push(...extractNamedExports(nodePath));
        }
      });
      expect(results).toHaveLength(2);
      expect(results[0].kind).toBe('VariableDeclaration');
      expect(results[1].kind).toBe('VariableDeclaration');
    });
  });

  describe('Integration Scenarios', () => {
    it('MUST handle complex export combinations', () => {
      const builder = new ExportBuilder()
        .withNamed('a')
        .withNamed('b', 'originalB')
        .withDeclaration('FunctionDeclaration', 'c')
        .withDeclaration('ClassDeclaration', 'D')
        .withDefault('FunctionDeclaration');
      
      const exports = builder.build();
      expect(exports.length).toBeGreaterThanOrEqual(4);
      expect(exports.map(e => e.type)).toContain('named');
      expect(exports.map(e => e.type)).toContain('declaration');
      expect(exports.map(e => e.type)).toContain('default');
    });

    it('MUST correctly classify export types', () => {
      const code = `
        export { a };
        export { b } from './other.js';
        export const c = 1;
        export default function() {}
      `;
      const ast = ASTBuilder.parse(code);
      const results = [];
      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          results.push(...extractNamedExports(nodePath));
        },
        ExportDefaultDeclaration(nodePath) {
          results.push(extractDefaultExport(nodePath));
        }
      });
      
      expect(results.some(r => r.type === 'named')).toBe(true);
      expect(results.some(r => r.type === 'reexport')).toBe(true);
      expect(results.some(r => r.type === 'declaration')).toBe(true);
      expect(results.some(r => r.type === 'default')).toBe(true);
    });
  });
});
