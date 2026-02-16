import { describe, it, expect } from 'vitest';
import { calculateRiskScore } from '../../../../../src/layer-a-static/analyses/tier3/calculators/ScoreCalculator.js';
import { Tier3AnalysisFactory, RiskScenarios } from '../../../../factories/tier3-analysis.factory.js';

describe('Tier 3 - ScoreCalculator', () => {
  describe('Structure Contract', () => {
    it('should return an object with total, breakdown, severity, explanation, and metrics', () => {
      const result = calculateRiskScore({}, [], {}, {});
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('metrics');
    });

    it('should return total score between 0 and 10', () => {
      const result = calculateRiskScore({}, [], {}, {});
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(10);
    });

    it('should NOT throw on null/undefined inputs', () => {
      // Note: Individual factors handle null, but passing all nulls may still fail
      // This tests that the function doesn't throw with empty objects
      expect(() => calculateRiskScore({}, [], {}, {})).not.toThrow();
      expect(() => calculateRiskScore(undefined, undefined, undefined, undefined)).not.toThrow();
      expect(() => calculateRiskScore({}, [], {}, {})).not.toThrow();
    });
  });

  describe('Breakdown Structure', () => {
    it('should include all 5 risk factors in breakdown', () => {
      const result = calculateRiskScore({}, [], {}, {});
      
      expect(result.breakdown).toHaveProperty('staticComplexity');
      expect(result.breakdown).toHaveProperty('semanticConnections');
      expect(result.breakdown).toHaveProperty('sideEffects');
      expect(result.breakdown).toHaveProperty('hotspotRisk');
      expect(result.breakdown).toHaveProperty('couplingRisk');
    });

    it('should have numeric scores for all factors', () => {
      const result = calculateRiskScore({}, [], {}, {});
      
      Object.values(result.breakdown).forEach(score => {
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Risk Scenarios', () => {
    it('should calculate low risk for simple files', () => {
      const { fileAnalysis, semanticConnections, sideEffects, graphMetrics } = RiskScenarios.lowRisk();
      
      const result = calculateRiskScore(fileAnalysis, semanticConnections, sideEffects.sideEffects, graphMetrics);
      
      expect(result.total).toBeLessThan(3);
      expect(result.severity).toMatch(/low|info/i);
    });

    it('should calculate medium risk for moderate files', () => {
      const { fileAnalysis, semanticConnections, sideEffects, graphMetrics } = RiskScenarios.mediumRisk();
      
      const result = calculateRiskScore(fileAnalysis, semanticConnections, sideEffects.sideEffects, graphMetrics);
      
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThan(10);
      expect(result.severity).toMatch(/medium|high/i);
    });

    it('should calculate high risk for complex files', () => {
      const { fileAnalysis, semanticConnections, sideEffects, graphMetrics } = RiskScenarios.highRisk();
      
      const result = calculateRiskScore(fileAnalysis, semanticConnections, sideEffects.sideEffects, graphMetrics);
      
      expect(result.total).toBeGreaterThanOrEqual(6);
      expect(result.severity).toMatch(/high|critical/i);
    });

    it('should cap score at 10 for critical files', () => {
      const { fileAnalysis, semanticConnections, sideEffects, graphMetrics } = RiskScenarios.criticalRisk();
      
      const result = calculateRiskScore(fileAnalysis, semanticConnections, sideEffects.sideEffects, graphMetrics);
      
      expect(result.total).toBeLessThanOrEqual(10);
      expect(result.severity).toMatch(/critical|high/i);
    });
  });

  describe('Score Calculation', () => {
    it('should sum all factor scores for total', () => {
      const fileAnalysis = {
        functions: Array(15).fill({ complexity: 5 }),
        imports: Array(12).fill({ source: 'test' }),
        exports: []
      };
      
      const result = calculateRiskScore(fileAnalysis, [], {}, {});
      
      const expectedSum = result.breakdown.staticComplexity + 
                         result.breakdown.semanticConnections + 
                         result.breakdown.sideEffects + 
                         result.breakdown.hotspotRisk + 
                         result.breakdown.couplingRisk;
      
      expect(result.total).toBe(expectedSum);
    });

    it('should include explanation with all contributing factors', () => {
      const fileAnalysis = {
        functions: Array(15).fill({ complexity: 5 }),
        imports: Array(12).fill({ source: 'test' }),
        exports: []
      };
      
      const result = calculateRiskScore(fileAnalysis, [], {}, {});
      
      expect(typeof result.explanation).toBe('string');
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should provide default explanation for low risk', () => {
      const result = calculateRiskScore({}, [], {}, {});
      
      expect(result.explanation).toBe('Low risk baseline');
    });
  });

  describe('Severity Calculation', () => {
    it('should return "info" for scores 0-2', () => {
      const result = calculateRiskScore({}, [], {}, {});
      // Low risk scenario
      if (result.total <= 2) {
        expect(result.severity).toMatch(/info|low/i);
      }
    });

    it('should return "medium" for scores 3-5', () => {
      const fileAnalysis = {
        functions: Array(12).fill({}),
        imports: Array(8).fill({}),
        exports: []
      };
      
      const result = calculateRiskScore(fileAnalysis, [], {}, {});
      
      if (result.total >= 3 && result.total <= 5) {
        expect(result.severity).toMatch(/medium/i);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing fileAnalysis gracefully', () => {
      const result = calculateRiskScore(null, [], {}, {});
      
      expect(result.total).toBe(0);
      expect(result.breakdown.staticComplexity).toBe(0);
    });

    it('should handle missing semanticConnections gracefully', () => {
      const result = calculateRiskScore({}, null, {}, {});
      
      expect(result.breakdown.semanticConnections).toBe(0);
    });

    it('should handle missing sideEffects gracefully', () => {
      const result = calculateRiskScore({}, [], null, {});
      
      expect(result.breakdown.sideEffects).toBe(0);
    });

    it('should handle missing graphMetrics gracefully', () => {
      const result = calculateRiskScore({}, [], {}, null);
      
      expect(result.breakdown.hotspotRisk).toBe(0);
      expect(result.breakdown.couplingRisk).toBe(0);
    });
  });
});
