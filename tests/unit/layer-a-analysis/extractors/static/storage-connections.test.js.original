/**
 * @fileoverview storage-connections.test.js
 * 
 * Tests for Storage Connections
 * Tests detectLocalStorageConnections, sharesStorageKeys, getSharedStorageKeys
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/storage-connections
 */

import { describe, it, expect } from 'vitest';
import {
  detectLocalStorageConnections,
  sharesStorageKeys,
  getSharedStorageKeys
} from '#layer-a/extractors/static/storage-connections.js';
import { ConnectionType } from '#layer-a/extractors/static/constants.js';
import { StaticConnectionBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Storage Connections', () => {
  describe('detectLocalStorageConnections', () => {
    it('should detect connections between files sharing storage keys', () => {
      const fileResults = {
        'writer.js': {
          localStorage: {
            reads: [],
            writes: [{ key: 'token', line: 1 }],
            all: [{ key: 'token', line: 1, type: 'write' }]
          }
        },
        'reader.js': {
          localStorage: {
            reads: [{ key: 'token', line: 1 }],
            writes: [],
            all: [{ key: 'token', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].type).toBe(ConnectionType.LOCAL_STORAGE);
    });

    it('should create connection with correct structure', () => {
      const fileResults = {
        'a.js': {
          localStorage: {
            reads: [],
            writes: [{ key: 'shared', line: 1 }],
            all: [{ key: 'shared', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          localStorage: {
            reads: [{ key: 'shared', line: 1 }],
            writes: [],
            all: [{ key: 'shared', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections[0]).toHaveProperty('id');
      expect(connections[0]).toHaveProperty('sourceFile');
      expect(connections[0]).toHaveProperty('targetFile');
      expect(connections[0]).toHaveProperty('type');
      expect(connections[0]).toHaveProperty('key');
      expect(connections[0]).toHaveProperty('direction');
      expect(connections[0]).toHaveProperty('confidence');
    });

    it('should include direction information with writes and reads', () => {
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

      expect(connections[0].direction).toContain('writes');
      expect(connections[0].direction).toContain('reads');
    });

    it('should handle multiple shared keys', () => {
      const fileResults = {
        'a.js': {
          localStorage: {
            reads: [],
            writes: [
              { key: 'key1', line: 1 },
              { key: 'key2', line: 2 }
            ],
            all: [
              { key: 'key1', line: 1, type: 'write' },
              { key: 'key2', line: 2, type: 'write' }
            ]
          }
        },
        'b.js': {
          localStorage: {
            reads: [
              { key: 'key1', line: 1 },
              { key: 'key2', line: 2 }
            ],
            writes: [],
            all: [
              { key: 'key1', line: 1, type: 'read' },
              { key: 'key2', line: 2, type: 'read' }
            ]
          }
        }
      };

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections.length).toBe(2);
    });

    it('should handle bidirectional access (both read and write)', () => {
      const fileResults = {
        'a.js': {
          localStorage: {
            reads: [{ key: 'shared', line: 1 }],
            writes: [{ key: 'shared', line: 2 }],
            all: [
              { key: 'shared', line: 1, type: 'read' },
              { key: 'shared', line: 2, type: 'write' }
            ]
          }
        },
        'b.js': {
          localStorage: {
            reads: [{ key: 'shared', line: 1 }],
            writes: [{ key: 'shared', line: 2 }],
            all: [
              { key: 'shared', line: 1, type: 'read' },
              { key: 'shared', line: 2, type: 'write' }
            ]
          }
        }
      };

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].direction).toContain('writes');
      expect(connections[0].direction).toContain('reads');
    });

    it('should return empty array when no shared keys', () => {
      const fileResults = {
        'a.js': {
          localStorage: {
            reads: [],
            writes: [{ key: 'keyA', line: 1 }],
            all: [{ key: 'keyA', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          localStorage: {
            reads: [{ key: 'keyB', line: 1 }],
            writes: [],
            all: [{ key: 'keyB', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should handle empty file results', () => {
      const connections = detectLocalStorageConnections({});

      expect(connections).toEqual([]);
    });

    it('should handle single file', () => {
      const fileResults = {
        'only.js': {
          localStorage: { reads: [], writes: [], all: [] }
        }
      };

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should work with StaticConnectionBuilder shared storage scenario', () => {
      const builder = new StaticConnectionBuilder();
      builder.withSharedStorageScenario();
      const files = builder.build();

      const fileResults = {};
      for (const [path, data] of Object.entries(files)) {
        fileResults[path] = { localStorage: data.storage };
      }

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      connections.forEach(conn => {
        expect(conn.type).toBe(ConnectionType.LOCAL_STORAGE);
        expect(conn.key).toBe('token');
      });
    });
  });

  describe('sharesStorageKeys', () => {
    it('should return true when storage keys are shared', () => {
      const storageA = {
        all: [{ key: 'key1' }, { key: 'key2' }]
      };
      const storageB = {
        all: [{ key: 'key1' }]
      };

      const result = sharesStorageKeys(storageA, storageB);

      expect(result).toBe(true);
    });

    it('should return false when no keys are shared', () => {
      const storageA = { all: [{ key: 'keyA' }] };
      const storageB = { all: [{ key: 'keyB' }] };

      const result = sharesStorageKeys(storageA, storageB);

      expect(result).toBe(false);
    });

    it('should return false when first has no keys', () => {
      const storageA = { all: [] };
      const storageB = { all: [{ key: 'key' }] };

      const result = sharesStorageKeys(storageA, storageB);

      expect(result).toBe(false);
    });

    it('should return false when second has no keys', () => {
      const storageA = { all: [{ key: 'key' }] };
      const storageB = { all: [] };

      const result = sharesStorageKeys(storageA, storageB);

      expect(result).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(sharesStorageKeys(null, { all: [] })).toBe(false);
      expect(sharesStorageKeys({ all: [] }, null)).toBe(false);
      expect(sharesStorageKeys(undefined, { all: [] })).toBe(false);
    });
  });

  describe('getSharedStorageKeys', () => {
    it('should return shared key names', () => {
      const storageA = {
        all: [{ key: 'key1' }, { key: 'key2' }]
      };
      const storageB = {
        all: [{ key: 'key1' }, { key: 'key3' }]
      };

      const result = getSharedStorageKeys(storageA, storageB);

      expect(result).toContain('key1');
      expect(result).not.toContain('key2');
      expect(result).not.toContain('key3');
    });

    it('should return array of strings', () => {
      const storageA = { all: [{ key: 'test' }] };
      const storageB = { all: [{ key: 'test' }] };

      const result = getSharedStorageKeys(storageA, storageB);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(key => {
        expect(typeof key).toBe('string');
      });
    });

    it('should return empty array when no shared keys', () => {
      const storageA = { all: [{ key: 'keyA' }] };
      const storageB = { all: [{ key: 'keyB' }] };

      const result = getSharedStorageKeys(storageA, storageB);

      expect(result).toEqual([]);
    });

    it('should handle empty arrays', () => {
      const result = getSharedStorageKeys({ all: [] }, { all: [] });

      expect(result).toEqual([]);
    });

    it('should handle null/undefined inputs', () => {
      expect(getSharedStorageKeys(null, { all: [] })).toEqual([]);
      expect(getSharedStorageKeys({ all: [] }, null)).toEqual([]);
    });
  });

  describe('Connection properties', () => {
    it('should include via property', () => {
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

      expect(connections[0].via).toBe('localStorage');
    });

    it('should include reason property', () => {
      const fileResults = {
        'a.js': {
          localStorage: {
            reads: [],
            writes: [{ key: 'myKey', line: 1 }],
            all: [{ key: 'myKey', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          localStorage: {
            reads: [{ key: 'myKey', line: 1 }],
            writes: [],
            all: [{ key: 'myKey', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectLocalStorageConnections(fileResults);

      expect(connections[0].reason).toContain('myKey');
    });

    it('should have detectedBy set to static-extractor', () => {
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

      expect(connections[0].detectedBy).toBe('static-extractor');
    });

    it('should have default confidence of 1.0', () => {
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

      expect(connections[0].confidence).toBe(1.0);
    });
  });
});
