/**
 * @fileoverview architectural-patterns.test.js
 * 
 * Tests para detectores de patrones arquitectónicos
 * 
 * @module tests/unit/layer-b-semantic/metadata-contract/detectors/architectural-patterns
 */

import { describe, it, expect } from 'vitest';
import {
  detectGodObject,
  detectOrphanModule,
  detectPatterns,
  getPatternDescriptions,
  detectFacade,
  detectConfigHub,
  detectEntryPoint
} from '#layer-b/metadata-contract/detectors/architectural-patterns.js';
import { MetadataBuilder } from '../../../../factories/layer-b-metadata/builders.js';

describe('metadata-contract/detectors/architectural-patterns', () => {
  describe('detectGodObject', () => {
    it('should detect classic God Object (many exports + many dependents)', () => {
      const result = detectGodObject(10, 15);
      expect(result).toBe(true);
    });

    it('should detect God Object with very high dependents', () => {
      const result = detectGodObject(2, 15);
      expect(result).toBe(true);
    });

    it('should detect God Object with extreme coupling ratio', () => {
      // 3 exports, 10 dependents -> ratio 3.33 > 3
      const result = detectGodObject(3, 10);
      expect(result).toBe(true);
    });

    it('should not detect God Object with normal metrics', () => {
      const result = detectGodObject(3, 5);
      expect(result).toBe(false);
    });

    it('should not detect God Object with few exports and dependents', () => {
      const result = detectGodObject(2, 3);
      expect(result).toBe(false);
    });

    it('should handle undefined values', () => {
      const result = detectGodObject(undefined, undefined);
      expect(result).toBe(false);
    });

    it('should handle null values', () => {
      const result = detectGodObject(null, null);
      expect(result).toBe(false);
    });

    it('should handle zero values', () => {
      const result = detectGodObject(0, 0);
      expect(result).toBe(false);
    });

    it('should detect at boundary of classic criteria', () => {
      // MIN_EXPORTS = 5, MIN_DEPENDENTS = 10
      const result = detectGodObject(5, 10);
      expect(result).toBe(true);
    });

    it('should detect at boundary of high dependents', () => {
      // HIGH_DEPENDENTS = 10
      const result = detectGodObject(1, 10);
      expect(result).toBe(true);
    });
  });

  describe('detectOrphanModule', () => {
    it('should detect orphan with exports but no dependents', () => {
      const result = detectOrphanModule(5, 0);
      expect(result).toBe(true);
    });

    it('should detect orphan with minimal exports', () => {
      // MIN_EXPORTS = 1
      const result = detectOrphanModule(1, 0);
      expect(result).toBe(true);
    });

    it('should not detect orphan with dependents', () => {
      const result = detectOrphanModule(5, 1);
      expect(result).toBe(false);
    });

    it('should not detect orphan without exports', () => {
      const result = detectOrphanModule(0, 0);
      expect(result).toBe(false);
    });

    it('should handle undefined values', () => {
      const result = detectOrphanModule(undefined, undefined);
      expect(result).toBe(false);
    });

    it('should handle null values', () => {
      const result = detectOrphanModule(null, null);
      expect(result).toBe(false);
    });
  });

  describe('detectPatterns', () => {
    it('should detect God Object in metadata', () => {
      const metadata = new MetadataBuilder()
        .asGodObject()
        .build();
      
      const result = detectPatterns(metadata);
      
      expect(result.isGodObject).toBe(true);
    });

    it('should detect Orphan Module in metadata', () => {
      const metadata = new MetadataBuilder()
        .asOrphanModule()
        .build();
      
      const result = detectPatterns(metadata);
      
      expect(result.isOrphanModule).toBe(true);
    });

    it('should detect high coupling', () => {
      const metadata = new MetadataBuilder()
        .withDependents(Array(15).fill('file.js'))
        .build();
      
      const result = detectPatterns(metadata);
      
      expect(result.hasHighCoupling).toBe(true);
    });

    it('should detect many exports', () => {
      const metadata = new MetadataBuilder()
        .withExports(Array(10).fill('export'))
        .build();
      
      const result = detectPatterns(metadata);
      
      expect(result.hasManyExports).toBe(true);
    });

    it('should return all pattern flags', () => {
      const metadata = new MetadataBuilder().build();
      
      const result = detectPatterns(metadata);
      
      expect(result).toHaveProperty('isGodObject');
      expect(result).toHaveProperty('isOrphanModule');
      expect(result).toHaveProperty('hasHighCoupling');
      expect(result).toHaveProperty('hasManyExports');
    });
  });

  describe('getPatternDescriptions', () => {
    it('should return God Object description', () => {
      const patterns = { isGodObject: true };
      
      const result = getPatternDescriptions(patterns);
      
      expect(result).toContain('God Object: High coupling and many exports');
    });

    it('should return Orphan Module description', () => {
      const patterns = { isOrphanModule: true };
      
      const result = getPatternDescriptions(patterns);
      
      expect(result).toContain('Orphan Module: Has exports but no dependents');
    });

    it('should return High Coupling description', () => {
      const patterns = { hasHighCoupling: true };
      
      const result = getPatternDescriptions(patterns);
      
      expect(result).toContain('High Coupling: Many files depend on this');
    });

    it('should return Many Exports description', () => {
      const patterns = { hasManyExports: true };
      
      const result = getPatternDescriptions(patterns);
      
      expect(result).toContain('Many Exports: Consider splitting this module');
    });

    it('should return multiple descriptions', () => {
      const patterns = {
        isGodObject: true,
        hasHighCoupling: true,
        isOrphanModule: false,
        hasManyExports: false
      };
      
      const result = getPatternDescriptions(patterns);
      
      expect(result.length).toBe(2);
    });

    it('should return empty array for no patterns', () => {
      const patterns = {
        isGodObject: false,
        isOrphanModule: false,
        hasHighCoupling: false,
        hasManyExports: false
      };
      
      const result = getPatternDescriptions(patterns);
      
      expect(result).toEqual([]);
    });
  });

  describe('detectFacade', () => {
    it('should detect facade with many re-exports', () => {
      const metadata = { reExportCount: 5 };
      
      const result = detectFacade(metadata);
      
      expect(result).toBe(true);
    });

    it('should detect index file with few functions and many exports', () => {
      const metadata = {
        filePath: 'src/index.js',
        reExportCount: 0,
        functionCount: 1,
        exportCount: 5
      };
      
      const result = detectFacade(metadata);
      
      expect(result).toBe(true);
    });

    it('should detect TypeScript index file', () => {
      const metadata = {
        filePath: 'src/index.ts',
        reExportCount: 0,
        functionCount: 0,
        exportCount: 5
      };
      
      const result = detectFacade(metadata);
      
      expect(result).toBe(true);
    });

    it('should not detect facade with few exports', () => {
      const metadata = {
        filePath: 'src/utils.js',
        reExportCount: 1,
        functionCount: 5,
        exportCount: 2
      };
      
      const result = detectFacade(metadata);
      
      expect(result).toBe(false);
    });

    it('should handle missing filePath', () => {
      const metadata = { reExportCount: 5 };
      
      const result = detectFacade(metadata);
      
      expect(result).toBe(true);
    });
  });

  describe('detectConfigHub', () => {
    it('should detect config hub with many exports and dependents', () => {
      const metadata = {
        exportCount: 8,
        dependentCount: 10,
        semanticDependentCount: 5,
        functionCount: 1
      };
      
      const result = detectConfigHub(metadata);
      
      expect(result).toBe(true);
    });

    it('should not detect config hub with too many functions', () => {
      const metadata = {
        exportCount: 8,
        dependentCount: 10,
        functionCount: 5
      };
      
      const result = detectConfigHub(metadata);
      
      expect(result).toBe(false);
    });

    it('should not detect config hub with few exports', () => {
      const metadata = {
        exportCount: 3,
        dependentCount: 10,
        functionCount: 1
      };
      
      const result = detectConfigHub(metadata);
      
      expect(result).toBe(false);
    });

    it('should handle missing semanticDependentCount', () => {
      const metadata = {
        exportCount: 8,
        dependentCount: 10,
        functionCount: 1
      };
      
      const result = detectConfigHub(metadata);
      
      expect(result).toBe(true);
    });
  });

  describe('detectEntryPoint', () => {
    it('should detect entry point with many imports and no dependents', () => {
      const metadata = {
        importCount: 10,
        dependentCount: 0,
        semanticDependentCount: 0
      };
      
      const result = detectEntryPoint(metadata);
      
      expect(result).toBe(true);
    });

    it('should not detect entry point with dependents', () => {
      const metadata = {
        importCount: 10,
        dependentCount: 1
      };
      
      const result = detectEntryPoint(metadata);
      
      expect(result).toBe(false);
    });

    it('should not detect entry point with few imports', () => {
      const metadata = {
        importCount: 2,
        dependentCount: 0
      };
      
      const result = detectEntryPoint(metadata);
      
      expect(result).toBe(false);
    });

    it('should consider semantic dependents', () => {
      const metadata = {
        importCount: 10,
        dependentCount: 0,
        semanticDependentCount: 1
      };
      
      const result = detectEntryPoint(metadata);
      
      expect(result).toBe(false);
    });
  });
});
