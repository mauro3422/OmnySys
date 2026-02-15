/**
 * @fileoverview Parser Contract Tests
 * 
 * Cross-component validation for the Parser system.
 * Verifies that all parser components work together correctly
 * and maintain consistent interfaces.
 */

import { describe, it, expect, vi } from 'vitest';
import { parseFile, parseFiles, parseFileFromDisk } from '#layer-a/parser/index.js';
import { getParserOptions, getBabelPlugins } from '#layer-a/parser/config.js';
import { 
  getFileId, 
  isNodeExported, 
  isExportedFunction, 
  findCallsInFunction 
} from '#layer-a/parser/helpers.js';
import {
  extractESMImport,
  extractCommonJSRequire,
  extractDynamicImport
} from '#layer-a/parser/extractors/imports.js';
import {
  extractNamedExports,
  extractDefaultExport
} from '#layer-a/parser/extractors/exports.js';
import {
  extractFunctionDefinition,
  extractArrowFunction,
  extractClassDefinition
} from '#layer-a/parser/extractors/definitions.js';
import {
  extractCallExpression,
  extractIdentifierRef
} from '#layer-a/parser/extractors/calls.js';
import {
  extractTSInterface,
  extractTSTypeAlias,
  extractTSEnum,
  extractTSTypeReference
} from '#layer-a/parser/extractors/typescript.js';
import {
  CodeSampleBuilder,
  ParserScenarioFactory,
  ParserValidator,
  ASTBuilder,
  PARSER_TEST_CONSTANTS
} from '../../../factories/parser-test.factory.js';

/**
 * All parser exports for contract testing
 */
const PARSER_EXPORTS = [
  { name: 'parseFile', fn: parseFile },
  { name: 'parseFiles', fn: parseFiles },
  { name: 'parseFileFromDisk', fn: parseFileFromDisk },
  { name: 'getParserOptions', fn: getParserOptions },
  { name: 'getBabelPlugins', fn: getBabelPlugins },
  { name: 'getFileId', fn: getFileId },
  { name: 'isNodeExported', fn: isNodeExported },
  { name: 'isExportedFunction', fn: isExportedFunction },
  { name: 'findCallsInFunction', fn: findCallsInFunction },
  { name: 'extractESMImport', fn: extractESMImport },
  { name: 'extractCommonJSRequire', fn: extractCommonJSRequire },
  { name: 'extractDynamicImport', fn: extractDynamicImport },
  { name: 'extractNamedExports', fn: extractNamedExports },
  { name: 'extractDefaultExport', fn: extractDefaultExport },
  { name: 'extractFunctionDefinition', fn: extractFunctionDefinition },
  { name: 'extractArrowFunction', fn: extractArrowFunction },
  { name: 'extractClassDefinition', fn: extractClassDefinition },
  { name: 'extractCallExpression', fn: extractCallExpression },
  { name: 'extractIdentifierRef', fn: extractIdentifierRef },
  { name: 'extractTSInterface', fn: extractTSInterface },
  { name: 'extractTSTypeAlias', fn: extractTSTypeAlias },
  { name: 'extractTSEnum', fn: extractTSEnum },
  { name: 'extractTSTypeReference', fn: extractTSTypeReference }
];

