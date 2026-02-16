import { describe, it, expect } from 'vitest';
import { calculateSemanticScore } from '../../../../../src/layer-a-static/analyses/tier3/factors/SemanticScore.js';
import { SemanticConnectionBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('Tier 3 - SemanticScore Factor', () => {
  describe('Structure Contract', () => {
    it('should return an object with score, explanation, and metrics', () => {
      const result = calculateSemanticScore([]);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('metrics');
    });

    it('should NOT throw on null/undefined input', () => {
      expect(() => calculateSemanticScore(null)).not.toThrow();
      expect(() => calculateSemanticScore(undefined)).not.toThrow();
    });
  });

  describe('Connection Count Scoring', () => {
    it('should score 0 for files with < 2 connections', () => {
      const connections = SemanticConnectionBuilder.create()
        .addConnection('a.js')
        .build();
      
      const result = calculateSemanticScore(connections);
      expect(result.score).toBe(0);
    });

    it('should score 1 for files with 2-4 connections', () => {
      const connections = SemanticConnectionBuilder.create()
        .withHighConnectivity(3)
        .build();
      
      const result = calculateSemanticScore(connections);
      expect(result.score).toBe(1);
      expect(result.explanation).toContain('Some semantic connections');
    });

    it('should score 2 for files with 5-7 connections', () => {
      const connections = SemanticConnectionBuilder.create()
        .withHighConnectivity(6)
        .build();
      
      const result = calculateSemanticScore(connections);
      expect(result.score).toBe(2);
      expect(result.explanation).toContain('Several semantic connections');
    });

    it('should score 3 for files with >= 8 connections', () => {
      const connections = SemanticConnectionBuilder.create()
        .withHighConnectivity(10)
        .build();
      
      const result = calculateSemanticScore(connections);
      expect(result.score).toBe(3);
      expect(result.explanation).toContain('Multiple semantic connections');
    });
  });

  describe('Severity Scoring', () => {
    it('should boost score for high severity connections', () => {
      const connections = [
        { target: 'a.js', severity: 'critical' },
        { target: 'b.js', severity: 'low' }
      ];
      
      const result = calculateSemanticScore(connections);
      
      expect(result.score).toBeGreaterThanOrEqual(2);
      expect(result.explanation).toContain('High severity connections');
    });

    it('should count multiple high severity connections', () => {
      const connections = [
        { target: 'a.js', severity: 'critical' },
        { target: 'b.js', severity: 'high' },
        { target: 'c.js', severity: 'critical' }
      ];
      
      const result = calculateSemanticScore(connections);
      
      expect(result.metrics.highSeverityConnections).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const result = calculateSemanticScore([]);
      
      expect(result.score).toBe(0);
      expect(result.explanation).toBeUndefined();
      expect(result.metrics).toEqual({
        connectionCount: 0,
        highSeverityConnections: 0
      });
    });

    it('should handle null connections array', () => {
      const result = calculateSemanticScore(null);
      
      expect(result.score).toBe(0);
    });

    it('should include connection count in metrics', () => {
      const connections = SemanticConnectionBuilder.create()
        .withHighConnectivity(5)
        .build();
      
      const result = calculateSemanticScore(connections);
      
      expect(result.metrics.connectionCount).toBe(5);
    });
  });
});
