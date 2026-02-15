/**
 * @fileoverview type-usage.test.js - Tier 3 Analysis Test
 * 
 * Tests for type-usage.js - Type/Interface Usage Tracker
 */

import { describe, it, expect } from 'vitest';
import { analyzeTypeUsage } from '#layer-a/analyses/tier3/type-usage.js';
import { createMockSystemMap } from '../../../../../tests/factories/analysis.factory.js';

describe('TIER 3 ANALYSIS: type-usage.js', () => {
  describe('Structure Contract', () => {
    it('MUST export analyzeTypeUsage function', () => {
      expect(analyzeTypeUsage).toBeDefined();
      expect(typeof analyzeTypeUsage).toBe('function');
    });

    it('MUST return an object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeTypeUsage(systemMap);
      expect(result).toBeTypeOf('object');
    });

    it('MUST return total property', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeTypeUsage(systemMap);
      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
    });

    it('MUST return interfaces object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeTypeUsage(systemMap);
      expect(result).toHaveProperty('interfaces');
      expect(typeof result.interfaces).toBe('object');
    });

    it('MUST return types object', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeTypeUsage(systemMap);
      expect(result).toHaveProperty('types');
      expect(typeof result.types).toBe('object');
    });

    it('MUST return highRiskCount', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeTypeUsage(systemMap);
      expect(result).toHaveProperty('highRiskCount');
      expect(typeof result.highRiskCount).toBe('number');
    });

    it('MUST return recommendation string', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeTypeUsage(systemMap);
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.recommendation).toBe('string');
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle null systemMap gracefully', () => {
      expect(() => analyzeTypeUsage(null)).not.toThrow();
    });

    it('MUST handle undefined systemMap gracefully', () => {
      expect(() => analyzeTypeUsage(undefined)).not.toThrow();
    });

    it('MUST handle empty systemMap gracefully', () => {
      const emptyMap = createMockSystemMap();
      const result = analyzeTypeUsage(emptyMap);
      expect(result.total).toBe(0);
      expect(result.highRiskCount).toBe(0);
    });

    it('MUST return message for JavaScript projects', () => {
      const systemMap = createMockSystemMap();
      const result = analyzeTypeUsage(systemMap);
      expect(result.recommendation).toContain('No TypeScript types');
    });
  });

  describe('Type Detection', () => {
    it('MUST detect exported interfaces', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalTypes: 1 },
        typeDefinitions: {
          'src/types.ts': [
            { name: 'User', type: 'interface', line: 1, isExported: true }
          ]
        }
      });

      const result = analyzeTypeUsage(systemMap);
      expect(result.total).toBe(1);
      expect(Object.keys(result.interfaces)).toHaveLength(1);
    });

    it('MUST detect exported type aliases', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalTypes: 1 },
        typeDefinitions: {
          'src/types.ts': [
            { name: 'UserId', type: 'type', line: 1, isExported: true }
          ]
        }
      });

      const result = analyzeTypeUsage(systemMap);
      expect(result.total).toBe(1);
      expect(Object.keys(result.types)).toHaveLength(1);
    });

    it('MUST track type usage across files', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalTypes: 1 },
        typeDefinitions: {
          'src/types.ts': [
            { name: 'User', type: 'interface', line: 1, isExported: true }
          ]
        },
        typeUsages: {
          'src/components.ts': [{ name: 'User', line: 5 }]
        }
      });

      const result = analyzeTypeUsage(systemMap);
      const type = result.interfaces['src/types.ts:User'];
      expect(type).toBeDefined();
      expect(type.totalUsages).toBe(1);
    });

    it('MUST not count same-file usage', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalTypes: 1 },
        typeDefinitions: {
          'src/types.ts': [
            { name: 'User', type: 'interface', line: 1, isExported: true }
          ]
        },
        typeUsages: {
          'src/types.ts': [{ name: 'User', line: 10 }]
        }
      });

      const result = analyzeTypeUsage(systemMap);
      const type = result.interfaces['src/types.ts:User'];
      expect(type.totalUsages).toBe(0);
    });
  });

  describe('Risk Level Classification', () => {
    it('MUST classify critical risk for >=10 usages', () => {
      const usages = [];
      for (let i = 0; i < 12; i++) {
        usages.push({ name: 'User', line: i + 1 });
      }

      const files = {};
      for (let i = 0; i < 12; i++) {
        files[`src/file${i}.ts`] = {};
      }

      const systemMap = createMockSystemMap({
        metadata: { totalTypes: 1 },
        typeDefinitions: {
          'src/types.ts': [{ name: 'User', type: 'interface', line: 1, isExported: true }]
        },
        typeUsages: {
          'src/file0.ts': usages,
          'src/file1.ts': [],
          'src/file2.ts': [],
          'src/file3.ts': [],
          'src/file4.ts': [],
          'src/file5.ts': [],
          'src/file6.ts': [],
          'src/file7.ts': [],
          'src/file8.ts': [],
          'src/file9.ts': [],
          'src/file10.ts': [],
          'src/file11.ts': []
        }
      });

      const result = analyzeTypeUsage(systemMap);
      expect(result.highRiskCount).toBeGreaterThan(0);
    });

    it('MUST include riskLevel in type info', () => {
      const systemMap = createMockSystemMap({
        metadata: { totalTypes: 1 },
        typeDefinitions: {
          'src/types.ts': [{ name: 'Config', type: 'interface', line: 1, isExported: true }]
        }
      });

      const result = analyzeTypeUsage(systemMap);
      const type = result.interfaces['src/types.ts:Config'];
      expect(type).toBeDefined();
      expect(type).toHaveProperty('riskLevel');
    });
  });
});
