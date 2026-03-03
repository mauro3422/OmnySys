/**
 * @fileoverview Tests para el Parser de Layer A
 * 
 * Test coverage:
 * - parseFile(): Parseo de código inline
 * - parseFileFromDisk(): Lectura y parseo de archivos
 * - Extracción de imports (ESM, CommonJS, dynamic)
 * - Extracción de exports (named, default)
 * - Extracción de definiciones (funciones, clases)
 * - Manejo de errores
 */

import { describe, it, expect } from 'vitest';
import { parseFile, parseFileFromDisk } from '../../../../src/layer-a-static/parser/index.js';

describe('Layer A - Parser', () => {

  describe('parseFile() - Basic parsing', () => {
    it('should parse an empty file', async () => {
      const code = '';
      const result = await parseFile('/test/empty.js', code);

      expect(result.filePath).toBe('/test/empty.js');
      expect(result.fileName).toBe('empty.js');
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
      expect(result.definitions).toEqual([]);
    });

    it('should parse ESM imports', async () => {
      const code = `
        import { foo, bar } from './module.js';
        import defaultExport from './default.js';
        import * as namespace from './namespace.js';
      `;

      const result = await parseFile('/test/file.js', code);

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].source).toBe('./module.js');
      // Specifiers are objects with { type, imported, local }
      const specifierNames = result.imports[0].specifiers.map(s => s.imported || s.local);
      expect(specifierNames).toContain('foo');
      expect(specifierNames).toContain('bar');
    });

    it('should parse CommonJS requires', async () => {
      const code = `
        const fs = require('fs');
        const { join } = require('path');
        const myModule = require('./local-module');
      `;

      const result = await parseFile('/test/file.js', code);

      const requires = result.imports.filter(imp => imp.type === 'commonjs');
      expect(requires.length).toBeGreaterThanOrEqual(2);
      expect(requires.map(r => r.source)).toContain('fs');
      expect(requires.map(r => r.source)).toContain('path');
    });

    it('should parse named exports', async () => {
      const code = `
        export const foo = 1;
        export function bar() {}
        export class Baz {}
      `;

      const result = await parseFile('/test/file.js', code);

      expect(result.exports.length).toBeGreaterThanOrEqual(3);
      const exportNames = result.exports.map(e => e.name);
      expect(exportNames).toContain('foo');
      expect(exportNames).toContain('bar');
      expect(exportNames).toContain('Baz');
    });

    it('should parse default export', async () => {
      const code = `
        export default function main() {}
      `;

      const result = await parseFile('/test/file.js', code);

      const defaultExport = result.exports.find(e => e.type === 'default');
      expect(defaultExport).toBeDefined();
      // Default exports have 'kind' (e.g., 'FunctionDeclaration'), not 'name'
      expect(defaultExport.kind).toBe('FunctionDeclaration');
    });

    it('should parse function declarations', async () => {
      const code = `
        function helper1() {}
        function helper2(x, y) { return x + y; }
        async function asyncHelper() {}
      `;

      const result = await parseFile('/test/file.js', code);

      expect(result.functions.length).toBeGreaterThanOrEqual(3);
      const funcNames = result.functions.map(f => f.name);
      expect(funcNames).toContain('helper1');
      expect(funcNames).toContain('helper2');
      expect(funcNames).toContain('asyncHelper');
    });

    it('should parse arrow functions', async () => {
      const code = `
        const add = (a, b) => a + b;
        const multiply = (x, y) => {
          return x * y;
        };
      `;

      const result = await parseFile('/test/file.js', code);

      const arrowFuncs = result.functions.filter(f => f.type === 'arrow');
      expect(arrowFuncs.length).toBeGreaterThanOrEqual(2);
      const arrowNames = arrowFuncs.map(f => f.name);
      expect(arrowNames).toContain('add');
      expect(arrowNames).toContain('multiply');
    });

    it('should parse class declarations', async () => {
      const code = `
        class MyClass {
          constructor() {}
          method1() {}
          async method2() {}
        }
      `;

      const result = await parseFile('/test/file.js', code);

      const classes = result.definitions.filter(d => d.type === 'class');
      expect(classes.length).toBeGreaterThanOrEqual(1);
      expect(classes[0].name).toBe('MyClass');
    });

    it('should extract function calls', async () => {
      const code = `
        import { helper } from './helper.js';
        helper();
        console.log('test');
        foo.bar();
      `;

      const result = await parseFile('/test/file.js', code);

      expect(result.calls.length).toBeGreaterThan(0);
      const callNames = result.calls.map(c => c.name);
      expect(callNames).toContain('helper');
      // Member calls like console.log are stored as 'console.log'
      expect(callNames).toContain('console.log');
    });

    it('should handle parse errors gracefully', async () => {
      const code = `
        // Syntax error: missing closing brace
        function broken() {
          return 1;
      `;

      const result = await parseFile('/test/broken.js', code);

      expect(result._error || result.parseError).toBeDefined();
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
    });
  });

  describe('parseFileFromDisk() - File system', () => {
    it('should parse an existing file', async () => {
      const result = await parseFileFromDisk('./src/layer-a-static/parser/index.js');

      expect(result.filePath).toContain('parser/index.js');
      expect(result.readError).toBeUndefined();
      expect(result.imports.length).toBeGreaterThan(0);
    });

    it('should handle non-existent files', async () => {
      const result = await parseFileFromDisk('./non-existent-file.js');

      expect(result.readError).toBeDefined();
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
    });
  });

  describe('TypeScript support', () => {
    it('should parse TypeScript interfaces', async () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }
        
        interface Admin extends User {
          role: 'admin';
        }
      `;

      const result = await parseFile('/test/types.ts', code);

      expect(result.typeDefinitions.length).toBeGreaterThanOrEqual(2);
      expect(result.typeDefinitions[0].name).toBe('User');
    });

    it('should parse TypeScript type aliases', async () => {
      const code = `
        type ID = string | number;
        type Callback = (x: number) => void;
      `;

      const result = await parseFile('/test/types.ts', code);

      expect(result.typeDefinitions.length).toBeGreaterThanOrEqual(2);
      const typeNames = result.typeDefinitions.map(t => t.name);
      expect(typeNames).toContain('ID');
    });
  });

  describe('Dynamic imports', () => {
    it('should detect dynamic imports', async () => {
      const code = `
        const module = await import('./dynamic-module.js');
        const lazy = import('./lazy.js');
      `;

      const result = await parseFile('/test/file.js', code);

      const dynamicImports = result.imports.filter(imp => imp.type === 'dynamic');
      expect(dynamicImports.length).toBeGreaterThanOrEqual(1);
    });
  });
});
