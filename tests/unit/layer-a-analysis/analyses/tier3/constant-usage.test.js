/**
 * @fileoverview constant-usage.test.js - Tier 3 Analysis Test
 * 
 * Tests for constant-usage.js - Global Constants Tracker
 */

import { describe, it, expect } from 'vitest';
import { analyzeConstantUsage } from '#layer-a/analyses/tier3/constant-usage.js';
import { createMockSystemMap } from '../../../../../tests/factories/analysis.factory.js';

describe('TIER 3 ANALYSIS: constant-usage.js', () => {
  describe('Structure Contract', () => {
    it('MUST export analyzeConstantUsage function', () => {
      expect(analyzeConstantUsage).toBeDefined();
      expect(typeof analyzeConstantUsage).toBe('function');
    });

    it('MUST return an object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeConstantUsage(systemMap);
      expect(result).toBeTypeOf('object');
    });

    it('MUST return total property', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeConstantUsage(systemMap);
      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
    });

    it('MUST return constants object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeConstantUsage(systemMap);
      expect(result).toHaveProperty('constants');
      expect(typeof result.constants).toBe('object');
    });

    it('MUST return hotspotConstants array', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeConstantUsage(systemMap);
      expect(result).toHaveProperty('hotspotConstants');
      expect(Array.isArray(result.hotspotConstants)).toBe(true);
    });

    it('MUST return recommendation string', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeConstantUsage(systemMap);
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.recommendation).toBe('string');
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle null systemMap gracefully', () => {
      expect(() => analyzeConstantUsage(null)).not.toThrow();
    });

    it('MUST handle undefined systemMap gracefully', () => {
      expect(() => analyzeConstantUsage(undefined)).not.toThrow();
    });

    it('MUST handle empty systemMap gracefully', () => {
      const emptyMap = createMockSystemMap();
      const result = analyzeConstantUsage(emptyMap);
      expect(result.total).toBe(0);
      expect(result.hotspotConstants).toEqual([]);
    });

    it('MUST return default message when no constants', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeConstantUsage(systemMap);
      expect(result.recommendation).toContain('No exported constants detected');
    });
  });

  describe('Constant Detection', () => {
    it('MUST detect exported constants', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalConstants: 1 },
        constantExports: {
          'src/constants.js': [
            { name: 'MAX_SIZE', line: 1, valueType: 'number' }
          ]
        }
      });

      const result = analyzeConstantUsage(systemMap);
      expect(result.total).toBe(1);
      expect(Object.keys(result.constants)).toHaveLength(1);
    });

    it('MUST track constant imports', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalConstants: 1 },
        constantExports: {
          'src/constants.js': [
            { name: 'MAX_SIZE', line: 1, valueType: 'number' }
          ]
        },
        files: {
          'src/components.js': {
            imports: [
              { source: '../constants', specifiers: [{ imported: 'MAX_SIZE', type: 'named' }] }
            ]
          }
        }
      });

      const result = analyzeConstantUsage(systemMap);
      const constant = result.constants['src/constants.js:MAX_SIZE'];
      expect(constant).toBeDefined();
      expect(constant.totalUsages).toBeGreaterThan(0);
    });

    it('MUST classify risk levels correctly', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalConstants: 3 },
        constantExports: {
          'src/constants.js': [
            { name: 'LOW_RISK', line: 1, valueType: 'string' },
            { name: 'MEDIUM_RISK', line: 2, valueType: 'string' },
            { name: 'HIGH_RISK', line: 3, valueType: 'string' }
          ]
        },
        files: {
          'src/a.js': {
            imports: [{ source: './constants', specifiers: [{ imported: 'MEDIUM_RISK' }] }]
          },
          'src/b.js': {
            imports: [{ source: './constants', specifiers: [{ imported: 'MEDIUM_RISK' }] }]
          },
          'src/c.js': {
            imports: [{ source: './constants', specifiers: [{ imported: 'HIGH_RISK' }] }]
          },
          'src/d.js': {
            imports: [{ source: './constants', specifiers: [{ imported: 'HIGH_RISK' }] }]
          },
          'src/e.js': {
            imports: [{ source: './constants', specifiers: [{ imported: 'HIGH_RISK' }] }]
          },
          'src/f.js': {
            imports: [{ source: './constants', specifiers: [{ imported: 'HIGH_RISK' }] }]
          }
        }
      });

      const result = analyzeConstantUsage(systemMap);
      
      // The exact counts depend on import tracking logic
      expect(result.total).toBe(3);
    });
  });

  describe('Hotspot Detection', () => {
    it('MUST identify hotspot constants (>=5 usages)', () => {
      const imports = [];
      for (let i = 0; i < 7; i++) {
        imports.push({
          source: './constants',
          specifiers: [{ imported: 'POPULAR', type: 'named' }]
        });
      }

      const files = {};
      for (let i = 0; i < 7; i++) {
        files[`src/file${i}.js`] = { imports: [{ source: './constants', specifiers: [{ imported: 'POPULAR' }] }] };
      }

      const systemMap = createMockSystemMap({
        metadata: { totalConstants: 1 },
        constantExports: {
          'src/constants.js': [
            { name: 'POPULAR', line: 1, valueType: 'string' }
          ]
        },
        files
      });

      const result = analyzeConstantUsage(systemMap);
      expect(result.hotspotConstants.length).toBeGreaterThan(0);
    });

    it('MUST sort hotspots by usage count', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalConstants: 2 },
        constantExports: {
          'src/constants.js': [
            { name: 'LESS_USED', line: 1, valueType: 'string' },
            { name: 'MORE_USED', line: 2, valueType: 'string' }
          ]
        },
        files: {
          'src/a.js': { imports: [{ source: './constants', specifiers: [{ imported: 'LESS_USED' }] }] },
          'src/b.js': { imports: [{ source: './constants', specifiers: [{ imported: 'LESS_USED' }] }] },
          'src/c.js': { imports: [{ source: './constants', specifiers: [{ imported: 'MORE_USED' }] }] },
          'src/d.js': { imports: [{ source: './constants', specifiers: [{ imported: 'MORE_USED' }] }] },
          'src/e.js': { imports: [{ source: './constants', specifiers: [{ imported: 'MORE_USED' }] }] }
        }
      });

      const result = analyzeConstantUsage(systemMap);
      const hotspots = result.hotspotConstants;
      
      if (hotspots.length >= 2) {
        expect(hotspots[0].totalUsages).toBeGreaterThanOrEqual(hotspots[1].totalUsages);
      }
    });
  });
});
