import { describe, it, expect } from 'vitest';
import { calculateCouplingScore } from '../../../../../src/layer-a-static/analyses/tier3/factors/CouplingScore.js';

describe('Tier 3 - CouplingScore Factor', () => {
  describe('Structure Contract', () => {
    it('should return an object with score, explanation, and metrics', () => {
      const result = calculateCouplingScore({});
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('metrics');
    });

    it('should NOT throw on null/undefined input', () => {
      expect(() => calculateCouplingScore(null)).not.toThrow();
      expect(() => calculateCouplingScore(undefined)).not.toThrow();
    });
  });

  describe('Circular Dependencies', () => {
    it('should score 1 when circular dependencies exist', () => {
      const metrics = {
        problematicCycles: 1,
        coupledFiles: 0
      };
      
      const result = calculateCouplingScore(metrics);
      expect(result.score).toBe(1);
      expect(result.explanation).toBe('Circular dependency detected');
    });

    it('should score 1 for multiple circular dependencies', () => {
      const metrics = {
        problematicCycles: 5,
        coupledFiles: 0
      };
      
      const result = calculateCouplingScore(metrics);
      expect(result.score).toBe(1);
    });
  });

  describe('Coupled Files', () => {
    it('should score 1 when >= 3 files are tightly coupled', () => {
      const metrics = {
        problematicCycles: 0,
        coupledFiles: 4
      };
      
      const result = calculateCouplingScore(metrics);
      expect(result.score).toBe(1);
      expect(result.explanation).toBe('Tightly coupled with other files');
    });

    it('should score 0 when < 3 files are coupled', () => {
      const metrics = {
        problematicCycles: 0,
        coupledFiles: 2
      };
      
      const result = calculateCouplingScore(metrics);
      expect(result.score).toBe(0);
      expect(result.explanation).toBeUndefined();
    });
  });

  describe('Priority', () => {
    it('should prioritize circular dependencies over coupled files', () => {
      const metrics = {
        problematicCycles: 1,
        coupledFiles: 5
      };
      
      const result = calculateCouplingScore(metrics);
      // Circular dependency explanation should take precedence
      expect(result.explanation).toBe('Circular dependency detected');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', () => {
      const result = calculateCouplingScore({});
      
      expect(result.score).toBe(0);
      expect(result.explanation).toBeUndefined();
      expect(result.metrics).toEqual({
        circularDependencies: 0,
        coupledFiles: 0
      });
    });

    it('should handle zero values explicitly', () => {
      const metrics = {
        problematicCycles: 0,
        coupledFiles: 0
      };
      
      const result = calculateCouplingScore(metrics);
      expect(result.score).toBe(0);
    });

    it('should include metrics in result', () => {
      const metrics = {
        problematicCycles: 2,
        coupledFiles: 4
      };
      
      const result = calculateCouplingScore(metrics);
      
      expect(result.metrics).toEqual({
        circularDependencies: 2,
        coupledFiles: 4
      });
    });
  });
});
