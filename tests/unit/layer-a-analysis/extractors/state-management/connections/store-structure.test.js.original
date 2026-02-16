/**
 * @fileoverview store-structure.test.js
 * 
 * Tests for store-structure.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/connections/store-structure
 */

import { describe, it, expect } from 'vitest';
import {
  detectStoreStructure,
  getSlicesByFile,
  getAllSliceNames,
  getStoreStats
} from '#layer-a/extractors/state-management/connections/store-structure.js';
import { StateConnectionBuilder, ReduxBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Store Structure', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectStoreStructure).toBe('function');
      expect(typeof getSlicesByFile).toBe('function');
      expect(typeof getAllSliceNames).toBe('function');
      expect(typeof getStoreStats).toBe('function');
    });
  });

  // ============================================================================
  // detectStoreStructure
  // ============================================================================
  describe('detectStoreStructure', () => {
    it('should return structure object for empty input', () => {
      const result = detectStoreStructure({});

      expect(result).toHaveProperty('sliceCount');
      expect(result).toHaveProperty('slices');
      expect(result).toHaveProperty('likelyStateKeys');
    });

    it('should return zero count for empty input', () => {
      const result = detectStoreStructure({});

      expect(result.sliceCount).toBe(0);
    });

    it('should return empty arrays for empty input', () => {
      const result = detectStoreStructure({});

      expect(result.slices).toEqual([]);
      expect(result.likelyStateKeys).toEqual([]);
    });

    it('should count slices from all files', () => {
      const fileResults = {
        'slice1.js': {
          redux: {
            reducers: [{ name: 'counter', line: 1 }]
          }
        },
        'slice2.js': {
          redux: {
            reducers: [{ name: 'user', line: 1 }]
          }
        }
      };

      const result = detectStoreStructure(fileResults);

      expect(result.sliceCount).toBe(2);
    });

    it('should include slice details in slices array', () => {
      const fileResults = {
        'slice.js': {
          redux: {
            reducers: [{ name: 'counter', line: 10 }]
          }
        }
      };

      const result = detectStoreStructure(fileResults);

      expect(result.slices).toHaveLength(1);
      expect(result.slices[0]).toHaveProperty('name', 'counter');
      expect(result.slices[0]).toHaveProperty('file', 'slice.js');
      expect(result.slices[0]).toHaveProperty('line', 10);
    });

    it('should generate likelyStateKeys from slice names', () => {
      const fileResults = {
        'slice.js': {
          redux: {
            reducers: [
              { name: 'CounterSlice' },
              { name: 'UserProfile' }
            ]
          }
        }
      };

      const result = detectStoreStructure(fileResults);

      expect(result.likelyStateKeys).toContain('counterslice');
      expect(result.likelyStateKeys).toContain('userprofile');
    });

    it('should handle multiple slices in same file', () => {
      const fileResults = {
        'slices.js': {
          redux: {
            reducers: [
              { name: 'counter' },
              { name: 'user' },
              { name: 'theme' }
            ]
          }
        }
      };

      const result = detectStoreStructure(fileResults);

      expect(result.sliceCount).toBe(3);
      expect(result.slices).toHaveLength(3);
    });

    it('should handle files without reducers', () => {
      const fileResults = {
        'empty.js': {
          redux: {
            reducers: []
          }
        },
        'slice.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        }
      };

      const result = detectStoreStructure(fileResults);

      expect(result.sliceCount).toBe(1);
    });
  });

  // ============================================================================
  // getSlicesByFile
  // ============================================================================
  describe('getSlicesByFile', () => {
    it('should return empty Map for empty input', () => {
      const result = getSlicesByFile({});

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should map slices to their files', () => {
      const fileResults = {
        'slice.js': {
          redux: {
            reducers: [{ name: 'counter', line: 1 }]
          }
        }
      };

      const result = getSlicesByFile(fileResults);

      expect(result.has('slice.js')).toBe(true);
      expect(result.get('slice.js')).toHaveLength(1);
    });

    it('should include only files with reducers', () => {
      const fileResults = {
        'withSlice.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        },
        'withoutSlice.js': {
          redux: {
            reducers: []
          }
        }
      };

      const result = getSlicesByFile(fileResults);

      expect(result.has('withSlice.js')).toBe(true);
      expect(result.has('withoutSlice.js')).toBe(false);
    });

    it('should include all reducers for file with multiple', () => {
      const fileResults = {
        'slices.js': {
          redux: {
            reducers: [
              { name: 'counter' },
              { name: 'user' }
            ]
          }
        }
      };

      const result = getSlicesByFile(fileResults);

      expect(result.get('slices.js')).toHaveLength(2);
    });

    it('should handle files without redux property', () => {
      const fileResults = {
        'test.js': {}
      };

      const result = getSlicesByFile(fileResults);

      expect(result.size).toBe(0);
    });
  });

  // ============================================================================
  // getAllSliceNames
  // ============================================================================
  describe('getAllSliceNames', () => {
    it('should return empty array for empty input', () => {
      const result = getAllSliceNames({});

      expect(result).toEqual([]);
    });

    it('should return all slice names', () => {
      const fileResults = {
        'slice1.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        },
        'slice2.js': {
          redux: {
            reducers: [{ name: 'user' }]
          }
        }
      };

      const result = getAllSliceNames(fileResults);

      expect(result).toContain('counter');
      expect(result).toContain('user');
    });

    it('should deduplicate slice names', () => {
      const fileResults = {
        'slice1.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        },
        'slice2.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        }
      };

      const result = getAllSliceNames(fileResults);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('counter');
    });

    it('should return array of strings', () => {
      const fileResults = {
        'slice.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        }
      };

      const result = getAllSliceNames(fileResults);

      result.forEach(name => {
        expect(typeof name).toBe('string');
      });
    });
  });

  // ============================================================================
  // getStoreStats
  // ============================================================================
  describe('getStoreStats', () => {
    it('should return stats object for empty input', () => {
      const result = getStoreStats({});

      expect(result).toHaveProperty('totalSlices');
      expect(result).toHaveProperty('totalStores');
      expect(result).toHaveProperty('sliceNames');
      expect(result).toHaveProperty('likelyStateKeys');
    });

    it('should count total slices', () => {
      const fileResults = {
        'slice1.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        },
        'slice2.js': {
          redux: {
            reducers: [{ name: 'user' }]
          }
        }
      };

      const result = getStoreStats(fileResults);

      expect(result.totalSlices).toBe(2);
    });

    it('should count total stores', () => {
      const fileResults = {
        'store1.js': {
          redux: {
            stores: [{ line: 1 }]
          }
        },
        'store2.js': {
          redux: {
            stores: [{ line: 1 }]
          }
        },
        'slice.js': {
          redux: {
            stores: []
          }
        }
      };

      const result = getStoreStats(fileResults);

      expect(result.totalStores).toBe(2);
    });

    it('should include slice names', () => {
      const fileResults = {
        'slice.js': {
          redux: {
            reducers: [{ name: 'counter' }]
          }
        }
      };

      const result = getStoreStats(fileResults);

      expect(result.sliceNames).toContain('counter');
    });

    it('should include likelyStateKeys', () => {
      const fileResults = {
        'slice.js': {
          redux: {
            reducers: [{ name: 'CounterSlice' }]
          }
        }
      };

      const result = getStoreStats(fileResults);

      expect(result.likelyStateKeys.length).toBeGreaterThan(0);
    });

    it('should handle zero counts correctly', () => {
      const fileResults = {};

      const result = getStoreStats(fileResults);

      expect(result.totalSlices).toBe(0);
      expect(result.totalStores).toBe(0);
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with StateConnectionBuilder Redux architecture', () => {
      const builder = new StateConnectionBuilder();
      builder.withReduxArchitecture();
      const fileResults = builder.buildFileResults();

      const structure = detectStoreStructure(fileResults);

      expect(structure).toHaveProperty('sliceCount');
      expect(structure).toHaveProperty('slices');
    });

    it('should work with ReduxBuilder', () => {
      const builder = new ReduxBuilder();
      builder.withSliceImports()
        .withSlice('counter')
        .withSlice('user');

      const fileResults = {
        'slices.js': {
          filePath: 'slices.js',
          redux: {
            reducers: [
              { name: 'counter', type: 'create_slice', line: 1 },
              { name: 'user', type: 'create_slice', line: 10 }
            ],
            stores: []
          }
        }
      };

      const sliceNames = getAllSliceNames(fileResults);

      expect(sliceNames).toContain('counter');
      expect(sliceNames).toContain('user');
    });

    it('should handle complete Redux setup from factory', () => {
      const builder = new StateConnectionBuilder();
      builder.withReduxArchitecture();
      const files = builder.build();

      // Convert to fileResults format
      const fileResults = {};
      for (const [path, data] of Object.entries(files)) {
        fileResults[path] = {
          filePath: path,
          redux: {
            reducers: data.slices || [],
            stores: data.stores || []
          }
        };
      }

      const stats = getStoreStats(fileResults);

      expect(stats.totalSlices).toBeGreaterThan(0);
      expect(Array.isArray(stats.sliceNames)).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle missing redux property', () => {
      const fileResults = {
        'test.js': {}
      };

      expect(() => detectStoreStructure(fileResults)).not.toThrow();
      expect(() => getSlicesByFile(fileResults)).not.toThrow();
      expect(() => getAllSliceNames(fileResults)).not.toThrow();
      expect(() => getStoreStats(fileResults)).not.toThrow();
    });

    it('should handle missing reducers array', () => {
      const fileResults = {
        'test.js': {
          redux: {}
        }
      };

      const result = detectStoreStructure(fileResults);

      expect(result.sliceCount).toBe(0);
      expect(result.slices).toEqual([]);
    });

    it('should handle null/undefined entries', () => {
      const fileResults = {
        'test.js': null
      };

      expect(() => detectStoreStructure(fileResults)).not.toThrow();
      expect(() => getSlicesByFile(fileResults)).not.toThrow();
      expect(() => getAllSliceNames(fileResults)).not.toThrow();
      expect(() => getStoreStats(fileResults)).not.toThrow();
    });

    it('should handle reducers without name', () => {
      const fileResults = {
        'test.js': {
          redux: {
            reducers: [{ line: 1 }]
          }
        }
      };

      expect(() => detectStoreStructure(fileResults)).not.toThrow();
      expect(() => getAllSliceNames(fileResults)).not.toThrow();
    });

    it('should handle empty fileResults', () => {
      const structure = detectStoreStructure({});
      expect(structure.sliceCount).toBe(0);
      expect(structure.slices).toEqual([]);

      const slicesByFile = getSlicesByFile({});
      expect(slicesByFile.size).toBe(0);

      const sliceNames = getAllSliceNames({});
      expect(sliceNames).toEqual([]);

      const stats = getStoreStats({});
      expect(stats.totalSlices).toBe(0);
      expect(stats.totalStores).toBe(0);
    });
  });
});
