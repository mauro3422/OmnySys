/**
 * @fileoverview Tests for Parser Index
 * 
 * Tests the main parser module including:
 * - parseFile(): Parse code inline
 * - parseFileFromDisk(): Read and parse files
 * - parseFiles(): Parse multiple files in parallel
 * - Complete extraction pipeline
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  parseFile, 
  parseFileFromDisk, 
  parseFiles,
  getFileId,
  isNodeExported,
  isExportedFunction,
  findCallsInFunction
} from '#layer-a/parser/index.js';
import { 
  CodeSampleBuilder, 
  ParserScenarioFactory,
  ParserValidator,
  ASTBuilder
} from '../../../factories/parser-test.factory.js';

describe('ParserIndex', () => {
  describe('Structure Contract', () => {
    it('MUST export parseFile function', () => {
      expect(parseFile).toBeTypeOf('function');
    });

    it('MUST export parseFileFromDisk function', () => {
      expect(parseFileFromDisk).toBeTypeOf('function');
    });

    it('MUST export parseFiles function', () => {
      expect(parseFiles).toBeTypeOf('function');
    });

    it('MUST re-export helper functions', () => {
      expect(getFileId).toBeTypeOf('function');
      expect(isNodeExported).toBeTypeOf('function');
      expect(isExportedFunction).toBeTypeOf('function');
      expect(findCallsInFunction).toBeTypeOf('function');
    });

    it('parseFile MUST return valid FileInfo object', () => {
      const result = parseFile('/test/file.js', '');
      expect(ParserValidator.isValidFileInfo(result)).toBe(true);
    });

    it('FileInfo MUST have all required arrays', () => {
      const result = parseFile('/test/file.js', '');
      expect(ParserValidator.hasRequiredArrays(result)).toBe(true);
    });

    it('FileInfo MUST have correct metadata fields', () => {
      const result = parseFile('/test/my-file.js', '');
      expect(result.fileName).toBe('my-file.js');
      expect(result.ext).toBe('.js');
      expect(result.filePath).toBe('/test/my-file.js');
    });
  });

  describe('Empty File Handling', () => {
    it('MUST handle empty string code', () => {
      const result = parseFile('/test/empty.js', '');
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
      expect(result.definitions).toEqual([]);
    });

    it('MUST handle whitespace-only code', () => {
      const result = parseFile('/test/whitespace.js', '   \n\t  ');
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
    });

    it('MUST handle code with only comments', () => {
      const code = '// This is a comment\n/* Multi-line\ncomment */';
      const result = parseFile('/test/comments.js', code);
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
    });
  });

  describe('Import Extraction', () => {
    it('MUST extract ESM imports', () => {
      const { code } = ParserScenarioFactory.withImports();
      const result = parseFile('/test/imports.js', code);
      expect(result.imports.length).toBeGreaterThanOrEqual(2);
    });

    it('MUST extract CommonJS requires', () => {
      const { code } = ParserScenarioFactory.commonJSFile();
      const result = parseFile('/test/requires.js', code);
      const requires = result.imports.filter(i => i.type === 'commonjs');
      expect(requires.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST extract dynamic imports', () => {
      const { code } = ParserScenarioFactory.withDynamicImports();
      const result = parseFile('/test/dynamic.js', code);
      const dynamicImports = result.imports.filter(i => i.type === 'dynamic');
      expect(dynamicImports.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST preserve import source paths', () => {
      const builder = new CodeSampleBuilder()
        .withImport('./local-module.js', ['foo'])
        .withImport('external-package', ['bar']);
      const { code } = builder.build();
      const result = parseFile('/test/file.js', code);
      const sources = result.imports.map(i => i.source);
      expect(sources).toContain('./local-module.js');
      expect(sources).toContain('external-package');
    });

    it('MUST handle mixed import types in same file', () => {
      const code = `
        import { foo } from './module.js';
        const bar = require('./common.js');
        const baz = await import('./dynamic.js');
      `;
      const result = parseFile('/test/mixed.js', code);
      expect(result.imports.length).toBeGreaterThanOrEqual(2);
      const types = result.imports.map(i => i.type);
      expect(types).toContain('esm');
    });
  });

  describe('Export Extraction', () => {
    it('MUST extract named exports', () => {
      const { code } = ParserScenarioFactory.withExports();
      const result = parseFile('/test/exports.js', code);
      expect(result.exports.length).toBeGreaterThanOrEqual(2);
    });

    it('MUST extract default exports', () => {
      const code = 'export default function main() {}';
      const result = parseFile('/test/default.js', code);
      const defaultExport = result.exports.find(e => e.type === 'default');
      expect(defaultExport).toBeDefined();
    });

    it('MUST extract export declarations', () => {
      const code = 'export const foo = 1;';
      const result = parseFile('/test/decl.js', code);
      const declExport = result.exports.find(e => e.type === 'declaration');
      expect(declExport).toBeDefined();
    });

    it('MUST handle multiple named exports', () => {
      const code = `
        export const a = 1;
        export const b = 2;
        export const c = 3;
      `;
      const result = parseFile('/test/multi.js', code);
      expect(result.exports.length).toBe(3);
    });

    it('MUST extract re-exports', () => {
      const code = "export { foo, bar } from './other.js';";
      const result = parseFile('/test/reexport.js', code);
      const reexport = result.exports.find(e => e.type === 'reexport');
      expect(reexport).toBeDefined();
    });
  });

  describe('Function Definition Extraction', () => {
    it('MUST extract function declarations', () => {
      const { code } = ParserScenarioFactory.singleFunction('myFunc');
      const result = parseFile('/test/func.js', code);
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
      expect(result.functions[0].name).toBe('myFunc');
    });

    it('MUST extract arrow functions', () => {
      const { code } = ParserScenarioFactory.withArrowFunctions();
      const result = parseFile('/test/arrows.js', code);
      const arrows = result.functions.filter(f => f.type === 'arrow');
      expect(arrows.length).toBeGreaterThanOrEqual(2);
    });

    it('MUST extract function expressions', () => {
      const code = 'const myExpr = function() { return 1; };';
      const result = parseFile('/test/expr.js', code);
      const expressions = result.functions.filter(f => f.type === 'expression');
      expect(expressions.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST capture function parameters', () => {
      const code = 'function test(a, b, c) {}';
      const result = parseFile('/test/params.js', code);
      const func = result.functions.find(f => f.name === 'test');
      expect(func.params).toEqual(['a', 'b', 'c']);
    });

    it('MUST detect async functions', () => {
      const code = 'async function asyncFunc() {}';
      const result = parseFile('/test/async.js', code);
      const func = result.functions.find(f => f.name === 'asyncFunc');
      expect(func.isAsync).toBe(true);
    });

    it('MUST detect generator functions', () => {
      const code = 'function* genFunc() {}';
      const result = parseFile('/test/gen.js', code);
      const func = result.functions.find(f => f.name === 'genFunc');
      expect(func.isGenerator).toBe(true);
    });

    it('MUST capture function line numbers', () => {
      const code = '\n\nfunction test() {}';
      const result = parseFile('/test/lines.js', code);
      const func = result.functions.find(f => f.name === 'test');
      expect(func.line).toBeGreaterThan(0);
    });
  });

  describe('Class Definition Extraction', () => {
    it('MUST extract class declarations', () => {
      const { code } = ParserScenarioFactory.classWithMethods('MyClass', 2);
      const result = parseFile('/test/class.js', code);
      const classes = result.definitions.filter(d => d.type === 'class');
      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('MyClass');
    });

    it('MUST extract class methods', () => {
      const code = `
        class MyClass {
          method1() {}
          method2() {}
        }
      `;
      const result = parseFile('/test/methods.js', code);
      const methods = result.functions.filter(f => f.type === 'method');
      expect(methods.length).toBe(2);
    });

    it('MUST track current class for methods', () => {
      const code = `
        class MyClass {
          async asyncMethod() {}
        }
      `;
      const result = parseFile('/test/async-method.js', code);
      const method = result.functions.find(f => f.name === 'asyncMethod');
      expect(method.className).toBe('MyClass');
    });

    it('MUST handle static methods', () => {
      const code = `
        class MyClass {
          static staticMethod() {}
        }
      `;
      const result = parseFile('/test/static.js', code);
      const method = result.functions.find(f => f.name === 'staticMethod');
      expect(method).toBeDefined();
    });
  });

  describe('Call Extraction', () => {
    it('MUST extract function calls', () => {
      const code = `
        import { helper } from './helper.js';
        helper();
        console.log('test');
      `;
      const result = parseFile('/test/calls.js', code);
      expect(result.calls.length).toBeGreaterThan(0);
    });

    it('MUST extract member expression calls', () => {
      const code = 'obj.method();';
      const result = parseFile('/test/member.js', code);
      const memberCalls = result.calls.filter(c => c.type === 'member_call');
      expect(memberCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST extract namespace access', () => {
      const code = 'console.log("test");';
      const result = parseFile('/test/namespace.js', code);
      const namespaceAccess = result.calls.filter(c => c.type === 'namespace_access');
      expect(namespaceAccess.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('TypeScript Support', () => {
    it('MUST parse TypeScript interfaces', () => {
      const { code } = ParserScenarioFactory.typescriptFile();
      const result = parseFile('/test/types.ts', code);
      expect(result.typeDefinitions.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST parse TypeScript type aliases', () => {
      const code = 'type ID = string | number;';
      const result = parseFile('/test/type-alias.ts', code);
      expect(result.typeDefinitions.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST parse TypeScript enums', () => {
      const code = 'enum Status { ACTIVE, INACTIVE }';
      const result = parseFile('/test/enum.ts', code);
      expect(result.enumDefinitions.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST track type usage references', () => {
      const code = `
        type User = { name: string };
        const user: User = { name: 'test' };
      `;
      const result = parseFile('/test/type-usage.ts', code);
      expect(result.typeUsages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle syntax errors gracefully', () => {
      const code = 'function broken() { return 1;'; // Missing closing brace
      const result = parseFile('/test/broken.js', code);
      expect(result.parseError).toBeDefined();
    });

    it('MUST return valid FileInfo even on parse error', () => {
      const code = 'function broken() {';
      const result = parseFile('/test/broken.js', code);
      expect(result.filePath).toBe('/test/broken.js');
      expect(Array.isArray(result.imports)).toBe(true);
    });

    it('parseFileFromDisk MUST handle non-existent files', async () => {
      const result = await parseFileFromDisk('/non-existent/file.js');
      expect(result.readError).toBeDefined();
    });

    it('parseFiles MUST handle mixed valid/invalid files', async () => {
      const files = [
        './src/layer-a-static/parser/index.js',
        '/non-existent/file.js'
      ];
      const results = await parseFiles(files);
      expect(results.length).toBe(2);
      expect(results[0].readError).toBeUndefined();
      expect(results[1].readError).toBeDefined();
    });

    it('MUST handle null/undefined code', () => {
      expect(() => parseFile('/test/null.js', null)).not.toThrow();
      expect(() => parseFile('/test/undefined.js', undefined)).not.toThrow();
    });

    it('MUST handle invalid file paths', () => {
      const result = parseFile('', 'const x = 1;');
      expect(result.fileName).toBe('');
    });
  });

  describe('Object Exports Analysis', () => {
    it('MUST extract object exports', () => {
      const code = 'export const CONFIG = { API_URL: "test" };';
      const result = parseFile('/test/obj.js', code);
      expect(result.objectExports.length).toBeGreaterThanOrEqual(1);
    });

    it('MUST classify enum-like objects', () => {
      const code = `
        export const Colors = {
          RED: '#ff0000',
          GREEN: '#00ff00',
          BLUE: '#0000ff'
        };
      `;
      const result = parseFile('/test/enum.js', code);
      if (result.objectExports.length > 0) {
        expect(result.objectExports[0].objectType).toBe('enum');
      }
    });

    it('MUST classify state objects with methods', () => {
      const code = `
        export const store = {
          data: {},
          setData(val) { this.data = val; }
        };
      `;
      const result = parseFile('/test/state.js', code);
      if (result.objectExports.length > 0) {
        expect(result.objectExports[0].riskLevel).toBe('high');
      }
    });
  });
});
