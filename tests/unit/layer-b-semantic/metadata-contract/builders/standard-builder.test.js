/**
 * @fileoverview standard-builder.test.js
 * 
 * Tests para el builder de metadatos estándar
 * 
 * @module tests/unit/layer-b-semantic/metadata-contract/builders/standard-builder
 */

import { describe, it, expect } from 'vitest';
import { buildStandardMetadata } from '#layer-b/metadata-contract/builders/standard-builder.js';
import { FileAnalysisBuilder } from '../../../../factories/layer-b-metadata/builders.js';

describe('metadata-contract/builders/standard-builder', () => {
  describe('buildStandardMetadata', () => {
    it('should build metadata with required fields', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withExports(['Component', 'helper'])
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/components/Test.js');
      
      expect(result.filePath).toBe('src/components/Test.js');
      expect(result.exportCount).toBe(2);
      expect(result.dependentCount).toBe(1);
      expect(result.importCount).toBe(1);
      expect(result.functionCount).toBe(2);
    });

    it('should handle empty analysis', () => {
      const result = buildStandardMetadata({}, 'src/test.js');
      
      expect(result.filePath).toBe('src/test.js');
      expect(result.exportCount).toBe(0);
      expect(result.dependentCount).toBe(0);
      expect(result.importCount).toBe(0);
      expect(result.functionCount).toBe(0);
    });

    it('should detect TypeScript files', () => {
      const result = buildStandardMetadata({}, 'src/test.ts');
      
      expect(result.hasTypeScript).toBe(true);
    });

    it('should detect TSX files', () => {
      const result = buildStandardMetadata({}, 'src/component.tsx');
      
      expect(result.hasTypeScript).toBe(true);
    });

    it('should not detect JS as TypeScript', () => {
      const result = buildStandardMetadata({}, 'src/test.js');
      
      expect(result.hasTypeScript).toBe(false);
    });

    it('should extract localStorage keys from semantic analysis', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withSemanticAnalysis({
          sharedState: {
            writes: ['userSettings', 'appConfig']
          }
        })
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.hasLocalStorage).toBe(true);
      expect(result.localStorageKeys).toContain('userSettings');
      expect(result.localStorageKeys).toContain('appConfig');
    });

    it('should extract event names from semantic analysis', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withSemanticAnalysis({
          eventPatterns: {
            eventEmitters: ['user:login', 'app:init'],
            eventListeners: ['data:update']
          }
        })
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.hasEventListeners).toBe(true);
      expect(result.eventNames).toContain('user:login');
      expect(result.eventNames).toContain('app:init');
      expect(result.eventNames).toContain('data:update');
    });

    it('should detect global access', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withSemanticAnalysis({
          sideEffects: { hasGlobalAccess: true }
        })
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.hasGlobalAccess).toBe(true);
    });

    it('should detect dynamic imports', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withSemanticAnalysis({
          sideEffects: { usesDynamicImport: true }
        })
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.hasDynamicImports).toBe(true);
    });

    it('should limit exports array', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withExports(Array(15).fill(0).map((_, i) => `export${i}`))
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.exports.length).toBeLessThanOrEqual(10);
    });

    it('should limit dependents array', () => {
      const fileAnalysis = {
        usedBy: Array(15).fill(0).map((_, i) => `file${i}.js`)
      };
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.dependents.length).toBeLessThanOrEqual(10);
    });

    it('should limit localStorage keys', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withSemanticAnalysis({
          sharedState: {
            writes: Array(10).fill(0).map((_, i) => `key${i}`)
          }
        })
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.localStorageKeys.length).toBeLessThanOrEqual(5);
    });

    it('should limit event names', () => {
      const fileAnalysis = new FileAnalysisBuilder()
        .withSemanticAnalysis({
          eventPatterns: {
            eventEmitters: Array(15).fill(0).map((_, i) => `event${i}`)
          }
        })
        .build();
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.eventNames.length).toBeLessThanOrEqual(10);
    });

    it('should handle string exports', () => {
      const fileAnalysis = {
        exports: ['export1', 'export2', 'export3']
      };
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.exports).toEqual(['export1', 'export2', 'export3']);
    });

    it('should handle object exports', () => {
      const fileAnalysis = {
        exports: [{ name: 'Component' }, { name: 'helper' }]
      };
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.exports).toContain('Component');
      expect(result.exports).toContain('helper');
    });

    it('should filter out null/undefined exports', () => {
      const fileAnalysis = {
        exports: ['valid', null, undefined, 'another']
      };
      
      const result = buildStandardMetadata(fileAnalysis, 'src/test.js');
      
      expect(result.exports).toEqual(['valid', 'another']);
    });

    it('should include all default flags', () => {
      const result = buildStandardMetadata({}, 'src/test.js');
      
      expect(result.hasCSSInJS).toBe(false);
      expect(result.hasAsyncPatterns).toBe(false);
      expect(result.hasJSDoc).toBe(false);
      expect(result.hasRuntimeContracts).toBe(false);
      expect(result.hasErrorHandling).toBe(false);
      expect(result.hasBuildTimeDeps).toBe(false);
      expect(result.hasSingletonPattern).toBe(false);
    });

    it('should include envVars array', () => {
      const result = buildStandardMetadata({}, 'src/test.js');
      
      expect(result.envVars).toEqual([]);
    });
  });
});
