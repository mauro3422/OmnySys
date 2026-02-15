/**
 * @fileoverview enum-usage.test.js - Tier 3 Analysis Test
 * 
 * Tests for enum-usage.js - Enum Usage Tracker
 */

import { describe, it, expect } from 'vitest';
import { analyzeEnumUsage } from '#layer-a/analyses/tier3/enum-usage.js';
import { createMockSystemMap } from '../../../../../tests/factories/analysis.factory.js';

describe('TIER 3 ANALYSIS: enum-usage.js', () => {
  describe('Structure Contract', () => {
    it('MUST export analyzeEnumUsage function', () => {
      expect(analyzeEnumUsage).toBeDefined();
      expect(typeof analyzeEnumUsage).toBe('function');
    });

    it('MUST return an object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeEnumUsage(systemMap);
      expect(result).toBeTypeOf('object');
    });

    it('MUST return total property', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeEnumUsage(systemMap);
      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
    });

    it('MUST return enums object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeEnumUsage(systemMap);
      expect(result).toHaveProperty('enums');
      expect(typeof result.enums).toBe('object');
    });

    it('MUST return highRiskCount', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeEnumUsage(systemMap);
      expect(result).toHaveProperty('highRiskCount');
      expect(typeof result.highRiskCount).toBe('number');
    });

    it('MUST return recommendation string', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeEnumUsage(systemMap);
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.recommendation).toBe('string');
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle null systemMap gracefully', () => {
      expect(() => analyzeEnumUsage(null)).not.toThrow();
    });

    it('MUST handle undefined systemMap gracefully', () => {
      expect(() => analyzeEnumUsage(undefined)).not.toThrow();
    });

    it('MUST handle empty systemMap gracefully', () => {
      const emptyMap = createMockSystemMap();
      const result = analyzeEnumUsage(emptyMap);
      expect(result.total).toBe(0);
      expect(result.highRiskCount).toBe(0);
    });

    it('MUST return message for JavaScript projects', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeEnumUsage(systemMap);
      expect(result.recommendation).toContain('No enums detected');
    });
  });

  describe('Enum Detection', () => {
    it('MUST detect exported enums', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'Status', line: 1, isExported: true, members: ['ACTIVE', 'INACTIVE'] }
          ]
        }
      });

      const result = analyzeEnumUsage(systemMap);
      expect(result.total).toBe(1);
      expect(Object.keys(result.enums)).toHaveLength(1);
    });

    it('MUST track enum members', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'Status', line: 1, isExported: true, members: ['ACTIVE', 'INACTIVE', 'PENDING'] }
          ]
        }
      });

      const result = analyzeEnumUsage(systemMap);
      const enumInfo = result.enums['src/enums.ts:Status'];
      expect(enumInfo).toBeDefined();
      expect(enumInfo.members).toEqual(['ACTIVE', 'INACTIVE', 'PENDING']);
      expect(enumInfo.memberCount).toBe(3);
    });

    it('MUST track enum imports', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'Status', line: 1, isExported: true, members: ['ACTIVE'] }
          ]
        },
        files: {
          'src/components.ts': {
            imports: [{ source: './enums', specifiers: [{ imported: 'Status', type: 'named' }] }]
          }
        }
      });

      const result = analyzeEnumUsage(systemMap);
      const enumInfo = result.enums['src/enums.ts:Status'];
      expect(enumInfo).toBeDefined();
      expect(enumInfo.totalUsages).toBe(1);
    });

    it('MUST not count same-file imports', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'Status', line: 1, isExported: true, members: ['ACTIVE'] }
          ]
        },
        files: {
          'src/enums.ts': {
            imports: [{ source: './other', specifiers: [{ imported: 'Status', type: 'named' }] }]
          }
        }
      });

      const result = analyzeEnumUsage(systemMap);
      const enumInfo = result.enums['src/enums.ts:Status'];
      expect(enumInfo.totalUsages).toBe(0);
    });
  });

  describe('Risk Classification', () => {
    it('MUST include riskLevel in enum info', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'Status', line: 1, isExported: true, members: ['ACTIVE'] }
          ]
        }
      });

      const result = analyzeEnumUsage(systemMap);
      const enumInfo = result.enums['src/enums.ts:Status'];
      expect(enumInfo).toBeDefined();
      expect(enumInfo).toHaveProperty('riskLevel');
    });

    it('MUST provide recommendations for used enums', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'Status', line: 1, isExported: true, members: ['ACTIVE'] }
          ]
        },
        files: {
          'src/components.ts': {
            imports: [{ source: './enums', specifiers: [{ imported: 'Status' }] }]
          }
        }
      });

      const result = analyzeEnumUsage(systemMap);
      const enumInfo = result.enums['src/enums.ts:Status'];
      expect(enumInfo.recommendation).toContain('Adding/removing enum values affects');
    });

    it('MUST provide different recommendation for unused enums', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'UnusedEnum', line: 1, isExported: true, members: ['VALUE'] }
          ]
        }
      });

      const result = analyzeEnumUsage(systemMap);
      const enumInfo = result.enums['src/enums.ts:UnusedEnum'];
      expect(enumInfo.recommendation).toContain('Exported but not used');
    });
  });

  describe('High Risk Detection', () => {
    it('MUST count high risk enums correctly', () => {
      const files = {};
      for (let i = 0; i < 7; i++) {
        files[`src/file${i}.ts`] = {
          imports: [{ source: './enums', specifiers: [{ imported: 'PopularEnum' }] }]
        };
      }

      const systemMap = createMockSystemMap({
        metadata: { totalEnums: 1 },
        enumDefinitions: {
          'src/enums.ts': [
            { name: 'PopularEnum', line: 1, isExported: true, members: ['A', 'B', 'C'] }
          ]
        },
        files
      });

      const result = analyzeEnumUsage(systemMap);
      expect(result.highRiskCount).toBeGreaterThan(0);
      expect(result.recommendation).toContain('high usage');
    });
  });
});
