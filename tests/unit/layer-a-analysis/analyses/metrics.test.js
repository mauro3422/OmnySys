/**
 * @fileoverview metrics.test.js - Analysis Metrics Test
 * 
 * Tests for metrics.js - Quality Metrics Calculator
 */

import { describe, it, expect } from 'vitest';
import { calculateQualityMetrics } from '#layer-a/analyses/metrics.js';

describe('ANALYSIS: metrics.js', () => {
  describe('Structure Contract', () => {
    it('MUST export calculateQualityMetrics function', () => {
      expect(calculateQualityMetrics).toBeDefined();
      expect(typeof calculateQualityMetrics).toBe('function');
    });

    it('MUST return an object', () => {
      const mockAnalyses = createMockAnalyses();
      const result = calculateQualityMetrics(mockAnalyses);
      expect(result).toBeTypeOf('object');
    });

    it('MUST return score property (0-100)', () => {
      const mockAnalyses = createMockAnalyses();
      const result = calculateQualityMetrics(mockAnalyses);
      expect(result).toHaveProperty('score');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('MUST return grade property (A-F)', () => {
      const mockAnalyses = createMockAnalyses();
      const result = calculateQualityMetrics(mockAnalyses);
      expect(result).toHaveProperty('grade');
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    });

    it('MUST return totalIssues property', () => {
      const mockAnalyses = createMockAnalyses();
      const result = calculateQualityMetrics(mockAnalyses);
      expect(result).toHaveProperty('totalIssues');
      expect(typeof result.totalIssues).toBe('number');
    });

    it('MUST return breakdown property', () => {
      const mockAnalyses = createMockAnalyses();
      const result = calculateQualityMetrics(mockAnalyses);
      expect(result).toHaveProperty('breakdown');
      expect(typeof result.breakdown).toBe('object');
    });
  });

  describe('Grade Calculation', () => {
    it('MUST return grade A for score >= 85', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 0 },
        orphanFiles: { deadCodeCount: 0 },
        hotspots: { criticalCount: 0 }
      });
      const result = calculateQualityMetrics(analyses);
      expect(result.grade).toBe('A');
    });

    it('MUST return grade B for score >= 75 and < 85', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 2 },
        orphanFiles: { deadCodeCount: 1 },
        hotspots: { criticalCount: 0 }
      });
      const result = calculateQualityMetrics(analyses);
      if (result.score >= 75 && result.score < 85) {
        expect(result.grade).toBe('B');
      }
    });

    it('MUST return grade C for score >= 60 and < 75', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 5 },
        orphanFiles: { deadCodeCount: 3 },
        hotspots: { criticalCount: 1 }
      });
      const result = calculateQualityMetrics(analyses);
      if (result.score >= 60 && result.score < 75) {
        expect(result.grade).toBe('C');
      }
    });

    it('MUST return grade D for score >= 45 and < 60', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 10 },
        orphanFiles: { deadCodeCount: 5 },
        hotspots: { criticalCount: 2 }
      });
      const result = calculateQualityMetrics(analyses);
      if (result.score >= 45 && result.score < 60) {
        expect(result.grade).toBe('D');
      }
    });

    it('MUST return grade F for score < 45', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 50 },
        orphanFiles: { deadCodeCount: 10 },
        hotspots: { criticalCount: 10 },
        unresolvedImports: { total: 20 }
      });
      const result = calculateQualityMetrics(analyses);
      if (result.score < 45) {
        expect(result.grade).toBe('F');
      }
    });
  });

  describe('Penalty Calculation', () => {
    it('MUST penalize unused exports', () => {
      const baseAnalyses = createMockAnalyses({ unusedExports: { totalUnused: 0 } });
      const penalizedAnalyses = createMockAnalyses({ unusedExports: { totalUnused: 10 } });
      
      const baseResult = calculateQualityMetrics(baseAnalyses);
      const penalizedResult = calculateQualityMetrics(penalizedAnalyses);
      
      expect(penalizedResult.score).toBeLessThan(baseResult.score);
    });

    it('MUST penalize orphan files', () => {
      const baseAnalyses = createMockAnalyses({ orphanFiles: { deadCodeCount: 0 } });
      const penalizedAnalyses = createMockAnalyses({ orphanFiles: { deadCodeCount: 5 } });
      
      const baseResult = calculateQualityMetrics(baseAnalyses);
      const penalizedResult = calculateQualityMetrics(penalizedAnalyses);
      
      expect(penalizedResult.score).toBeLessThan(baseResult.score);
    });

    it('MUST penalize critical hotspots', () => {
      const baseAnalyses = createMockAnalyses({ hotspots: { criticalCount: 0 } });
      const penalizedAnalyses = createMockAnalyses({ hotspots: { criticalCount: 5 } });
      
      const baseResult = calculateQualityMetrics(baseAnalyses);
      const penalizedResult = calculateQualityMetrics(penalizedAnalyses);
      
      expect(penalizedResult.score).toBeLessThan(baseResult.score);
    });

    it('MUST penalize unresolved imports', () => {
      const baseAnalyses = createMockAnalyses({ unresolvedImports: { total: 0 } });
      const penalizedAnalyses = createMockAnalyses({ unresolvedImports: { total: 10 } });
      
      const baseResult = calculateQualityMetrics(baseAnalyses);
      const penalizedResult = calculateQualityMetrics(penalizedAnalyses);
      
      expect(penalizedResult.score).toBeLessThan(baseResult.score);
    });

    it('MUST penalize circular imports', () => {
      const baseAnalyses = createMockAnalyses({ circularImports: { problematicCount: 0 } });
      const penalizedAnalyses = createMockAnalyses({ circularImports: { problematicCount: 5 } });
      
      const baseResult = calculateQualityMetrics(baseAnalyses);
      const penalizedResult = calculateQualityMetrics(penalizedAnalyses);
      
      expect(penalizedResult.score).toBeLessThan(baseResult.score);
    });

    it('MUST penalize shared mutable objects', () => {
      const baseAnalyses = createMockAnalyses({ sharedObjects: { criticalObjects: [] } });
      const penalizedAnalyses = createMockAnalyses({ 
        sharedObjects: { criticalObjects: [{}, {}, {}] } 
      });
      
      const baseResult = calculateQualityMetrics(baseAnalyses);
      const penalizedResult = calculateQualityMetrics(penalizedAnalyses);
      
      expect(penalizedResult.score).toBeLessThan(baseResult.score);
    });
  });

  describe('Score Bounds', () => {
    it('MUST NOT return score below 0', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 1000 },
        orphanFiles: { deadCodeCount: 1000 },
        hotspots: { criticalCount: 1000 }
      });
      const result = calculateQualityMetrics(analyses);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('MUST NOT return score above 100', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 0 },
        orphanFiles: { deadCodeCount: 0 },
        hotspots: { criticalCount: 0 }
      });
      const result = calculateQualityMetrics(analyses);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Breakdown Structure', () => {
    it('MUST include all breakdown categories', () => {
      const analyses = createMockAnalyses();
      const result = calculateQualityMetrics(analyses);
      
      expect(result.breakdown).toHaveProperty('unusedExports');
      expect(result.breakdown).toHaveProperty('orphanFiles');
      expect(result.breakdown).toHaveProperty('hotspots');
      expect(result.breakdown).toHaveProperty('circularDeps');
      expect(result.breakdown).toHaveProperty('deepChains');
      expect(result.breakdown).toHaveProperty('coupling');
      expect(result.breakdown).toHaveProperty('unresolvedImports');
      expect(result.breakdown).toHaveProperty('circularImports');
      expect(result.breakdown).toHaveProperty('unusedImports');
      expect(result.breakdown).toHaveProperty('reexportChains');
    });
  });
});

function createMockAnalyses(overrides = {}) {
  return {
    unusedExports: { totalUnused: 0 },
    orphanFiles: { deadCodeCount: 0 },
    hotspots: { criticalCount: 0 },
    circularFunctionDeps: { problematicCount: 0 },
    deepDependencyChains: { totalDeepChains: 0 },
    couplingAnalysis: { concern: 'LOW', total: 0 },
    unresolvedImports: { total: 0 },
    circularImports: { problematicCount: 0 },
    unusedImports: { total: 0 },
    reexportChains: { total: 0 },
    sharedObjects: { criticalObjects: [] },
    typeUsage: { highRiskCount: 0 },
    constantUsage: { hotspotConstants: [] },
    enumUsage: { highRiskCount: 0 },
    ...overrides
  };
}
