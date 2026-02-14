/**
 * Tier 2 Analysis: Circular Imports Tests
 * 
 * Tests for findCircularImports - detects circular dependencies between files
 */

import { describe, it, expect, vi } from 'vitest';
import { findCircularImports, classifyCycle } from '#layer-a/analyses/tier2/circular-imports.js';
import { 
  createMockSystemMap,
  ScenarioBuilder 
} from '../../../factories/analysis.factory.js';

// Mock logger
vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  })
}));

describe('Tier 2 - Circular Imports Analysis', () => {
  describe('Structure Contract', () => {
    it('MUST return an object with required fields', () => {
      const systemMap = createMockSystemMap();
      const result = findCircularImports(systemMap);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('cycles');
      expect(result).toHaveProperty('classifications');
      expect(result).toHaveProperty('problematicCount');
      expect(result).toHaveProperty('validCount');
    });

    it('MUST NOT throw on empty system map', () => {
      const systemMap = createMockSystemMap();
      expect(() => findCircularImports(systemMap)).not.toThrow();
    });

    it('should return zero cycles when no cycles detected', () => {
      const systemMap = createMockSystemMap();
      const result = findCircularImports(systemMap);
      
      expect(result.total).toBe(0);
      expect(result.cycles).toHaveLength(0);
      expect(result.classifications).toHaveLength(0);
    });
  });

  describe('Cycle Detection', () => {
    it('should detect simple two-file cycle', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js']
      ]);
      
      const result = findCircularImports(systemMap);
      expect(result.total).toBe(1);
      expect(result.cycles).toHaveLength(1);
    });

    it('should detect multi-file cycle', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'c.js', 'a.js']
      ]);
      
      const result = findCircularImports(systemMap);
      expect(result.total).toBe(1);
    });

    it('should detect multiple independent cycles', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js'],
        ['c.js', 'd.js', 'e.js', 'c.js']
      ]);
      
      const result = findCircularImports(systemMap);
      expect(result.total).toBe(2);
    });

    it('should classify cycles correctly', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js']
      ]);
      
      const result = findCircularImports(systemMap);
      expect(result.classifications).toHaveLength(1);
      expect(result.classifications[0]).toHaveProperty('cycle');
      expect(result.classifications[0]).toHaveProperty('severity');
      expect(result.classifications[0]).toHaveProperty('category');
    });
  });

  describe('Problematic vs Valid Cycles', () => {
    it('should separate problematic and valid cycles', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js'],
        ['c.js', 'd.js', 'c.js']
      ]);
      
      const result = findCircularImports(systemMap);
      const total = result.problematicCount + result.validCount;
      expect(total).toBeLessThanOrEqual(result.total);
    });

    it('should provide circular pairs for visualization', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js']
      ]);
      
      const result = findCircularImports(systemMap);
      if (result.circularPairs && result.circularPairs.length > 0) {
        expect(result.circularPairs[0]).toContain('->');
      }
    });
  });

  describe('Recommendation', () => {
    it('should provide recommendation when cycles exist', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js']
      ]);
      
      const result = findCircularImports(systemMap);
      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
    });

    it('should provide positive message when no problematic cycles', () => {
      const systemMap = createMockSystemMap();
      const result = findCircularImports(systemMap);
      
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.toLowerCase()).toContain('no');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing metadata.cyclesDetected gracefully', () => {
      const systemMap = createMockSystemMap({ metadata: {} });
      const result = findCircularImports(systemMap);
      
      expect(result.total).toBe(0);
    });

    it('should handle null atomsIndex parameter', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js']
      ]);
      
      expect(() => findCircularImports(systemMap, null)).not.toThrow();
    });

    it('should handle empty atomsIndex', () => {
      const systemMap = ScenarioBuilder.importCycles([
        ['a.js', 'b.js', 'a.js']
      ]);
      
      const result = findCircularImports(systemMap, {});
      expect(result.total).toBe(1);
    });
  });
});

describe('Tier 2 - Cycle Classifier', () => {
  describe('classifyCycle', () => {
    it('should classify a simple cycle', () => {
      const cycle = ['a.js', 'b.js', 'a.js'];
      const result = classifyCycle(cycle, {});
      
      expect(result).toHaveProperty('cycle');
      expect(result.cycle).toEqual(cycle);
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('category');
    });

    it('should handle cycle with atoms metadata', () => {
      const cycle = ['utils/a.js', 'utils/b.js', 'utils/a.js'];
      const atomsIndex = {
        'utils/a.js': { type: 'utility' },
        'utils/b.js': { type: 'utility' }
      };
      
      const result = classifyCycle(cycle, atomsIndex);
      expect(result).toHaveProperty('derived');
    });

    it('should provide explanation for classification', () => {
      const cycle = ['a.js', 'b.js', 'a.js'];
      const result = classifyCycle(cycle, {});
      
      expect(result.explanation).toBeDefined();
      expect(typeof result.explanation).toBe('string');
    });

    it('should handle errors gracefully', () => {
      // Force an error by passing invalid data
      const result = classifyCycle(null, {});
      
      expect(result.severity).toBe('WARNING');
      expect(result.category).toBe('ERROR');
    });
  });
});
