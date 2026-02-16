import { describe, it, expect } from 'vitest';
import { calculateSideEffectScore } from '../../../../../src/layer-a-static/analyses/tier3/factors/SideEffectScore.js';
import { SideEffectBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('Tier 3 - SideEffectScore Factor', () => {
  describe('Structure Contract', () => {
    it('should return an object with score, explanation, and metrics', () => {
      const result = calculateSideEffectScore({});
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('metrics');
    });

    it('should NOT throw on null/undefined input', () => {
      expect(() => calculateSideEffectScore(null)).not.toThrow();
      expect(() => calculateSideEffectScore(undefined)).not.toThrow();
    });
  });

  describe('Side Effect Count Scoring', () => {
    it('should score 0 for files with no side effects', () => {
      const result = calculateSideEffectScore({});
      
      expect(result.score).toBe(0);
    });

    it('should score 1 for files with 1-2 side effects', () => {
      const sideEffects = SideEffectBuilder.create()
        .withConsole()
        .build().sideEffects;
      
      const result = calculateSideEffectScore(sideEffects);
      expect(result.score).toBe(1);
      expect(result.explanation).toContain('Some side effects');
    });

    it('should score 2 for files with 3-4 side effects', () => {
      const sideEffects = SideEffectBuilder.create()
        .withNetwork()
        .withStorage()
        .withConsole()
        .build().sideEffects;
      
      const result = calculateSideEffectScore(sideEffects);
      expect(result.score).toBeGreaterThanOrEqual(2);
    });

    it('should score 3 for files with >= 5 side effects', () => {
      const sideEffects = SideEffectBuilder.create()
        .withAll()
        .build().sideEffects;
      
      const result = calculateSideEffectScore(sideEffects);
      expect(result.score).toBe(3);
      expect(result.explanation).toContain('Many side effects');
    });
  });

  describe('Critical Side Effects', () => {
    it('should score 3 for network + global state', () => {
      const sideEffects = {
        makesNetworkCalls: true,
        modifiesGlobalState: true
      };
      
      const result = calculateSideEffectScore(sideEffects);
      
      expect(result.score).toBe(3);
      expect(result.explanation).toContain('Network calls + global state');
    });

    it('should boost to at least 2 for global state modification', () => {
      const sideEffects = {
        modifiesGlobalState: true
      };
      
      const result = calculateSideEffectScore(sideEffects);
      
      expect(result.score).toBeGreaterThanOrEqual(2);
    });

    it('should boost to at least 2 for network calls', () => {
      const sideEffects = {
        makesNetworkCalls: true
      };
      
      const result = calculateSideEffectScore(sideEffects);
      
      expect(result.score).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Metrics', () => {
    it('should count side effects correctly', () => {
      const sideEffects = {
        network: true,
        storage: true,
        dom: true
      };
      
      const result = calculateSideEffectScore(sideEffects);
      
      expect(result.metrics.sideEffectCount).toBe(3);
    });

    it('should include metrics even with no side effects', () => {
      const result = calculateSideEffectScore({});
      
      expect(result.metrics).toEqual({ sideEffectCount: 0 });
    });
  });
});
