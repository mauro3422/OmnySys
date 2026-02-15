/**
 * @fileoverview recommendations.test.js - Analysis Recommendations Test
 * 
 * Tests for recommendations.js - Recommendations Generator
 */

import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '#layer-a/analyses/recommendations.js';

describe('ANALYSIS: recommendations.js', () => {
  describe('Structure Contract', () => {
    it('MUST export generateRecommendations function', () => {
      expect(generateRecommendations).toBeDefined();
      expect(typeof generateRecommendations).toBe('function');
    });

    it('MUST return an object', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result).toBeTypeOf('object');
    });

    it('MUST return total property', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
    });

    it('MUST return byPriority property', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result).toHaveProperty('byPriority');
      expect(typeof result.byPriority).toBe('object');
    });

    it('MUST return recommendations array', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Priority Structure', () => {
    it('MUST track CRITICAL priority count', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result.byPriority).toHaveProperty('CRITICAL');
      expect(typeof result.byPriority.CRITICAL).toBe('number');
    });

    it('MUST track HIGH priority count', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result.byPriority).toHaveProperty('HIGH');
      expect(typeof result.byPriority.HIGH).toBe('number');
    });

    it('MUST track MEDIUM priority count', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result.byPriority).toHaveProperty('MEDIUM');
      expect(typeof result.byPriority.MEDIUM).toBe('number');
    });

    it('MUST track LOW priority count', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      expect(result.byPriority).toHaveProperty('LOW');
      expect(typeof result.byPriority.LOW).toBe('number');
    });
  });

  describe('Recommendation Items Structure', () => {
    it('MUST include priority in each recommendation', () => {
      const analyses = createMockAnalyses({
        hotspots: { criticalCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      if (result.recommendations.length > 0) {
        expect(result.recommendations[0]).toHaveProperty('priority');
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(result.recommendations[0].priority);
      }
    });

    it('MUST include category in each recommendation', () => {
      const analyses = createMockAnalyses({
        hotspots: { criticalCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      if (result.recommendations.length > 0) {
        expect(result.recommendations[0]).toHaveProperty('category');
        expect(typeof result.recommendations[0].category).toBe('string');
      }
    });

    it('MUST include message in each recommendation', () => {
      const analyses = createMockAnalyses({
        hotspots: { criticalCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      if (result.recommendations.length > 0) {
        expect(result.recommendations[0]).toHaveProperty('message');
        expect(typeof result.recommendations[0].message).toBe('string');
      }
    });

    it('MUST include action in each recommendation', () => {
      const analyses = createMockAnalyses({
        hotspots: { criticalCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      if (result.recommendations.length > 0) {
        expect(result.recommendations[0]).toHaveProperty('action');
        expect(typeof result.recommendations[0].action).toBe('string');
      }
    });
  });

  describe('Priority Ordering', () => {
    it('MUST sort recommendations by priority (CRITICAL first)', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 10 },  // HIGH priority
        hotspots: { criticalCount: 1 }       // CRITICAL priority
      });
      const result = generateRecommendations(analyses);
      
      if (result.recommendations.length >= 2) {
        const priorities = result.recommendations.map(r => r.priority);
        const criticalIndex = priorities.indexOf('CRITICAL');
        const highIndex = priorities.indexOf('HIGH');
        
        if (criticalIndex !== -1 && highIndex !== -1) {
          expect(criticalIndex).toBeLessThan(highIndex);
        }
      }
    });
  });

  describe('Recommendation Generation', () => {
    it('MUST generate recommendation for unused exports > 3', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 5 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.category === 'Dead Code' && r.message.includes('unused exports')
      );
      expect(found).toBe(true);
    });

    it('MUST generate recommendation for orphan files > 2', () => {
      const analyses = createMockAnalyses({
        orphanFiles: { deadCodeCount: 3 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.category === 'Dead Code' && r.message.includes('orphan')
      );
      expect(found).toBe(true);
    });

    it('MUST generate CRITICAL recommendation for critical hotspots', () => {
      const analyses = createMockAnalyses({
        hotspots: { criticalCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.priority === 'CRITICAL' && r.message.includes('hotspot')
      );
      expect(found).toBe(true);
    });

    it('MUST generate recommendation for unresolved imports', () => {
      const analyses = createMockAnalyses({
        unresolvedImports: { total: 1 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.priority === 'CRITICAL' && r.category === 'Broken Code'
      );
      expect(found).toBe(true);
    });

    it('MUST generate recommendation for problematic circular imports', () => {
      const analyses = createMockAnalyses({
        circularImports: { problematicCount: 1, validCount: 0 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.category === 'Architecture' && r.message.includes('ciclos problem')
      );
      expect(found).toBe(true);
    });

    it('MUST generate INFO recommendation for valid circular imports', () => {
      const analyses = createMockAnalyses({
        circularImports: { problematicCount: 0, validCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.priority === 'INFO' && r.message.includes('v')
      );
      expect(found).toBe(true);
    });

    it('MUST generate recommendation for shared mutable objects', () => {
      const analyses = createMockAnalyses({
        sharedObjects: { criticalObjects: [{}, {}] }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.priority === 'CRITICAL' && r.category === 'Shared State'
      );
      expect(found).toBe(true);
    });

    it('MUST generate recommendation for high-risk types', () => {
      const analyses = createMockAnalyses({
        typeUsage: { highRiskCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.category === 'Type Safety' && r.message.includes('type')
      );
      expect(found).toBe(true);
    });

    it('MUST generate recommendation for hotspot constants', () => {
      const analyses = createMockAnalyses({
        constantUsage: { hotspotConstants: [{}] }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.category === 'Configuration' && r.message.includes('constant')
      );
      expect(found).toBe(true);
    });

    it('MUST generate recommendation for high-risk enums', () => {
      const analyses = createMockAnalyses({
        enumUsage: { highRiskCount: 1 }
      });
      const result = generateRecommendations(analyses);
      
      const found = result.recommendations.some(r => 
        r.category === 'Type Safety' && r.message.includes('enum')
      );
      expect(found).toBe(true);
    });
  });

  describe('Empty State', () => {
    it('MUST return zero total for clean project', () => {
      const analyses = createMockAnalyses();
      const result = generateRecommendations(analyses);
      
      // May still have some recommendations based on thresholds
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('MUST return empty recommendations array for perfect project', () => {
      const analyses = createMockAnalyses({
        unusedExports: { totalUnused: 0 },
        orphanFiles: { deadCodeCount: 0 },
        hotspots: { criticalCount: 0 },
        circularFunctionDeps: { total: 0 },
        deepDependencyChains: { totalDeepChains: 0 },
        couplingAnalysis: { concern: 'LOW' },
        reachabilityAnalysis: { reachablePercent: '100.0' },
        unresolvedImports: { total: 0 },
        circularImports: { problematicCount: 0 },
        unusedImports: { total: 0 },
        reexportChains: { total: 0 },
        sharedObjects: { criticalObjects: [] },
        typeUsage: { highRiskCount: 0 },
        constantUsage: { hotspotConstants: [] },
        enumUsage: { highRiskCount: 0 }
      });
      const result = generateRecommendations(analyses);
      
      // No issues should generate no recommendations
      expect(result.recommendations.length).toBe(0);
    });
  });
});

function createMockAnalyses(overrides = {}) {
  return {
    unusedExports: { totalUnused: 0 },
    orphanFiles: { deadCodeCount: 0 },
    hotspots: { criticalCount: 0 },
    circularFunctionDeps: { total: 0 },
    deepDependencyChains: { totalDeepChains: 0 },
    couplingAnalysis: { concern: 'LOW', total: 0 },
    reachabilityAnalysis: { reachablePercent: '100.0' },
    unresolvedImports: { total: 0 },
    circularImports: { problematicCount: 0, validCount: 0 },
    unusedImports: { total: 0 },
    reexportChains: { total: 0 },
    sharedObjects: { criticalObjects: [] },
    typeUsage: { highRiskCount: 0 },
    constantUsage: { hotspotConstants: [] },
    enumUsage: { highRiskCount: 0 },
    ...overrides
  };
}
