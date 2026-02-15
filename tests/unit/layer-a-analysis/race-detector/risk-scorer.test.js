/**
 * @fileoverview risk-scorer.test.js
 * 
 * Tests for risk-scorer module (backward compatibility wrapper).
 * 
 * @module tests/unit/layer-a-analysis/race-detector/risk-scorer
 */

import { describe, it, expect } from 'vitest';
import { RiskScorer } from '#layer-a/race-detector/risk-scorer.js';

describe('Risk Scorer Module', () => {
  describe('Structure Contract', () => {
    it('should export RiskScorer class', () => {
      expect(RiskScorer).toBeDefined();
      expect(typeof RiskScorer).toBe('function');
    });

    it('should export RiskScorer as default', async () => {
      const module = await import('#layer-a/race-detector/risk-scorer.js');
      expect(module.default).toBe(RiskScorer);
    });

    it('should create valid RiskScorer instance', () => {
      const scorer = new RiskScorer();
      expect(scorer).toBeInstanceOf(RiskScorer);
    });
  });

  describe('Backward Compatibility', () => {
    it('should have all required methods', () => {
      const scorer = new RiskScorer();
      expect(typeof scorer.calculate).toBe('function');
      expect(typeof scorer.scoreToSeverity).toBe('function');
      expect(typeof scorer.explainScore).toBe('function');
      expect(typeof scorer.suggestTestingLevel).toBe('function');
      expect(typeof scorer.setWeights).toBe('function');
    });

    it('should initialize with default weights', () => {
      const scorer = new RiskScorer();
      expect(scorer.weights).toBeDefined();
    });

    it('should initialize with all scorers', () => {
      const scorer = new RiskScorer();
      expect(scorer.typeScorer).toBeDefined();
      expect(scorer.asyncScorer).toBeDefined();
      expect(scorer.integrityScorer).toBeDefined();
      expect(scorer.scopeScorer).toBeDefined();
      expect(scorer.impactScorer).toBeDefined();
      expect(scorer.frequencyScorer).toBeDefined();
      expect(scorer.testingAdvisor).toBeDefined();
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle instantiation without errors', () => {
      expect(() => new RiskScorer()).not.toThrow();
    });

    it('should handle calculate with null race', () => {
      const scorer = new RiskScorer();
      expect(() => scorer.calculate(null, {})).not.toThrow();
    });

    it('should handle calculate with undefined race', () => {
      const scorer = new RiskScorer();
      expect(() => scorer.calculate(undefined, {})).not.toThrow();
    });
  });
});
