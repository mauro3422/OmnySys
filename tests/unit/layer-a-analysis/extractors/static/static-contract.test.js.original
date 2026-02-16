/**
 * @fileoverview static-contract.test.js
 * 
 * Contract tests for Static Extractor module
 * Ensures all exports are present and follow the expected interface
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/static-contract
 */

import { describe, it, expect } from 'vitest';

// Test index.js exports
import {
  // Main functions
  extractSemanticFromFile,
  detectAllSemanticConnections,
  extractAllFromFiles,
  detectOnlyStorageConnections,
  detectOnlyEventConnections,
  detectOnlyGlobalConnections,
  // Individual extractors
  extractLocalStorageKeys,
  extractEventNames,
  extractGlobalAccess,
  extractRoutes,
  // Connection detectors
  detectLocalStorageConnections,
  detectEventConnections,
  detectGlobalConnections,
  detectEnvConnections,
  detectColocatedFiles,
  detectRouteConnections,
  // Utilities
  sharesStorageKeys,
  getSharedStorageKeys,
  sharesEvents,
  getEventFlow,
  sharesGlobalVariables,
  getSharedGlobalVariables,
  sharesEnvVars,
  getSharedEnvVars,
  getColocatedFilesFor,
  hasTestCompanion,
  sharesRoutes,
  getSharedRoutes,
  // Utils
  getLineNumber,
  isNativeWindowProp,
  // Constants
  ConnectionType
} from '#layer-a/extractors/static/index.js';

// Test constants.js exports
import {
  NATIVE_WINDOW_PROPS,
  STORAGE_PATTERNS,
  EVENT_PATTERNS,
  GLOBAL_PATTERNS,
  DEFAULT_CONFIDENCE
} from '#layer-a/extractors/static/constants.js';

// Test utils.js exports
import {
  getLineNumber as getLineNumberFromUtils,
  isNativeWindowProp as isNativeWindowPropFromUtils,
  extractMatches
} from '#layer-a/extractors/static/utils.js';