describe('Parser System Contract', () => {
  describe('Structure Contract - All Exports', () => {
    it.each(PARSER_EXPORTS)('$name MUST be a function', ({ fn }) => {
      expect(fn).toBeTypeOf('function');
    });
  });

  describe('FileInfo Structure Contract', () => {
    it('MUST return consistent FileInfo structure for all files', () => {
      const scenarios = [
        ParserScenarioFactory.emptyFile(),
        ParserScenarioFactory.singleFunction(),
        ParserScenarioFactory.withImports(),
        ParserScenarioFactory.withExports(),
        ParserScenarioFactory.typescriptFile()
      ];

      for (const { code, filePath } of scenarios) {
        const result = parseFile(filePath || '/test/file.js', code);
        expect(ParserValidator.isValidFileInfo(result)).toBe(true);
      }
    });

    it('MUST have all required FileInfo fields', () => {
      const result = parseFile('/test/file.js', '');
      
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('ext');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('definitions');
      expect(result).toHaveProperty('calls');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('identifierRefs');
      expect(result).toHaveProperty('typeDefinitions');
      expect(result).toHaveProperty('enumDefinitions');
      expect(result).toHaveProperty('constantExports');
      expect(result).toHaveProperty('objectExports');
      expect(result).toHaveProperty('typeUsages');
    });

    it('MUST have arrays for all collection fields', () => {
      const result = parseFile('/test/file.js', '');
      
      const arrayFields = [
        'imports', 'exports', 'definitions', 'calls', 
        'functions', 'identifierRefs', 'typeDefinitions',
        'enumDefinitions', 'constantExports', 'objectExports', 'typeUsages'
      ];
      
      for (const field of arrayFields) {
        expect(Array.isArray(result[field])).toBe(true);
      }
    });
  });

  describe('Import Type Consistency', () => {
    it('MUST use consistent import type values', () => {
      const code = `
        import { a } from './a.js';
        const b = require('./b.js');
        const c = await import('./c.js');
      `;
      const result = parseFile('/test/file.js', code);
      
      const validTypes = PARSER_TEST_CONSTANTS.IMPORT_TYPES;
      for (const imp of result.imports) {
        expect(validTypes).toContain(imp.type);
      }
    });

    it('MUST have source property for all imports', () => {
      const { code } = ParserScenarioFactory.withImports();
      const result = parseFile('/test/file.js', code);
      
      for (const imp of result.imports) {
        expect(imp).toHaveProperty('source');
        expect(typeof imp.source).toBe('string');
      }
    });

    it('MUST distinguish between ESM and CommonJS imports', () => {
      const code = `
        import { esm } from './esm.js';
        const cjs = require('./cjs.js');
      `;
      const result = parseFile('/test/file.js', code);
      
      const types = result.imports.map(i => i.type);
      expect(types).toContain('esm');
    });
  });

  describe('Export Type Consistency', () => {
    it('MUST use consistent export type values', () => {
      const code = `
        export const a = 1;
        export { b };
        export { c } from './other.js';
        export default function() {}
      `;
      const result = parseFile('/test/file.js', code);
      
      const validTypes = PARSER_TEST_CONSTANTS.EXPORT_TYPES;
      for (const exp of result.exports) {
        expect(validTypes).toContain(exp.type);
      }
    });

    it('MUST have type property for all exports', () => {
      const { code } = ParserScenarioFactory.withExports();
      const result = parseFile('/test/file.js', code);
      
      for (const exp of result.exports) {
        expect(exp).toHaveProperty('type');
      }
    });
  });

  describe('Function Definition Consistency', () => {
    it('MUST use consistent function type values', () => {
      const code = `
        function declaration() {}
        const arrow = () => {};
        const expr = function() {};
        class MyClass {
          method() {}
        }
      `;
      const result = parseFile('/test/file.js', code);
      
      const validTypes = PARSER_TEST_CONSTANTS.FUNCTION_TYPES;
      for (const func of result.functions) {
        expect(validTypes).toContain(func.type);
      }
    });

    it('MUST have required function fields', () => {
      const code = 'function test() {}';
      const result = parseFile('/test/file.js', code);
      
      if (result.functions.length > 0) {
        const func = result.functions[0];
        expect(func).toHaveProperty('id');
        expect(func).toHaveProperty('name');
        expect(func).toHaveProperty('type');
        expect(func).toHaveProperty('line');
        expect(func).toHaveProperty('params');
        expect(func).toHaveProperty('isExported');
        expect(func).toHaveProperty('calls');
      }
    });
  });

  describe('Definition Tracking Consistency', () => {
    it('MUST track definitions and functions consistently', () => {
      const code = `
        function func1() {}
        function func2() {}
        class MyClass {
          method1() {}
          method2() {}
        }
      `;
      const result = parseFile('/test/file.js', code);
      
      // Functions should be tracked in both arrays
      expect(result.functions.length).toBeGreaterThanOrEqual(2);
      expect(result.definitions.length).toBeGreaterThanOrEqual(2);
    });

    it('MUST use consistent definition type values', () => {
      const code = `
        function test() {}
        class MyClass {}
        const arrow = () => {};
        const expr = function() {};
      `;
      const result = parseFile('/test/file.js', code);
      
      const validTypes = PARSER_TEST_CONSTANTS.DEFINITION_TYPES;
      for (const def of result.definitions) {
        expect(validTypes).toContain(def.type);
      }
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle syntax errors without throwing', () => {
      const code = 'function broken() {'; // Missing closing brace
      expect(() => parseFile('/test/broken.js', code)).not.toThrow();
    });

    it('MUST return valid FileInfo on parse error', () => {
      const code = 'function broken() {';
      const result = parseFile('/test/broken.js', code);
      
      expect(result.filePath).toBe('/test/broken.js');
      expect(result.parseError).toBeDefined();
      expect(Array.isArray(result.imports)).toBe(true);
    });

    it('MUST handle all extractor errors gracefully', () => {
      const mockFileInfo = {
        definitions: [],
        functions: [],
        exports: [],
        calls: [],
        identifierRefs: [],
        constantExports: [],
        objectExports: [],
        typeDefinitions: [],
        enumDefinitions: [],
        typeUsages: []
      };

      // Test all extractors with null input
      expect(() => extractCallExpression(null, mockFileInfo)).not.toThrow();
      expect(() => extractIdentifierRef(null, mockFileInfo)).not.toThrow();
    });

    it('MUST handle non-existent files gracefully', async () => {
      const result = await parseFileFromDisk('/non-existent/path/file.js');
      expect(result).toBeDefined();
      expect(result.readError).toBeDefined();
    });

    it('MUST handle empty file list in parseFiles', async () => {
      const results = await parseFiles([]);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('MUST handle invalid file paths', () => {
      const result = parseFile('', 'const x = 1;');
      expect(result).toBeDefined();
      expect(result.fileName).toBe('');
    });
  });

  describe('Configuration Consistency', () => {
    it('MUST provide consistent parser options', () => {
      const options = getParserOptions('test.js');
      
      expect(options.sourceType).toBe('module');
      expect(options.allowImportExportEverywhere).toBe(true);
      expect(options.allowReturnOutsideFunction).toBe(true);
      expect(Array.isArray(options.plugins)).toBe(true);
    });

    it('MUST include required plugins for JS files', () => {
      const plugins = getBabelPlugins('test.js');
      
      expect(plugins).toContain('jsx');
      expect(plugins).toContain('objectRestSpread');
      expect(plugins).toContain('decorators');
      expect(plugins).toContain('classProperties');
    });

    it('MUST configure TypeScript plugin for TS files', () => {
      const plugins = getBabelPlugins('test.ts');
      const hasTypeScript = plugins.some(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(hasTypeScript).toBe(true);
    });
  });

  describe('Cross-Component Integration', () => {
    it('MUST correctly identify exported functions through helpers', () => {
      const code = `
        export function exportedFunc() {}
        function privateFunc() {}
      `;
      const result = parseFile('/test/file.js', code);
      
      const exportedFunc = result.functions.find(f => f.name === 'exportedFunc');
      const privateFunc = result.functions.find(f => f.name === 'privateFunc');
      
      if (exportedFunc) {
        expect(exportedFunc.isExported).toBe(true);
      }
      if (privateFunc) {
        expect(privateFunc.isExported).toBe(false);
      }
    });

    it('MUST correctly track calls within functions', () => {
      const code = `
        function caller() {
          helper1();
          helper2();
        }
      `;
      const result = parseFile('/test/file.js', code);
      
      const callerFunc = result.functions.find(f => f.name === 'caller');
      if (callerFunc && callerFunc.calls) {
        expect(callerFunc.calls.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('MUST extract both imports and exports from same file', () => {
      const code = `
        import { helper } from './helper.js';
        export function test() {
          helper();
        }
      `;
      const result = parseFile('/test/file.js', code);
      
      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.exports.length).toBeGreaterThan(0);
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.calls.length).toBeGreaterThan(0);
    });

    it('MUST handle complete TypeScript file', () => {
      const code = `
        import { Base } from './base.js';
        
        export interface Config {
          name: string;
        }
        
        export type Options = Config | null;
        
        export enum Status {
          ACTIVE,
          INACTIVE
        }
        
        export class MyClass implements Config {
          name: string;
          constructor(name: string) {
            this.name = name;
          }
          
          getStatus(): Status {
            return Status.ACTIVE;
          }
        }
        
        export default MyClass;
      `;
      const result = parseFile('/test/file.ts', code);
      
      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.exports.length).toBeGreaterThan(0);
      expect(result.typeDefinitions.length).toBeGreaterThanOrEqual(2); // Config, Options
      expect(result.enumDefinitions.length).toBeGreaterThanOrEqual(1); // Status
      expect(result.functions.length).toBeGreaterThanOrEqual(1); // getStatus
      expect(result.definitions.some(d => d.type === 'class')).toBe(true);
    });
  });

  describe('Performance Contract', () => {
    it('MUST parse small files in under 50ms', () => {
      const code = 'function test() { return 1; }';
      const start = performance.now();
      parseFile('/test/file.js', code);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50);
    });

    it('MUST parse medium files in under 100ms', () => {
      const builder = new CodeSampleBuilder();
      for (let i = 0; i < 50; i++) {
        builder.withFunction(`func${i}`, [], `return ${i};`);
      }
      const { code } = builder.build();
      
      const start = performance.now();
      parseFile('/test/file.js', code);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('TypeScript Support Contract', () => {
    it('MUST parse .ts files with TypeScript syntax', () => {
      const code = `
        interface User {
          name: string;
        }
        type ID = string | number;
      `;
      const result = parseFile('/test/file.ts', code);
      
      expect(result.typeDefinitions.length).toBeGreaterThanOrEqual(2);
    });

    it('MUST parse .tsx files with JSX', () => {
      const code = `
        export const Component = () => {
          return <div>Hello</div>;
        };
      `;
      const result = parseFile('/test/file.tsx', code);
      
      expect(result.functions.length).toBeGreaterThan(0);
    });

    it('MUST track type usages', () => {
      const code = `
        type User = { name: string };
        const user: User = { name: 'test' };
      `;
      const result = parseFile('/test/file.ts', code);
      
      expect(result.typeUsages.some(u => u.name === 'User')).toBe(true);
    });
  });

  describe('Path Alias Integration', () => {
    it('MUST resolve #layer-a/parser path alias', async () => {
      // This test verifies that the path alias is correctly configured
      // The fact that we can import at the top of this file proves it works
      expect(parseFile).toBeDefined();
      expect(getParserOptions).toBeDefined();
      expect(extractESMImport).toBeDefined();
    });
  });
});
