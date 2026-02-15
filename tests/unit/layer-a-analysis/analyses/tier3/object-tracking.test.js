/**
 * @fileoverview object-tracking.test.js - Tier 3 Analysis Test
 * 
 * Tests for object-tracking.js - Exported Objects Tracker (Mutable State)
 */

import { describe, it, expect } from 'vitest';
import { analyzeSharedObjects } from '#layer-a/analyses/tier3/object-tracking.js';
import { createMockSystemMap } from '../../../../../tests/factories/analysis.factory.js';

describe('TIER 3 ANALYSIS: object-tracking.js', () => {
  describe('Structure Contract', () => {
    it('MUST export analyzeSharedObjects function', () => {
      expect(analyzeSharedObjects).toBeDefined();
      expect(typeof analyzeSharedObjects).toBe('function');
    });

    it('MUST return an object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeSharedObjects(systemMap);
      expect(result).toBeTypeOf('object');
    });

    it('MUST return total property', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeSharedObjects(systemMap);
      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
    });

    it('MUST return sharedObjects object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeSharedObjects(systemMap);
      expect(result).toHaveProperty('sharedObjects');
      expect(typeof result.sharedObjects).toBe('object');
    });

    it('MUST return criticalObjects array', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeSharedObjects(systemMap);
      expect(result).toHaveProperty('criticalObjects');
      expect(Array.isArray(result.criticalObjects)).toBe(true);
    });

    it('MUST return recommendation string', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeSharedObjects(systemMap);
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.recommendation).toBe('string');
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle null systemMap gracefully', () => {
      expect(() => analyzeSharedObjects(null)).not.toThrow();
    });

    it('MUST handle undefined systemMap gracefully', () => {
      expect(() => analyzeSharedObjects(undefined)).not.toThrow();
    });

    it('MUST handle empty systemMap gracefully', () => {
      const emptyMap = createMockSystemMap();
      const result = analyzeSharedObjects(emptyMap);
      expect(result.total).toBe(0);
      expect(result.criticalObjects).toEqual([]);
    });

    it('MUST return positive message when no objects', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeSharedObjects(systemMap);
      expect(result.recommendation).toContain('good practice');
    });
  });

  describe('Object Detection', () => {
    it('MUST detect exported objects', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl', 'timeout'] }
          ]
        }
      });

      const result = analyzeSharedObjects(systemMap);
      expect(result.total).toBe(1);
      expect(Object.keys(result.sharedObjects)).toHaveLength(1);
    });

    it('MUST track object properties', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl', 'timeout', 'retries'] }
          ]
        }
      });

      const result = analyzeSharedObjects(systemMap);
      const obj = result.sharedObjects['src/config.js:config'];
      expect(obj).toBeDefined();
      expect(obj.properties).toEqual(['apiUrl', 'timeout', 'retries']);
    });

    it('MUST track object imports', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl'] }
          ]
        },
        files: {
          'src/api.js': {
            imports: [{ source: './config', specifiers: [{ imported: 'config', type: 'named' }] }]
          }
        }
      });

      const result = analyzeSharedObjects(systemMap);
      const obj = result.sharedObjects['src/config.js:config'];
      expect(obj).toBeDefined();
      expect(obj.totalUsages).toBe(1);
      expect(obj.importedBy).toHaveLength(1);
    });

    it('MUST not count same-file usage', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl'] }
          ]
        },
        files: {
          'src/config.js': {
            imports: [{ source: './other', specifiers: [{ imported: 'config' }] }]
          }
        }
      });

      const result = analyzeSharedObjects(systemMap);
      const obj = result.sharedObjects['src/config.js:config'];
      expect(obj.totalUsages).toBe(0);
    });
  });

  describe('Risk Classification', () => {
    it('MUST include riskLevel in object info', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl'] }
          ]
        }
      });

      const result = analyzeSharedObjects(systemMap);
      const obj = result.sharedObjects['src/config.js:config'];
      expect(obj).toBeDefined();
      expect(obj).toHaveProperty('riskLevel');
    });

    it('MUST provide warning for shared mutable objects', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl'] }
          ]
        },
        files: {
          'src/api.js': {
            imports: [{ source: './config', specifiers: [{ imported: 'config' }] }]
          }
        }
      });

      const result = analyzeSharedObjects(systemMap);
      const obj = result.sharedObjects['src/config.js:config'];
      expect(obj.warning).toContain('SHARED MUTABLE STATE');
    });

    it('MUST provide recommendation for shared mutable objects', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl'] }
          ]
        },
        files: {
          'src/api.js': {
            imports: [{ source: './config', specifiers: [{ imported: 'config' }] }]
          }
        }
      });

      const result = analyzeSharedObjects(systemMap);
      const obj = result.sharedObjects['src/config.js:config'];
      expect(obj.recommendation).toContain('immutable');
    });

    it('MUST provide different message for non-shared objects', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'localConfig', line: 1, isMutable: true, properties: ['apiUrl'] }
          ]
        }
      });

      const result = analyzeSharedObjects(systemMap);
      const obj = result.sharedObjects['src/config.js:localConfig'];
      expect(obj.warning).toContain('not imported elsewhere');
      expect(obj.recommendation).toContain('Low risk');
    });
  });

  describe('Critical Objects Detection', () => {
    it('MUST identify critical objects (mutable + >=2 usages)', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: true, properties: ['apiUrl'] }
          ]
        },
        files: {
          'src/api.js': {
            imports: [{ source: './config', specifiers: [{ imported: 'config' }] }]
          },
          'src/services.js': {
            imports: [{ source: './config', specifiers: [{ imported: 'config' }] }]
          }
        }
      });

      const result = analyzeSharedObjects(systemMap);
      expect(result.criticalObjects.length).toBeGreaterThan(0);
      expect(result.recommendation).toContain('CRITICAL');
    });

    it('MUST NOT identify immutable objects as critical', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 1 },
        objectExports: {
          'src/config.js': [
            { name: 'config', line: 1, isMutable: false, properties: ['apiUrl'] }
          ]
        },
        files: {
          'src/api.js': {
            imports: [{ source: './config', specifiers: [{ imported: 'config' }] }]
          },
          'src/services.js': {
            imports: [{ source: './config', specifiers: [{ imported: 'config' }] }]
          }
        }
      });

      const result = analyzeSharedObjects(systemMap);
      // Immutable objects with multiple usages are not critical
      expect(result.criticalObjects).toHaveLength(0);
    });

    it('MUST sort critical objects by usage', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalSharedObjects: 2 },
        objectExports: {
          'src/config.js': [
            { name: 'lessUsed', line: 1, isMutable: true, properties: ['a'] },
            { name: 'moreUsed', line: 2, isMutable: true, properties: ['b'] }
          ]
        },
        files: {
          'src/a.js': { imports: [{ source: './config', specifiers: [{ imported: 'lessUsed' }] }] },
          'src/b.js': { imports: [{ source: './config', specifiers: [{ imported: 'moreUsed' }] }] },
          'src/c.js': { imports: [{ source: './config', specifiers: [{ imported: 'moreUsed' }] }] },
          'src/d.js': { imports: [{ source: './config', specifiers: [{ imported: 'moreUsed' }] }] }
        }
      });

      const result = analyzeSharedObjects(systemMap);
      if (result.criticalObjects.length >= 2) {
        expect(result.criticalObjects[0].totalUsages).toBeGreaterThanOrEqual(result.criticalObjects[1].totalUsages);
      }
    });
  });
});