describe('Static Extractor Contract Tests', () => {
  describe('Index exports', () => {
    it('should export extractSemanticFromFile', () => {
      expect(typeof extractSemanticFromFile).toBe('function');
    });

    it('should export detectAllSemanticConnections', () => {
      expect(typeof detectAllSemanticConnections).toBe('function');
    });

    it('should export extractAllFromFiles', () => {
      expect(typeof extractAllFromFiles).toBe('function');
    });

    it('should export specialized connection detectors', () => {
      expect(typeof detectOnlyStorageConnections).toBe('function');
      expect(typeof detectOnlyEventConnections).toBe('function');
      expect(typeof detectOnlyGlobalConnections).toBe('function');
    });

    it('should export individual extractors', () => {
      expect(typeof extractLocalStorageKeys).toBe('function');
      expect(typeof extractEventNames).toBe('function');
      expect(typeof extractGlobalAccess).toBe('function');
      expect(typeof extractRoutes).toBe('function');
    });

    it('should export connection detectors', () => {
      expect(typeof detectLocalStorageConnections).toBe('function');
      expect(typeof detectEventConnections).toBe('function');
      expect(typeof detectGlobalConnections).toBe('function');
      expect(typeof detectEnvConnections).toBe('function');
      expect(typeof detectColocatedFiles).toBe('function');
      expect(typeof detectRouteConnections).toBe('function');
    });

    it('should export helper functions', () => {
      expect(typeof sharesStorageKeys).toBe('function');
      expect(typeof getSharedStorageKeys).toBe('function');
      expect(typeof sharesEvents).toBe('function');
      expect(typeof getEventFlow).toBe('function');
      expect(typeof sharesGlobalVariables).toBe('function');
      expect(typeof getSharedGlobalVariables).toBe('function');
      expect(typeof sharesEnvVars).toBe('function');
      expect(typeof getSharedEnvVars).toBe('function');
      expect(typeof getColocatedFilesFor).toBe('function');
      expect(typeof hasTestCompanion).toBe('function');
      expect(typeof sharesRoutes).toBe('function');
      expect(typeof getSharedRoutes).toBe('function');
    });

    it('should export utilities', () => {
      expect(typeof getLineNumber).toBe('function');
      expect(typeof isNativeWindowProp).toBe('function');
    });

    it('should export ConnectionType', () => {
      expect(typeof ConnectionType).toBe('object');
      expect(ConnectionType.LOCAL_STORAGE).toBe('localStorage');
      expect(ConnectionType.GLOBAL_VARIABLE).toBe('globalVariable');
      expect(ConnectionType.EVENT_LISTENER).toBe('eventListener');
      expect(ConnectionType.SHARED_ENV).toBe('shared-env');
      expect(ConnectionType.COLOCATED).toBe('colocated');
      expect(ConnectionType.SHARED_ROUTE).toBe('shared-route');
    });
  });

  describe('Constants exports', () => {
    it('should export NATIVE_WINDOW_PROPS', () => {
      expect(Array.isArray(NATIVE_WINDOW_PROPS)).toBe(true);
      expect(NATIVE_WINDOW_PROPS.length).toBeGreaterThan(0);
    });

    it('should export STORAGE_PATTERNS', () => {
      expect(typeof STORAGE_PATTERNS).toBe('object');
      expect(Array.isArray(STORAGE_PATTERNS.reads)).toBe(true);
      expect(Array.isArray(STORAGE_PATTERNS.writes)).toBe(true);
    });

    it('should export EVENT_PATTERNS', () => {
      expect(typeof EVENT_PATTERNS).toBe('object');
      expect(Array.isArray(EVENT_PATTERNS.listeners)).toBe(true);
      expect(Array.isArray(EVENT_PATTERNS.emitters)).toBe(true);
    });

    it('should export GLOBAL_PATTERNS', () => {
      expect(typeof GLOBAL_PATTERNS).toBe('object');
      expect(Array.isArray(GLOBAL_PATTERNS.reads)).toBe(true);
      expect(Array.isArray(GLOBAL_PATTERNS.writes)).toBe(true);
    });

    it('should export DEFAULT_CONFIDENCE', () => {
      expect(typeof DEFAULT_CONFIDENCE).toBe('number');
      expect(DEFAULT_CONFIDENCE).toBe(1.0);
    });
  });

  describe('Utils exports', () => {
    it('should export getLineNumber', () => {
      expect(typeof getLineNumberFromUtils).toBe('function');
    });

    it('should export isNativeWindowProp', () => {
      expect(typeof isNativeWindowPropFromUtils).toBe('function');
    });

    it('should export extractMatches', () => {
      expect(typeof extractMatches).toBe('function');
    });
  });

  describe('Interface contracts', () => {
    describe('extractSemanticFromFile', () => {
      it('should return expected structure', () => {
        const result = extractSemanticFromFile('test.js', '');

        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('localStorage');
        expect(result).toHaveProperty('events');
        expect(result).toHaveProperty('globals');
        expect(result).toHaveProperty('routes');
        expect(result).toHaveProperty('envVars');
      });

      it('should include filePath in result', () => {
        const result = extractSemanticFromFile('path/to/file.js', '');

        expect(result.filePath).toBe('path/to/file.js');
      });
    });

    describe('extractLocalStorageKeys', () => {
      it('should return expected structure', () => {
        const result = extractLocalStorageKeys('');

        expect(result).toHaveProperty('reads');
        expect(result).toHaveProperty('writes');
        expect(result).toHaveProperty('all');
        expect(Array.isArray(result.reads)).toBe(true);
        expect(Array.isArray(result.writes)).toBe(true);
        expect(Array.isArray(result.all)).toBe(true);
      });
    });

    describe('extractEventNames', () => {
      it('should return expected structure', () => {
        const result = extractEventNames('');

        expect(result).toHaveProperty('listeners');
        expect(result).toHaveProperty('emitters');
        expect(result).toHaveProperty('all');
        expect(Array.isArray(result.listeners)).toBe(true);
        expect(Array.isArray(result.emitters)).toBe(true);
        expect(Array.isArray(result.all)).toBe(true);
      });
    });

    describe('extractGlobalAccess', () => {
      it('should return expected structure', () => {
        const result = extractGlobalAccess('');

        expect(result).toHaveProperty('reads');
        expect(result).toHaveProperty('writes');
        expect(result).toHaveProperty('all');
        expect(Array.isArray(result.reads)).toBe(true);
        expect(Array.isArray(result.writes)).toBe(true);
        expect(Array.isArray(result.all)).toBe(true);
      });
    });

    describe('extractRoutes', () => {
      it('should return expected structure', () => {
        const result = extractRoutes('', '');

        expect(result).toHaveProperty('server');
        expect(result).toHaveProperty('client');
        expect(result).toHaveProperty('all');
        expect(Array.isArray(result.server)).toBe(true);
        expect(Array.isArray(result.client)).toBe(true);
        expect(Array.isArray(result.all)).toBe(true);
      });
    });

    describe('detectAllSemanticConnections', () => {
      it('should return expected structure', () => {
        const result = detectAllSemanticConnections({});

        expect(result).toHaveProperty('localStorageConnections');
        expect(result).toHaveProperty('eventConnections');
        expect(result).toHaveProperty('globalConnections');
        expect(result).toHaveProperty('envConnections');
        expect(result).toHaveProperty('routeConnections');
        expect(result).toHaveProperty('colocationConnections');
        expect(result).toHaveProperty('all');
        expect(result).toHaveProperty('fileResults');
      });
    });

    describe('Connection detector return types', () => {
      it('should return array from detectLocalStorageConnections', () => {
        const result = detectLocalStorageConnections({});
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return array from detectEventConnections', () => {
        const result = detectEventConnections({});
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return array from detectGlobalConnections', () => {
        const result = detectGlobalConnections({});
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return array from detectEnvConnections', () => {
        const result = detectEnvConnections({});
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return array from detectColocatedFiles', () => {
        const result = detectColocatedFiles([]);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return array from detectRouteConnections', () => {
        const result = detectRouteConnections({});
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('Connection object structure', () => {
      it('should have consistent connection structure from detectLocalStorageConnections', () => {
        const fileResults = {
          'a.js': {
            localStorage: {
              reads: [],
              writes: [{ key: 'test', line: 1 }],
              all: [{ key: 'test', line: 1, type: 'write' }]
            }
          },
          'b.js': {
            localStorage: {
              reads: [{ key: 'test', line: 1 }],
              writes: [],
              all: [{ key: 'test', line: 1, type: 'read' }]
            }
          }
        };

        const connections = detectLocalStorageConnections(fileResults);

        if (connections.length > 0) {
          const conn = connections[0];
          expect(typeof conn.id).toBe('string');
          expect(typeof conn.sourceFile).toBe('string');
          expect(typeof conn.targetFile).toBe('string');
          expect(typeof conn.type).toBe('string');
          expect(typeof conn.via).toBe('string');
          expect(typeof conn.confidence).toBe('number');
          expect(typeof conn.detectedBy).toBe('string');
          expect(typeof conn.reason).toBe('string');
        }
      });
    });
  });

  describe('Error handling contracts', () => {
    it('should handle empty inputs gracefully', () => {
      expect(() => extractSemanticFromFile('', '')).not.toThrow();
      expect(() => extractLocalStorageKeys('')).not.toThrow();
      expect(() => extractEventNames('')).not.toThrow();
      expect(() => extractGlobalAccess('')).not.toThrow();
      expect(() => extractRoutes('', '')).not.toThrow();
    });

    it('should handle null/undefined inputs gracefully', () => {
      expect(() => extractLocalStorageKeys(null)).not.toThrow();
      expect(() => extractEventNames(undefined)).not.toThrow();
      expect(() => extractGlobalAccess(null)).not.toThrow();
    });

    it('should return empty arrays/structures for empty inputs', () => {
      expect(extractLocalStorageKeys('').all).toEqual([]);
      expect(extractEventNames('').all).toEqual([]);
      expect(extractGlobalAccess('').all).toEqual([]);
      expect(extractRoutes('', '').all).toEqual([]);
      expect(detectLocalStorageConnections({})).toEqual([]);
      expect(detectEventConnections({})).toEqual([]);
      expect(detectGlobalConnections({})).toEqual([]);
      expect(detectColocatedFiles([])).toEqual([]);
    });
  });
});
