import { describe, it, expect } from 'vitest';
import { calculateCouplingScore } from '#layer-a/analyses/tier3/factors/CouplingScore.js';
import { CouplingMetricsBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('CouplingScore', () => {
  describe('Structure Contract', () => {
    it('should export calculateCouplingScore function', () => {
      expect(typeof calculateCouplingScore).toBe('function');
    });

    it('should return an object with score, explanation, and metrics', () => {
      const result = calculateCouplingScore({});
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('metrics');
    });

    it('should return numeric score', () => {
      const result = calculateCouplingScore({});
      expect(typeof result.score).toBe('number');
    });

    it('should NOT throw on empty input', () => {
      expect(() => calculateCouplingScore({})).not.toThrow();
    });
  });

  describe('Functionality Tests', () => {
    describe('Circular Dependencies', () => {
      it('should score 1 when circular dependencies exist', () => {
        const metrics = CouplingMetricsBuilder.create()
          .withCircularDependencies(1)
          .withCoupledFiles(0)
          .build();
        
        const result = calculateCouplingScore(metrics);
        expect(result.score).toBe(1);
        expect(result.explanation).toBe('Circular dependency detected');
      });

      it('should score 1 for multiple circular dependencies', () => {
        const metrics = CouplingMetricsBuilder.create()
          .withCircularDependencies(5)
          .withCoupledFiles(0)
          .build();
        
        const result = calculateCouplingScore(metrics);
        expect(result.score).toBe(1);
      });
    });

    describe('Coupled Files', () => {
      it('should score 1 when >= 3 files are tightly coupled', () => {
        const metrics = CouplingMetricsBuilder.create()
          .withCircularDependencies(0)
          .withCoupledFiles(4)
          .build();
        
        const result = calculateCouplingScore(metrics);
        expect(result.score).toBe(1);
        expect(result.explanation).toBe('Tightly coupled with other files');
      });

      it('should score 0 when < 3 files are coupled', () => {
        const metrics = CouplingMetricsBuilder.create()
          .withCircularDependencies(0)
          .withCoupledFiles(2)
          .build();
        
        const result = calculateCouplingScore(metrics);
        expect(result.score).toBe(0);
        expect(result.explanation).toBeUndefined();
      });
    });

    describe('Priority', () => {
      it('should prioritize circular dependencies over coupled files', () => {
        const metrics = CouplingMetricsBuilder.create()
          .withCircularDependencies(1)
          .withCoupledFiles(5)
          .build();
        
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
        const metrics = CouplingMetricsBuilder.create()
          .withCircularDependencies(0)
          .withCoupledFiles(0)
          .build();
        
        const result = calculateCouplingScore(metrics);
        expect(result.score).toBe(0);
      });

      it('should include metrics in result', () => {
        const metrics = CouplingMetricsBuilder.create()
          .withCircularDependencies(2)
          .withCoupledFiles(4)
          .build();
        
        const result = calculateCouplingScore(metrics);
        
        expect(result.metrics).toEqual({
          circularDependencies: 2,
          coupledFiles: 4
        });
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null input gracefully', () => {
      expect(() => calculateCouplingScore(null)).not.toThrow();
      const result = calculateCouplingScore(null);
      expect(result.score).toBe(0);
    });

    it('should handle undefined input gracefully', () => {
      expect(() => calculateCouplingScore(undefined)).not.toThrow();
      const result = calculateCouplingScore(undefined);
      expect(result.score).toBe(0);
    });

    it('should handle negative values', () => {
      const metrics = {
        problematicCycles: -1,
        coupledFiles: -5
      };
      
      expect(() => calculateCouplingScore(metrics)).not.toThrow();
    });

    it('should handle string values gracefully', () => {
      const metrics = {
        problematicCycles: '1',
        coupledFiles: '3'
      };
      
      expect(() => calculateCouplingScore(metrics)).not.toThrow();
    });

    it('should handle missing properties', () => {
      const metrics = { otherProperty: 'value' };
      
      const result = calculateCouplingScore(metrics);
      expect(result.score).toBe(0);
    });
  });
});
