/**
 * @fileoverview Quality Score Aggregator (engine folder) Tests
 * 
 * Tests for QualityScoreAggregator from engine/ folder.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/engine/QualityScoreAggregator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QualityScoreAggregator } from '#layer-a/pattern-detection/engine/QualityScoreAggregator.js';

describe('QualityScoreAggregator (engine folder)', () => {
  let aggregator;

  beforeEach(() => {
    const config = {
      weights: {
        deepChains: 0.15,
        sharedObjects: 0.20,
        coupling: 0.15
      }
    };
    aggregator = new QualityScoreAggregator(config);
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should store config', () => {
      expect(aggregator.config).toBeDefined();
    });

    it('should store weights from config', () => {
      expect(aggregator.weights).toBeDefined();
      expect(aggregator.weights.deepChains).toBe(0.15);
    });

    it('should have calculate method', () => {
      expect(typeof aggregator.calculate).toBe('function');
    });

    it('should have scoreToGrade method', () => {
      expect(typeof aggregator.scoreToGrade).toBe('function');
    });

    it('should have generateRecommendations method', () => {
      expect(typeof aggregator.generateRecommendations).toBe('function');
    });
  });

  /**
   * ============================================
   * SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Score Calculation Contract', () => {
    it('should return score of 100 for empty results', () => {
      const result = aggregator.calculate([]);
      expect(result.total).toBe(100);
    });

    it('should calculate weighted average', () => {
      const results = [
        { detector: 'deepChains', score: 80 },
        { detector: 'sharedObjects', score: 90 }
      ];

      const result = aggregator.calculate(results);
      // (80 * 0.15 + 90 * 0.20) / (0.15 + 0.20) = 85.71...
      expect(result.total).toBe(86);
    });

    it('should include component scores', () => {
      const results = [
        { detector: 'deepChains', score: 80 },
        { detector: 'sharedObjects', score: 90 }
      ];

      const result = aggregator.calculate(results);
      expect(result.components).toEqual({
        deepChains: 80,
        sharedObjects: 90
      });
    });

    it('should use default weight of 0.1 for unknown detectors', () => {
      const results = [
        { detector: 'unknown', score: 50 }
      ];

      const result = aggregator.calculate(results);
      expect(result.total).toBe(50);
    });

    it('should default score to 100 if not provided', () => {
      const results = [
        { detector: 'a' }, // no score
        { detector: 'b', score: 50 }
      ];

      const result = aggregator.calculate(results);
      // (100 * 0.1 + 50 * 0.1) / 0.2 = 75
      expect(result.total).toBe(75);
    });
  });

  /**
   * ============================================
   * GRADE CONVERSION CONTRACT
   * ============================================
   */

  describe('Grade Conversion Contract', () => {
    it('should convert score to grade A (>= 90)', () => {
      expect(aggregator.scoreToGrade(95)).toBe('A');
      expect(aggregator.scoreToGrade(90)).toBe('A');
    });

    it('should convert score to grade B (>= 80)', () => {
      expect(aggregator.scoreToGrade(89)).toBe('B');
      expect(aggregator.scoreToGrade(80)).toBe('B');
    });

    it('should convert score to grade C (>= 70)', () => {
      expect(aggregator.scoreToGrade(79)).toBe('C');
      expect(aggregator.scoreToGrade(70)).toBe('C');
    });

    it('should convert score to grade D (>= 60)', () => {
      expect(aggregator.scoreToGrade(69)).toBe('D');
      expect(aggregator.scoreToGrade(60)).toBe('D');
    });

    it('should convert score to grade F (< 60)', () => {
      expect(aggregator.scoreToGrade(59)).toBe('F');
      expect(aggregator.scoreToGrade(0)).toBe('F');
    });

    it('should include grade in calculation result', () => {
      const result = aggregator.calculate([
        { detector: 'a', score: 85 }
      ]);
      expect(result.grade).toBe('B');
    });
  });

  /**
   * ============================================
   * RECOMMENDATIONS CONTRACT
   * ============================================
   */

  describe('Recommendations Contract', () => {
    it('should generate recommendations for low scores', () => {
      const results = [
        { detector: 'bad', score: 60, recommendation: 'Fix this' }
      ];

      const result = aggregator.calculate(results);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should not generate recommendations for good scores', () => {
      const results = [
        { detector: 'good', score: 90, recommendation: 'All good' }
      ];

      const result = aggregator.calculate(results);
      expect(result.recommendations.length).toBe(0);
    });

    it('should mark high priority for very low scores (< 50)', () => {
      const results = [
        { detector: 'critical', score: 40, recommendation: 'Urgent fix needed' }
      ];

      const result = aggregator.calculate(results);
      expect(result.recommendations[0].priority).toBe('high');
    });

    it('should mark medium priority for moderately low scores', () => {
      const results = [
        { detector: 'warning', score: 65, recommendation: 'Should fix' }
      ];

      const result = aggregator.calculate(results);
      expect(result.recommendations[0].priority).toBe('medium');
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle empty config', () => {
      const emptyAggregator = new QualityScoreAggregator({});
      const result = emptyAggregator.calculate([
        { detector: 'a', score: 80 }
      ]);
      expect(result.total).toBe(80);
    });

    it('should handle zero total weight', () => {
      const zeroAggregator = new QualityScoreAggregator({ weights: {} });
      const result = zeroAggregator.calculate([
        { detector: 'a', score: 80 }
      ]);
      // Falls back to default weight of 0.1
      expect(result.total).toBe(80);
    });

    it('should handle negative scores', () => {
      const result = aggregator.calculate([
        { detector: 'a', score: -10 }
      ]);
      expect(result.total).toBe(-10);
    });

    it('should handle scores over 100', () => {
      const result = aggregator.calculate([
        { detector: 'a', score: 150 }
      ]);
      expect(result.total).toBe(150);
    });

    it('should round final score to nearest integer', () => {
      const result = aggregator.calculate([
        { detector: 'a', score: 85.4 }
      ]);
      expect(result.total).toBe(85);
    });
  });
});
