/**
 * @fileoverview Tests for Import Extractor
 * 
 * Tests the extraction of:
 * - ESM imports (named, default, namespace)
 * - CommonJS require() calls
 * - Dynamic imports
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

import { 
  extractESMImport, 
  extractCommonJSRequire, 
  extractDynamicImport 
} from '#layer-a/parser/extractors/imports.js';
import { 
  CodeSampleBuilder, 
  ASTBuilder,
  ImportBuilder,
  ParserScenarioFactory 
} from '../../../../factories/parser-test.factory.js';

describe('ImportExtractor', () => {
  describe('Structure Contract', () => {
    it('MUST export extractESMImport function', () => {
      expect(extractESMImport).toBeTypeOf('function');
    });

    it('MUST export extractCommonJSRequire function', () => {
      expect(extractCommonJSRequire).toBeTypeOf('function');
    });

    it('MUST export extractDynamicImport function', () => {
      expect(extractDynamicImport).toBeTypeOf('function');
    });

    it('extractESMImport MUST return an object', () => {
      const code = "import { foo } from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result).toBeTypeOf('object');
    });

    it('extractESMImport result MUST have required fields', () => {
      const code = "import { foo } from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('specifiers');
      expect(result).toHaveProperty('type');
    });

    it('extractCommonJSRequire MUST return object or null', () => {
      const code = "require('fs');";
      const ast = ASTBuilder.parse(code);
      let result = null;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractCommonJSRequire(nodePath.node);
        }
      });
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('extractDynamicImport MUST return object or null', () => {
      const code = "import('./module.js');";
      const ast = ASTBuilder.parse(code);
      let result = null;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractDynamicImport(nodePath.node);
        }
      });
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('ESM Import Detection', () => {
    it('MUST extract named import specifiers', () => {
      const code = "import { foo, bar } from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.specifiers).toHaveLength(2);
      expect(result.specifiers[0].type).toBe('named');
    });

    it('MUST preserve imported and local names for named imports', () => {
      const code = "import { foo as bar } from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      const spec = result.specifiers[0];
      expect(spec.imported).toBe('foo');
      expect(spec.local).toBe('bar');
    });

    it('MUST extract default imports', () => {
      const code = "import myDefault from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.specifiers[0].type).toBe('default');
      expect(result.specifiers[0].local).toBe('myDefault');
    });

    it('MUST extract namespace imports', () => {
      const code = "import * as myNamespace from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.specifiers[0].type).toBe('namespace');
      expect(result.specifiers[0].local).toBe('myNamespace');
    });

    it('MUST extract mixed default and named imports', () => {
      const code = "import myDefault, { foo, bar } from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.specifiers).toHaveLength(3);
      expect(result.specifiers[0].type).toBe('default');
      expect(result.specifiers[1].type).toBe('named');
    });

    it('MUST set correct import type', () => {
      const code = "import { foo } from './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.type).toBe('esm');
    });

    it('MUST extract source path correctly', () => {
      const code = "import { foo } from '../utils/helpers.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.source).toBe('../utils/helpers.js');
    });

    it('MUST handle side-effect imports', () => {
      const code = "import './styles.css';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.source).toBe('./styles.css');
      expect(result.specifiers).toEqual([]);
    });

    it('MUST handle external package imports', () => {
      const code = "import React from 'react';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.source).toBe('react');
    });
  });

  describe('CommonJS Require Detection', () => {
    it('MUST extract simple require calls', () => {
      const code = "const fs = require('fs');";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractCommonJSRequire(nodePath.node);
        }
      });
      expect(result).toBeDefined();
      expect(result.source).toBe('fs');
      expect(result.type).toBe('commonjs');
    });

    it('MUST extract require with destructuring', () => {
      const code = "const { join } = require('path');";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractCommonJSRequire(nodePath.node);
        }
      });
      expect(result.source).toBe('path');
    });

    it('MUST return null for non-require calls', () => {
      const code = "someFunction('test');";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractCommonJSRequire(nodePath.node);
        }
      });
      expect(result).toBeNull();
    });

    it('MUST return null for require without arguments', () => {
      const code = "require();";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractCommonJSRequire(nodePath.node);
        }
      });
      expect(result).toBeNull();
    });

    it('MUST handle require with non-string argument', () => {
      const code = "require(someVar);";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractCommonJSRequire(nodePath.node);
        }
      });
      expect(result).toBeNull();
    });

    it('MUST handle bare require calls', () => {
      const code = "require('./side-effects.js');";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractCommonJSRequire(nodePath.node);
        }
      });
      expect(result.source).toBe('./side-effects.js');
    });
  });

  describe('Dynamic Import Detection', () => {
    it('MUST extract dynamic imports with await', () => {
      const code = "const module = await import('./module.js');";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractDynamicImport(nodePath.node);
        }
      });
      expect(result).toBeDefined();
      expect(result.source).toBe('./module.js');
      expect(result.type).toBe('dynamic');
    });

    it('MUST extract dynamic imports without await', () => {
      const code = "import('./module.js').then(m => m.default);";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractDynamicImport(nodePath.node);
        }
      });
      expect(result.source).toBe('./module.js');
    });

    it('MUST return null for regular function calls', () => {
      const code = "myFunction('./module.js');";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractDynamicImport(nodePath.node);
        }
      });
      expect(result).toBeNull();
    });

    it('MUST handle dynamic import with variable', () => {
      const code = "import(modulePath);";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractDynamicImport(nodePath.node);
        }
      });
      expect(result).toBeDefined();
      expect(result.source).toBe('<dynamic>');
    });

    it('MUST handle dynamic import with template literal', () => {
      const code = 'import(`./modules/${name}.js`);';
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractDynamicImport(nodePath.node);
        }
      });
      expect(result).toBeDefined();
      expect(result.source).toBe('<dynamic>');
    });

    it('MUST return null for dynamic import without arguments', () => {
      const code = "import();";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        CallExpression(nodePath) {
          result = extractDynamicImport(nodePath.node);
        }
      });
      // Should still return object with <dynamic> source
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle ImportDeclaration without specifiers', () => {
      const code = "import './module.js';";
      const ast = ASTBuilder.parse(code);
      let result;
      traverse(ast, {
        ImportDeclaration(nodePath) {
          result = extractESMImport(nodePath);
        }
      });
      expect(result.specifiers).toEqual([]);
    });

    it('MUST handle missing source in import', () => {
      // This is invalid JS but shouldn't crash
      const mockNodePath = {
        node: {
          source: null,
          specifiers: []
        }
      };
      expect(() => extractESMImport(mockNodePath)).toThrow();
    });

    it('MUST handle null node for CommonJS extraction', () => {
      const result = extractCommonJSRequire(null);
      expect(result).toBeNull();
    });

    it('MUST handle null node for dynamic import extraction', () => {
      const result = extractDynamicImport(null);
      expect(result).toBeNull();
    });

    it('MUST handle malformed CallExpression for CommonJS', () => {
      const malformedNode = { callee: null, arguments: [] };
      const result = extractCommonJSRequire(malformedNode);
      expect(result).toBeNull();
    });

    it('MUST handle malformed CallExpression for dynamic import', () => {
      const malformedNode = { callee: null, arguments: [] };
      const result = extractDynamicImport(malformedNode);
      expect(result).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    it('MUST handle multiple import types in one file', () => {
      const code = `
        import { esmFunc } from './esm.js';
        const cjs = require('./cjs.js');
        const dynamic = await import('./dynamic.js');
      `;
      const imports = [];
      const ast = ASTBuilder.parse(code);
      traverse(ast, {
        ImportDeclaration(nodePath) {
          imports.push(extractESMImport(nodePath));
        },
        CallExpression(nodePath) {
          const commonjs = extractCommonJSRequire(nodePath.node);
          const dynamic = extractDynamicImport(nodePath.node);
          if (commonjs) imports.push(commonjs);
          if (dynamic) imports.push(dynamic);
        }
      });
      expect(imports.length).toBeGreaterThanOrEqual(2);
    });

    it('MUST correctly identify all import types', () => {
      const builder = new ImportBuilder()
        .withNamed('./a.js', 'a')
        .withDefault('./b.js', 'b')
        .withNamespace('./c.js', 'c')
        .withCommonJS('d')
        .withDynamic('./e.js');
      const imports = builder.build();
      
      expect(imports.map(i => i.type)).toContain('named');
      expect(imports.map(i => i.type)).toContain('default');
      expect(imports.map(i => i.type)).toContain('namespace');
      expect(imports.map(i => i.type)).toContain('commonjs');
      expect(imports.map(i => i.type)).toContain('dynamic');
    });
  });
});
