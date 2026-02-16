/**
 * @fileoverview Quality Score Aggregator Tests
 * 
 * Tests for QualityScoreAggregator (aggregator.js).
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/aggregator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityScoreAggregator } from '#layer-a/pattern-detection/aggregator.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('QualityScoreAggregator (aggregator.js)', () => {
  let aggregator;
  let defaultConfig;

  beforeEach(() => {
    defaultConfig = PatternDetectionTestFactory.createDefaultConfig();
    aggregator = new QualityScoreAggregator(defaultConfig);
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should be instantiable with config', () => {
      expect(aggregator).toBeInstanceOf(QualityScoreAggregator);
    });

    it('should store config in constructor', () => {
      expect(aggregator.config).toBe(defaultConfig);
    });

    it('should initialize weights from config', () => {
      expect(aggregator.weights).toBeDefined();
      expect(aggregator.weights.deepChains).toBe(0.15);
      expect(aggregator.weights.sharedObjects).toBe(0.20);
    });

    it('should handle empty config', () => {
      const emptyAggregator = new QualityScoreAggregator({});
      expect(emptyAggregator.weights).toEqual({});
    });

    it('should have calculate method', () => {
      expect(typeof aggregator.calculate).toBe('function');
    });

    it('should have calculateGrade method', () => {
      expect(typeof aggregator.calculateGrade).toBe('function');
    });

    it('should have generateRecommendations method', () => {
      expect(typeof aggregator.generateRecommendations).toBe('function');
    });

    it('should have createEmptyScore method', () => {
      expect(typeof aggregator.createEmptyScore).toBe('function');
    });

    it('should have adjustWeightsForProjectType method', () => {
      expect(typeof aggregator.adjustWeightsForProjectType).toBe('function');
    });
  });

  /**
   * ============================================
   * SCORE CALCULATION CONTRACT
   * ============================================
   */

  describe('Score Calculation Contract', () => {
    it('should return empty score for null results', () => {
      const score = aggregator.calculate(null);
      expect(score.score).toBe(100);
      expect(score.grade).toBe('A');
      expect(score.totalIssues).toBe(0);
    });

    it('should return empty score for undefined results', () => {
      const score = aggregator.calculate(undefined);
      expect(score.score).toBe(100);
      expect(score.grade).toBe('A');
    });

    it('should return empty score for empty array', () => {
      const score = aggregator.calculate([]);
      expect(score.score).toBe(100);
      expect(score.grade).toBe('A');
    });

    it('should calculate weighted score correctly', () => {
      const results = [
        { detector: 'deepChains', score: 80, findings: [] },
        { detector: 'sharedObjects', score: 90, findings: [] }
      ];

      const score = aggregator.calculate(results);
      // (80 * 0.15 + 90 * 0.20) / (0.15 + 0.20) = 30 / 0.35 = 85.71...
      expect(score.score).toBe(86);
    });

    it('should calculate total issues from findings', () => {
      const results = [
        { detector: 'a', score: 100, findings: [{}, {}, {}] },
        { detector: 'b', score: 100, findings: [{}, {}] }
      ];

      const score = aggregator.calculate(results);
      expect(score.totalIssues).toBe(5);
    });

    it('should use equal weight distribution when no weights defined', () => {
      const noWeightAggregator = new QualityScoreAggregator({});
      const results = [
        { detector: 'a', score: 50, findings: [] },
        { detector: 'b', score: 100, findings: [] }
      ];

      const score = noWeightAggregator.calculate(results);
      // (50 * 0.5 + 100 * 0.5) = 75
      expect(score.score).toBe(75);
    });

    it('should handle missing score in result (defaults to 100)', () => {
      const results = [
        { detector: 'a', findings: [] }, // no score
        { detector: 'b', score: 50, findings: [] }
      ];

      const score = aggregator.calculate(results);
      // (100 * 0.15 + 50 * 0.15) / 0.30 = 75
      expect(score.score).toBe(75);
    });

    it('should include breakdown in result', () => {
      const results = [
        { detector: 'deepChains', score: 80, findings: [{}, {}] }
      ];

      const score = aggregator.calculate(results);
      expect(score.breakdown).toBeDefined();
      expect(score.breakdown.deepChains).toBeDefined();
      expect(score.breakdown.deepChains.score).toBe(80);
      expect(score.breakdown.deepChains.weight).toBe(0.15);
      expect(score.breakdown.deepChains.findings).toBe(2);
    });

    it('should include weights in result', () => {
      const score = aggregator.calculate([]);
      expect(score.weights).toEqual(defaultConfig.weights);
    });
  });

  /**
   * ============================================
   * GRADE CALCULATION CONTRACT
   * ============================================
   */

  describe('Grade Calculation Contract', () => {
    it('should return A for score >= 90', () => {
      expect(aggregator.calculateGrade(95)).toBe('A');
      expect(aggregator.calculateGrade(90)).toBe('A');
    });

    it('should return B for score >= 80', () => {
      expect(aggregator.calculateGrade(89)).toBe('B');
      expect(aggregator.calculateGrade(80)).toBe('B');
    });

    it('should return C for score >= 70', () => {
      expect(aggregator.calculateGrade(79)).toBe('C');
      expect(aggregator.calculateGrade(70)).toBe('C');
    });

    it('should return D for score >= 60', () => {
      expect(aggregator.calculateGrade(69)).toBe('D');
      expect(aggregator.calculateGrade(60)).toBe('D');
    });

    it('should return F for score < 60', () => {
      expect(aggregator.calculateGrade(59)).toBe('F');
      expect(aggregator.calculateGrade(0)).toBe('F');
    });

    it('should calculate grade in final result', () => {
      const results = [{ detector: 'a', score: 85, findings: [] }];
      const score = aggregator.calculate(results);
      expect(score.grade).toBe('B');
    });
  });

  /**
   * ============================================
   * RECOMMENDATIONS CONTRACT
   * ============================================
   */

  describe('Recommendations Contract', () => {
    it('should return empty recommendations for good scores', () => {
      const results = [
        { detector: 'a', score: 90, name: 'Good Detector', findings: [] }
      ];
      
      const recommendations = aggregator.generateRecommendations(results);
      expect(recommendations).toEqual([]);
    });

    it('should generate recommendations for scores < 80', () => {
      const results = [
        { detector: 'bad', score: 70, name: 'Bad Detector', findings: [{}], recommendation: 'Fix this' }
      ];
      
      const recommendations = aggregator.generateRecommendations(results);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].category).toBe('Bad Detector');
      expect(recommendations[0].priority).toBe('medium');
    });

    it('should mark high priority for scores < 50', () => {
      const results = [
        { detector: 'critical', score: 40, name: 'Critical', findings: [{}, {}], recommendation: 'Fix urgently' }
      ];
      
      const recommendations = aggregator.generateRecommendations(results);
      expect(recommendations[0].priority).toBe('high');
    });

    it('should limit recommendations to top 3 worst scores', () => {
      const results = [
        { detector: 'a', score: 30, name: 'A', findings: [], recommendation: 'Fix A' },
        { detector: 'b', score: 40, name: 'B', findings: [], recommendation: 'Fix B' },
        { detector: 'c', score: 50, name: 'C', findings: [], recommendation: 'Fix C' },
        { detector: 'd', score: 60, name: 'D', findings: [], recommendation: 'Fix D' }
      ];
      
      const recommendations = aggregator.generateRecommendations(results);
      expect(recommendations).toHaveLength(3);
    });

    it('should include finding count in recommendation message', () => {
      const results = [
        { detector: 'a', score: 70, name: 'A', findings: [{}, {}, {}] }
      ];
      
      const recommendations = aggregator.generateRecommendations(results);
      expect(recommendations[0].message).toContain('3');
    });
  });

  /**
   * ============================================
   * EMPTY SCORE CONTRACT
   * ============================================
   */

  describe('Empty Score Contract', () => {
    it('should create empty score with default values', () => {
      const empty = aggregator.createEmptyScore();
      
      expect(empty.score).toBe(100);
      expect(empty.grade).toBe('A');
      expect(empty.totalIssues).toBe(0);
      expect(empty.breakdown).toEqual({});
      expect(empty.recommendations).toEqual(['No analysis results available']);
    });

    it('should include weights in empty score', () => {
      const empty = aggregator.createEmptyScore();
      expect(empty.weights).toEqual(defaultConfig.weights);
    });
  });

  /**
   * ============================================
   * WEIGHT ADJUSTMENT CONTRACT
   * ============================================
   */

  describe('Weight Adjustment Contract', () => {
    it('should adjust weights for microservices project', () => {
      aggregator.adjustWeightsForProjectType('microservices');
      
      expect(aggregator.weights.coupling).toBe(0.25);
      expect(aggregator.weights.circularDeps).toBe(0.20);
      expect(aggregator.weights.sharedObjects).toBe(0.10);
    });

    it('should adjust weights for library project', () => {
      aggregator.adjustWeightsForProjectType('library');
      
      expect(aggregator.weights.unusedExports).toBe(0.20);
      expect(aggregator.weights.circularDeps).toBe(0.10);
      expect(aggregator.weights.sharedObjects).toBe(0.05);
    });

    it('should not change weights for standard project', () => {
      const originalWeights = { ...aggregator.weights };
      aggregator.adjustWeightsForProjectType('standard');
      
      expect(aggregator.weights).toEqual(originalWeights);
    });

    it('should not change weights for unknown project type', () => {
      const originalWeights = { ...aggregator.weights };
      aggregator.adjustWeightsForProjectType('unknown');
      
      expect(aggregator.weights).toEqual(originalWeights);
    });

    it('should merge new weights with existing ones', () => {
      aggregator.weights = { custom: 0.5, ...aggregator.weights };
      aggregator.adjustWeightsForProjectType('microservices');
      
      expect(aggregator.weights.custom).toBe(0.5);
      expect(aggregator.weights.coupling).toBe(0.25);
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle results with name instead of detector', () => {
      const results = [
        { name: 'namedDetector', score: 80, findings: [] }
      ];

      const score = aggregator.calculate(results);
      expect(score.breakdown.namedDetector).toBeDefined();
    });

    it('should handle findings without array', () => {
      const results = [
        { detector: 'a', score: 80, findings: null }
      ];

      const score = aggregator.calculate(results);
      expect(score.totalIssues).toBe(0);
    });

    it('should handle zero total weight gracefully', () => {
      const zeroWeightAggregator = new QualityScoreAggregator({ weights: {} });
      const results = [
        { detector: 'a', score: 50, findings: [] }
      ];

      const score = zeroWeightAggregator.calculate(results);
      expect(score.score).toBe(100);
    });

    it('should handle negative scores', () => {
      const results = [
        { detector: 'a', score: -10, findings: [] }
      ];

      const score = aggregator.calculate(results);
      expect(score.score).toBeLessThan(0);
    });

    it('should handle scores over 100', () => {
      const results = [
        { detector: 'a', score: 150, findings: [] }
      ];

      const score = aggregator.calculate(results);
      expect(score.score).toBeGreaterThan(100);
    });
  });
});
