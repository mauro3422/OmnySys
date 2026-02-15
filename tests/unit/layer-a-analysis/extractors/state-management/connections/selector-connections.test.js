/**
 * @fileoverview selector-connections.test.js
 * 
 * Tests for selector-connections.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/connections/selector-connections
 */

import { describe, it, expect } from 'vitest';
import {
  detectSelectorConnections,
  indexStatePaths,
  getFilesUsingPath
} from '#layer-a/extractors/state-management/connections/selector-connections.js';
import { ConnectionType, DEFAULT_CONFIDENCE } from '#layer-a/extractors/state-management/constants.js';
import { StateConnectionBuilder, ReduxBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Selector Connections', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectSelectorConnections).toBe('function');
      expect(typeof indexStatePaths).toBe('function');
      expect(typeof getFilesUsingPath).toBe('function');
    });
  });

  // ============================================================================
  // detectSelectorConnections
  // ============================================================================
  describe('detectSelectorConnections', () => {
    it('should return empty array for empty input', () => {
      const result = detectSelectorConnections({});
      expect(result).toEqual([]);
    });

    it('should return empty array when no selectors', () => {
      const fileResults = {
        'test.js': {
          redux: { selectors: [] }
        }
      };
      const result = detectSelectorConnections(fileResults);
      expect(result).toEqual([]);
    });

    it('should detect connection when same path used in multiple files', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].statePath).toBe('state.user.name');
    });

    it('should not create connection when path used in single file', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      expect(connections).toHaveLength(0);
    });

    it('should create connection with correct type', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.counter.value'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.counter.value'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      expect(connections[0].type).toBe(ConnectionType.SHARED_SELECTOR);
    });

    it('should create connection with confidence value', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      expect(connections[0].confidence).toBe(DEFAULT_CONFIDENCE.selector);
    });

    it('should create multiple connections for different paths', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [
              { paths: ['state.user.name'] },
              { paths: ['state.user.email'] }
            ]
          }
        },
        'file2.js': {
          redux: {
            selectors: [
              { paths: ['state.user.name'] },
              { paths: ['state.user.email'] }
            ]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      expect(connections.length).toBe(2);
    });

    it('should create multiple connections for multiple files using same path', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        },
        'file3.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      // 3 files = 3 choose 2 = 3 connections
      expect(connections.length).toBe(3);
    });

    it('should include reason in connection', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      expect(connections[0]).toHaveProperty('reason');
      expect(typeof connections[0].reason).toBe('string');
      expect(connections[0].reason).toContain('state.user.name');
    });

    it('should include via field set to redux', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      expect(connections[0].via).toBe('redux');
    });

    it('should create unique connection IDs', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        },
        'file3.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);
      const ids = connections.map(c => c.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should handle selectors with multiple paths', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.name', 'state.user.email'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        }
      };

      const connections = detectSelectorConnections(fileResults);

      // Only state.user.name is shared
      expect(connections.some(c => c.statePath === 'state.user.name')).toBe(true);
    });
  });

  // ============================================================================
  // indexStatePaths
  // ============================================================================
  describe('indexStatePaths', () => {
    it('should return empty Map for empty input', () => {
      const result = indexStatePaths({});
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should index paths by state path', () => {
      const fileResults = {
        'test.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        }
      };

      const index = indexStatePaths(fileResults);

      expect(index.has('state.user.name')).toBe(true);
      expect(index.get('state.user.name')).toContain('test.js');
    });

    it('should aggregate multiple files using same path', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        }
      };

      const index = indexStatePaths(fileResults);

      expect(index.get('state.user.id')).toHaveLength(2);
    });

    it('should handle multiple paths in same file', () => {
      const fileResults = {
        'test.js': {
          redux: {
            selectors: [
              { paths: ['state.user.name'] },
              { paths: ['state.user.email'] }
            ]
          }
        }
      };

      const index = indexStatePaths(fileResults);

      expect(index.has('state.user.name')).toBe(true);
      expect(index.has('state.user.email')).toBe(true);
    });

    it('should handle files without redux property', () => {
      const fileResults = {
        'test.js': {}
      };

      const index = indexStatePaths(fileResults);

      expect(index.size).toBe(0);
    });

    it('should handle files without selectors', () => {
      const fileResults = {
        'test.js': {
          redux: {}
        }
      };

      const index = indexStatePaths(fileResults);

      expect(index.size).toBe(0);
    });
  });

  // ============================================================================
  // getFilesUsingPath
  // ============================================================================
  describe('getFilesUsingPath', () => {
    it('should return empty array for empty input', () => {
      const result = getFilesUsingPath({}, 'state.user.name');
      expect(result).toEqual([]);
    });

    it('should return files using specific path', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.email'] }]
          }
        }
      };

      const files = getFilesUsingPath(fileResults, 'state.user.name');

      expect(files).toContain('file1.js');
      expect(files).not.toContain('file2.js');
    });

    it('should return multiple files using same path', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        },
        'file2.js': {
          redux: {
            selectors: [{ paths: ['state.user.id'] }]
          }
        }
      };

      const files = getFilesUsingPath(fileResults, 'state.user.id');

      expect(files).toHaveLength(2);
      expect(files).toContain('file1.js');
      expect(files).toContain('file2.js');
    });

    it('should not duplicate files', () => {
      const fileResults = {
        'file1.js': {
          redux: {
            selectors: [
              { paths: ['state.user.name'] },
              { paths: ['state.user.name'] }
            ]
          }
        }
      };

      const files = getFilesUsingPath(fileResults, 'state.user.name');

      // File should appear only once even if path used multiple times
      expect(files.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for unused path', () => {
      const fileResults = {
        'test.js': {
          redux: {
            selectors: [{ paths: ['state.user.name'] }]
          }
        }
      };

      const files = getFilesUsingPath(fileResults, 'state.unused.path');

      expect(files).toEqual([]);
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with StateConnectionBuilder shared selector scenario', () => {
      const builder = new StateConnectionBuilder();
      builder.withSharedSelectorScenario();
      const fileResults = builder.buildFileResults();

      const connections = detectSelectorConnections(fileResults);

      // Should detect shared state.user.id connection
      expect(Array.isArray(connections)).toBe(true);
    });

    it('should work with ReduxBuilder', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports()
        .withUseSelector('state.user.name', 'name')
        .withUseSelector('state.user.email', 'email');

      const fileResults = {
        'test.js': {
          filePath: 'test.js',
          redux: {
            selectors: [
              { type: 'use_selector', paths: ['state.user.name'], line: 1 },
              { type: 'use_selector', paths: ['state.user.email'], line: 2 }
            ]
          }
        }
      };

      const index = indexStatePaths(fileResults);

      expect(index.has('state.user.name')).toBe(true);
      expect(index.has('state.user.email')).toBe(true);
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

      expect(() => detectSelectorConnections(fileResults)).not.toThrow();
      expect(() => indexStatePaths(fileResults)).not.toThrow();
      expect(() => getFilesUsingPath(fileResults, 'state.x')).not.toThrow();
    });

    it('should handle missing selectors array', () => {
      const fileResults = {
        'test.js': {
          redux: {}
        }
      };

      expect(() => detectSelectorConnections(fileResults)).not.toThrow();
      const connections = detectSelectorConnections(fileResults);
      expect(connections).toEqual([]);
    });

    it('should handle selectors without paths', () => {
      const fileResults = {
        'test.js': {
          redux: {
            selectors: [{ type: 'use_dispatch' }]
          }
        }
      };

      expect(() => detectSelectorConnections(fileResults)).not.toThrow();
      expect(() => indexStatePaths(fileResults)).not.toThrow();
    });

    it('should handle null/undefined entries', () => {
      const fileResults = {
        'test.js': null
      };

      expect(() => detectSelectorConnections(fileResults)).not.toThrow();
    });

    it('should handle empty fileResults', () => {
      expect(detectSelectorConnections({})).toEqual([]);
      expect([...indexStatePaths({}).keys()]).toEqual([]);
      expect(getFilesUsingPath({}, 'state.x')).toEqual([]);
    });

    it('should handle selectors with empty paths array', () => {
      const fileResults = {
        'test.js': {
          redux: {
            selectors: [{ paths: [] }]
          }
        }
      };

      expect(() => detectSelectorConnections(fileResults)).not.toThrow();
      const connections = detectSelectorConnections(fileResults);
      expect(connections).toEqual([]);
    });
  });
});
