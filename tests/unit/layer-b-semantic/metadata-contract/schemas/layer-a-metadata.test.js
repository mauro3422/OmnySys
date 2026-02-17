/**
 * @fileoverview layer-a-metadata.test.js
 * 
 * Tests para schemas de Layer A metadata
 * 
 * @module tests/unit/layer-b-semantic/metadata-contract/schemas/layer-a-metadata
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyMetadata,
  isLayerAMetadata
} from '#layer-b/metadata-contract/schemas/layer-a-metadata.js';

describe('metadata-contract/schemas/layer-a-metadata', () => {
  describe('createEmptyMetadata', () => {
    it('should create metadata with filePath', () => {
      const result = createEmptyMetadata('src/test.js');
      
      expect(result.filePath).toBe('src/test.js');
    });

    it('should create metadata with zero counts', () => {
      const result = createEmptyMetadata('src/test.js');
      
      expect(result.exportCount).toBe(0);
      expect(result.dependentCount).toBe(0);
      expect(result.importCount).toBe(0);
      expect(result.functionCount).toBe(0);
    });

    it('should create metadata with empty arrays', () => {
      const result = createEmptyMetadata('src/test.js');
      
      expect(result.exports).toEqual([]);
      expect(result.dependents).toEqual([]);
      expect(result.localStorageKeys).toEqual([]);
      expect(result.eventNames).toEqual([]);
      expect(result.envVars).toEqual([]);
      expect(result.globalStateWrites).toEqual([]);
      expect(result.globalStateReads).toEqual([]);
      expect(result.semanticConnections).toEqual([]);
    });

    it('should create metadata with false flags', () => {
      const result = createEmptyMetadata('src/test.js');
      
      expect(result.hasDynamicImports).toBe(false);
      expect(result.hasTypeScript).toBe(false);
      expect(result.hasCSSInJS).toBe(false);
      expect(result.hasLocalStorage).toBe(false);
      expect(result.hasEventListeners).toBe(false);
      expect(result.hasEventEmitters).toBe(false);
      expect(result.hasGlobalAccess).toBe(false);
      expect(result.hasAsyncPatterns).toBe(false);
      expect(result.hasJSDoc).toBe(false);
      expect(result.hasSingletonPattern).toBe(false);
    });

    it('should create metadata with semantic counts', () => {
      const result = createEmptyMetadata('src/test.js');
      
      expect(result.semanticDependentCount).toBe(0);
    });

    it('should create metadata with global state flags', () => {
      const result = createEmptyMetadata('src/test.js');
      
      expect(result.definesGlobalState).toBe(false);
      expect(result.usesGlobalState).toBe(false);
    });
  });

  describe('isLayerAMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata = {
        filePath: 'src/test.js',
        exportCount: 5
      };
      
      const result = isLayerAMetadata(metadata);
      
      expect(result).toBe(true);
    });

    it('should return true for empty metadata', () => {
      const result = isLayerAMetadata({});
      
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = isLayerAMetadata(null);
      
      expect(result).toBeFalsy();
    });

    it('should return false for undefined', () => {
      const result = isLayerAMetadata(undefined);
      
      expect(result).toBeFalsy();
    });

    it('should return false for string', () => {
      const result = isLayerAMetadata('not metadata');
      
      expect(result).toBeFalsy();
    });

    it('should return false for number', () => {
      const result = isLayerAMetadata(123);
      
      expect(result).toBeFalsy();
    });

    it('should return false for array', () => {
      const result = isLayerAMetadata([]);
      
      expect(result).toBeFalsy();
    });

    it('should return false when filePath is not string', () => {
      const metadata = {
        filePath: 123,
        exportCount: 5
      };
      
      const result = isLayerAMetadata(metadata);
      
      expect(result).toBeFalsy();
    });

    it('should return false when exportCount is not number', () => {
      const metadata = {
        filePath: 'src/test.js',
        exportCount: 'five'
      };
      
      const result = isLayerAMetadata(metadata);
      
      expect(result).toBeFalsy();
    });

    it('should return true for empty string filePath', () => {
      const metadata = {
        filePath: '',
        exportCount: 0
      };
      
      const result = isLayerAMetadata(metadata);
      
      expect(result).toBe(true);
    });
  });
});
