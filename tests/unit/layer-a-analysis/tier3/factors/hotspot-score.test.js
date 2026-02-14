import { describe, it, expect } from 'vitest';
import { calculateHotspotScore } from '../../../../../src/layer-a-static/analyses/tier3/factors/HotspotScore.js';
import { GraphMetricsBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('Tier 3 - HotspotScore Factor', () => {
  describe('Structure Contract', () => {
    it('should return an object with score, explanation, and metrics', () => {
      const result = calculateHotspotScore({});
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('metrics');
    });

    it('should NOT throw on null/undefined input', () => {
      expect(() => calculateHotspotScore(null)).not.toThrow();
      expect(() => calculateHotspotScore(undefined)).not.toThrow();
    });
  });

  describe('InDegree (Fan-in) Scoring', () => {
    it('should score 0 for files with < 8 inbound dependencies', () => {
      const metrics = GraphMetricsBuilder.create()
        .withCoupling(5, 3)
        .build();
      
      const result = calculateHotspotScore({ inDegree: 5, ...metrics });
      expect(result.score).toBe(0);
    });

    it('should score 1 for files with 8-14 inbound dependencies', () => {
      const metrics = { inDegree: 10, outDegree: 5 };
      
      const result = calculateHotspotScore(metrics);
      expect(result.score).toBe(1);
      expect(result.explanation).toContain('Hotspot file');
    });

    it('should score 2 for files with >= 15 inbound dependencies', () => {
      const metrics = { inDegree: 20, outDegree: 5 };
      
      const result = calculateHotspotScore(metrics);
      expect(result.score).toBe(2);
      expect(result.explanation).toContain('Critical hotspot');
    });
  });

  describe('OutDegree (Fan-out) Scoring', () => {
    it('should score 1 for files with 10-19 outbound dependencies', () => {
      const metrics = { inDegree: 3, outDegree: 12 };
      
      const result = calculateHotspotScore(metrics);
      expect(result.score).toBe(1);
      expect(result.explanation).toContain('Multiple dependencies');
    });

    it('should score 2 for files with >= 20 outbound dependencies', () => {
      const metrics = { inDegree: 3, outDegree: 25 };
      
      const result = calculateHotspotScore(metrics);
      expect(result.score).toBe(2);
      expect(result.explanation).toContain('High dependencies');
    });
  });

  describe('Combined Scoring', () => {
    it('should take max score from inDegree and outDegree', () => {
      const metrics = { inDegree: 20, outDegree: 5 }; // inDegree=2, outDegree=0
      
      const result = calculateHotspotScore(metrics);
      expect(result.score).toBe(2);
    });

    it('should combine explanations from both metrics', () => {
      const metrics = { inDegree: 15, outDegree: 20 };
      
      const result = calculateHotspotScore(metrics);
      expect(result.explanation).toContain('Critical hotspot');
      expect(result.explanation).toContain('High dependencies');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', () => {
      const result = calculateHotspotScore({});
      
      expect(result.score).toBe(0);
      expect(result.explanation).toBeUndefined();
      expect(result.metrics).toEqual({ inDegree: 0, outDegree: 0 });
    });

    it('should handle missing metrics gracefully', () => {
      const result = calculateHotspotScore({ centrality: 0.5 });
      
      expect(result.score).toBe(0);
      expect(result.metrics.inDegree).toBe(0);
    });

    it('should include both metrics in result', () => {
      const metrics = { inDegree: 10, outDegree: 15 };
      
      const result = calculateHotspotScore(metrics);
      
      expect(result.metrics).toEqual({ inDegree: 10, outDegree: 15 });
    });
  });
});
