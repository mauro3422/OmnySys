/**
 * @fileoverview globals-connections.test.js
 * 
 * Tests for Globals Connections
 * Tests detectGlobalConnections, sharesGlobalVariables, getSharedGlobalVariables
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/globals-connections
 */

import { describe, it, expect } from 'vitest';
import {
  detectGlobalConnections,
  sharesGlobalVariables,
  getSharedGlobalVariables
} from '#layer-a/extractors/static/globals-connections.js';
import { ConnectionType } from '#layer-a/extractors/static/constants.js';
import { StaticConnectionBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Globals Connections', () => {
  describe('detectGlobalConnections', () => {
    it('should detect connections between files with shared globals', () => {
      const fileResults = {
        'writer.js': {
          globals: {
            reads: [],
            writes: [{ property: 'appState', line: 1 }],
            all: [{ property: 'appState', line: 1, type: 'write' }]
          }
        },
        'reader.js': {
          globals: {
            reads: [{ property: 'appState', line: 1 }],
            writes: [],
            all: [{ property: 'appState', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].type).toBe(ConnectionType.GLOBAL_VARIABLE);
    });

    it('should create connection with correct structure', () => {
      const fileResults = {
        'a.js': {
          globals: {
            reads: [],
            writes: [{ property: 'shared', line: 1 }],
            all: [{ property: 'shared', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          globals: {
            reads: [{ property: 'shared', line: 1 }],
            writes: [],
            all: [{ property: 'shared', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections[0]).toHaveProperty('id');
      expect(connections[0]).toHaveProperty('sourceFile');
      expect(connections[0]).toHaveProperty('targetFile');
      expect(connections[0]).toHaveProperty('type');
      expect(connections[0]).toHaveProperty('property');
      expect(connections[0]).toHaveProperty('direction');
      expect(connections[0]).toHaveProperty('confidence');
    });

    it('should include direction information', () => {
      const fileResults = {
        'a.js': {
          globals: {
            reads: [],
            writes: [{ property: 'test', line: 1 }],
            all: [{ property: 'test', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          globals: {
            reads: [{ property: 'test', line: 1 }],
            writes: [],
            all: [{ property: 'test', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections[0].direction).toContain('writes');
      expect(connections[0].direction).toContain('reads');
    });

    it('should handle multiple shared globals', () => {
      const fileResults = {
        'a.js': {
          globals: {
            reads: [],
            writes: [
              { property: 'prop1', line: 1 },
              { property: 'prop2', line: 2 }
            ],
            all: [
              { property: 'prop1', line: 1, type: 'write' },
              { property: 'prop2', line: 2, type: 'write' }
            ]
          }
        },
        'b.js': {
          globals: {
            reads: [
              { property: 'prop1', line: 1 },
              { property: 'prop2', line: 2 }
            ],
            writes: [],
            all: [
              { property: 'prop1', line: 1, type: 'read' },
              { property: 'prop2', line: 2, type: 'read' }
            ]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections.length).toBe(2);
    });

    it('should return empty array when no shared globals', () => {
      const fileResults = {
        'a.js': {
          globals: {
            reads: [],
            writes: [{ property: 'propA', line: 1 }],
            all: [{ property: 'propA', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          globals: {
            reads: [{ property: 'propB', line: 1 }],
            writes: [],
            all: [{ property: 'propB', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should handle empty file results', () => {
      const connections = detectGlobalConnections({});

      expect(connections).toEqual([]);
    });

    it('should handle single file', () => {
      const fileResults = {
        'only.js': {
          globals: { reads: [], writes: [], all: [] }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should work with StaticConnectionBuilder shared global scenario', () => {
      const builder = new StaticConnectionBuilder();
      builder.withSharedGlobalScenario();
      const files = builder.build();

      const fileResults = {};
      for (const [path, data] of Object.entries(files)) {
        fileResults[path] = { globals: data.globals };
      }

      const connections = detectGlobalConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      connections.forEach(conn => {
        expect(conn.type).toBe(ConnectionType.GLOBAL_VARIABLE);
        expect(conn.property).toBe('appState');
      });
    });
  });

  describe('sharesGlobalVariables', () => {
    it('should return true when globals are shared', () => {
      const globalsA = {
        all: [{ property: 'prop1' }, { property: 'prop2' }]
      };
      const globalsB = {
        all: [{ property: 'prop1' }]
      };

      const result = sharesGlobalVariables(globalsA, globalsB);

      expect(result).toBe(true);
    });

    it('should return false when no globals are shared', () => {
      const globalsA = { all: [{ property: 'propA' }] };
      const globalsB = { all: [{ property: 'propB' }] };

      const result = sharesGlobalVariables(globalsA, globalsB);

      expect(result).toBe(false);
    });

    it('should return false when first has no globals', () => {
      const globalsA = { all: [] };
      const globalsB = { all: [{ property: 'prop' }] };

      const result = sharesGlobalVariables(globalsA, globalsB);

      expect(result).toBe(false);
    });

    it('should return false when second has no globals', () => {
      const globalsA = { all: [{ property: 'prop' }] };
      const globalsB = { all: [] };

      const result = sharesGlobalVariables(globalsA, globalsB);

      expect(result).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(sharesGlobalVariables(null, { all: [] })).toBe(false);
      expect(sharesGlobalVariables({ all: [] }, null)).toBe(false);
      expect(sharesGlobalVariables(undefined, { all: [] })).toBe(false);
    });
  });

  describe('getSharedGlobalVariables', () => {
    it('should return shared property names', () => {
      const globalsA = {
        all: [{ property: 'prop1' }, { property: 'prop2' }]
      };
      const globalsB = {
        all: [{ property: 'prop1' }, { property: 'prop3' }]
      };

      const result = getSharedGlobalVariables(globalsA, globalsB);

      expect(result).toContain('prop1');
      expect(result).not.toContain('prop2');
      expect(result).not.toContain('prop3');
    });

    it('should return array of strings', () => {
      const globalsA = { all: [{ property: 'test' }] };
      const globalsB = { all: [{ property: 'test' }] };

      const result = getSharedGlobalVariables(globalsA, globalsB);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(prop => {
        expect(typeof prop).toBe('string');
      });
    });

    it('should return empty array when no shared globals', () => {
      const globalsA = { all: [{ property: 'propA' }] };
      const globalsB = { all: [{ property: 'propB' }] };

      const result = getSharedGlobalVariables(globalsA, globalsB);

      expect(result).toEqual([]);
    });

    it('should handle empty arrays', () => {
      const result = getSharedGlobalVariables({ all: [] }, { all: [] });

      expect(result).toEqual([]);
    });

    it('should handle null/undefined inputs', () => {
      expect(getSharedGlobalVariables(null, { all: [] })).toEqual([]);
      expect(getSharedGlobalVariables({ all: [] }, null)).toEqual([]);
    });
  });

  describe('Connection properties', () => {
    it('should include via property', () => {
      const fileResults = {
        'a.js': {
          globals: {
            reads: [],
            writes: [{ property: 'test', line: 1 }],
            all: [{ property: 'test', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          globals: {
            reads: [{ property: 'test', line: 1 }],
            writes: [],
            all: [{ property: 'test', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections[0].via).toBe('global');
    });

    it('should include reason property', () => {
      const fileResults = {
        'a.js': {
          globals: {
            reads: [],
            writes: [{ property: 'myGlobal', line: 1 }],
            all: [{ property: 'myGlobal', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          globals: {
            reads: [{ property: 'myGlobal', line: 1 }],
            writes: [],
            all: [{ property: 'myGlobal', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections[0].reason).toContain('myGlobal');
    });

    it('should have default confidence of 1.0', () => {
      const fileResults = {
        'a.js': {
          globals: {
            reads: [],
            writes: [{ property: 'test', line: 1 }],
            all: [{ property: 'test', line: 1, type: 'write' }]
          }
        },
        'b.js': {
          globals: {
            reads: [{ property: 'test', line: 1 }],
            writes: [],
            all: [{ property: 'test', line: 1, type: 'read' }]
          }
        }
      };

      const connections = detectGlobalConnections(fileResults);

      expect(connections[0].confidence).toBe(1.0);
    });
  });
});
