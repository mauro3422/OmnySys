/**
 * @fileoverview import-extractor.test.js
 * 
 * Tests for the import extractor module
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor/extractors/import-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractImports,
  extractDynamicImports,
  extractImportAliases,
  extractBarrelImports,
  extractUnusedImports
} from '#layer-a/extractors/comprehensive-extractor/extractors/import-extractor.js';
import {
  ImportExportBuilder,
  ExtractionValidator,
  TestConstants
} from '#test-factories/comprehensive-extractor-test.factory.js';

describe('Import Extractor', () => {
  describe('extractImports', () => {
    it('should return empty result for empty code', () => {
      const result = extractImports('');
      expect(result.all).toEqual([]);
      expect(result.named).toEqual([]);
      expect(result.defaultImports).toEqual([]);
    });

    it('should extract named imports', () => {
      const builder = new ImportExportBuilder()
        .withNamedImport(['foo', 'bar'], './module');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.all.length).toBeGreaterThan(0);
      expect(result.named.length).toBeGreaterThan(0);
    });

    it('should extract default imports', () => {
      const builder = new ImportExportBuilder()
        .withDefaultImport('DefaultExport', './module');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.defaultImports.length).toBeGreaterThan(0);
      expect(result.defaultImports[0].name).toBe('DefaultExport');
    });

    it('should extract namespace imports', () => {
      const builder = new ImportExportBuilder()
        .withNamespaceImport('Utils', './utils');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.namespace.length).toBeGreaterThan(0);
    });

    it('should extract side-effect imports', () => {
      const builder = new ImportExportBuilder()
        .withSideEffectImport('./polyfill');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.sideEffect.length).toBeGreaterThan(0);
    });

    it('should extract CommonJS requires', () => {
      const builder = new ImportExportBuilder()
        .withCommonJSRequire(['foo', 'bar'], './module');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.commonjs.length).toBeGreaterThan(0);
    });

    it('should categorize imports correctly', () => {
      const { code } = ImportExportBuilder.mixedImports();
      const result = extractImports(code);
      
      expect(result.named.length).toBeGreaterThan(0);
      expect(result.commonjs.length).toBeGreaterThan(0);
    });

    it('should detect dynamic imports', () => {
      const builder = new ImportExportBuilder()
        .withDynamicImport('./dynamic');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.dynamicImports.length).toBeGreaterThan(0);
    });

    it('should analyze import patterns', () => {
      const builder = new ImportExportBuilder()
        .withNamedImport(['foo'], './local')
        .withNamedImport(['bar'], 'external-package');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.patterns).toBeDefined();
      expect(result.patterns.hasLocalImports).toBe(true);
      expect(result.patterns.hasNodeModules).toBe(true);
    });

    it('should calculate metrics', () => {
      const builder = new ImportExportBuilder()
        .withNamedImport(['a'], './local')
        .withNamedImport(['b'], 'package1')
        .withNamedImport(['c'], 'package1')
        .withNamedImport(['d'], 'package2');
      const { code } = builder.build();
      
      const result = extractImports(code);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.total).toBe(4);
      expect(result.metrics.unique).toBe(3);
    });

    it('should include metadata', () => {
      const { code } = ImportExportBuilder.es6Imports();
      const result = extractImports(code);
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata.success).toBe(true);
      expect(result._metadata.extractedAt).toBeDefined();
    });

    it('should handle errors gracefully', () => {
      const result = extractImports(null);
      expect(result._metadata.success).toBe(false);
      expect(result._metadata.error).toBeDefined();
    });
  });

  describe('extractDynamicImports', () => {
    it('should return empty array for empty code', () => {
      const result = extractDynamicImports('');
      expect(result).toEqual([]);
    });

    it('should extract basic dynamic imports', () => {
      const code = "import('./module');";
      const result = extractDynamicImports(code);
      
      expect(result.length).toBe(1);
      expect(result[0].source).toBe('./module');
    });

    it('should extract awaited dynamic imports', () => {
      const code = "await import('./module');";
      const result = extractDynamicImports(code);
      
      expect(result.length).toBe(1);
      expect(result[0].hasAwait).toBe(true);
    });

    it('should detect lazy imports', () => {
      const code = "const LazyComponent = lazy(() => import('./component'));";
      const result = extractDynamicImports(code);
      
      expect(result.length).toBe(1);
      expect(result[0].isLazy).toBe(true);
    });

    it('should detect conditional imports', () => {
      const code = "if (condition) { await import('./module'); }";
      const result = extractDynamicImports(code);
      
      expect(result.length).toBe(1);
      expect(result[0].isConditional).toBe(true);
    });

    it('should detect imports inside functions', () => {
      const code = "function load() { return import('./module'); }";
      const result = extractDynamicImports(code);
      
      expect(result.length).toBe(1);
      expect(result[0].isInsideFunction).toBe(true);
    });
  });

  describe('extractImportAliases', () => {
    it('should return empty array for empty imports', () => {
      const result = extractImportAliases([]);
      expect(result).toEqual([]);
    });

    it('should extract aliased imports', () => {
      const imports = [{
        type: 'NamedImport',
        names: ['original as alias'],
        source: './module'
      }];
      
      const result = extractImportAliases(imports);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].original).toBe('original');
      expect(result[0].alias).toBe('alias');
    });

    it('should handle multiple aliases', () => {
      const imports = [{
        type: 'NamedImport',
        names: ['a as b', 'c as d'],
        source: './module'
      }];
      
      const result = extractImportAliases(imports);
      expect(result.length).toBe(2);
    });
  });

  describe('extractBarrelImports', () => {
    it('should return empty array for empty imports', () => {
      const result = extractBarrelImports([]);
      expect(result).toEqual([]);
    });

    it('should detect index imports', () => {
      const imports = [{
        type: 'NamedImport',
        names: ['foo'],
        source: './utils/index'
      }];
      
      const result = extractBarrelImports(imports);
      expect(result.length).toBe(1);
    });

    it('should detect directory imports', () => {
      const imports = [{
        type: 'NamedImport',
        names: ['foo'],
        source: './components/'
      }];
      
      const result = extractBarrelImports(imports);
      expect(result.length).toBe(1);
    });

    it('should not detect regular imports', () => {
      const imports = [{
        type: 'NamedImport',
        names: ['foo'],
        source: './utils/helpers'
      }];
      
      const result = extractBarrelImports(imports);
      expect(result.length).toBe(0);
    });
  });

  describe('extractUnusedImports', () => {
    it('should return empty array for empty code', () => {
      const result = extractUnusedImports('', []);
      expect(result).toEqual([]);
    });

    it('should detect unused imports', () => {
      const code = "import { unused } from './module';\nconst x = 1;";
      const imports = [{
        type: 'NamedImport',
        names: ['unused'],
        source: './module'
      }];
      
      const result = extractUnusedImports(code, imports);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('unused');
    });

    it('should not detect used imports', () => {
      const code = "import { used } from './module';\nused();";
      const imports = [{
        type: 'NamedImport',
        names: ['used'],
        source: './module'
      }];
      
      const result = extractUnusedImports(code, imports);
      expect(result.length).toBe(0);
    });

    it('should handle default imports', () => {
      const code = "import DefaultExport from './module';";
      const imports = [{
        type: 'DefaultImport',
        name: 'DefaultExport',
        source: './module'
      }];
      
      const result = extractUnusedImports(code, imports);
      expect(result.length).toBe(1);
    });
  });
});
