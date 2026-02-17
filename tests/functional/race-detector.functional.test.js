/**
 * @fileoverview Race Detector - Tests Detallados Corregidos
 *
 * Tests detallados para los scorers y funcionalidades del Race Detector
 * 
 * @module tests/functional/race-detector-detailed.functional.test
 */

import { describe, it, expect } from 'vitest';
import {
  RiskScorer,
  TypeScorer,
  AsyncScorer,
  DataIntegrityScorer,
  ScopeScorer,
  ImpactScorer,
  FrequencyScorer,
  TestingAdvisor
} from '#layer-a/race-detector/index.js';
import { ScoreWeights } from '#layer-a/race-detector/factors/ScoreWeights.js';

describe('Race Detector - Detailed Tests', () => {

  describe('RiskScorer Detailed', () => {
    it('calculates severity string for race conditions', () => {
      const scorer = new RiskScorer();

      // Race de tipo write-write (más peligroso)
      const criticalRace = { type: 'WW' };
      const critical = scorer.calculate(criticalRace, {});

      // RiskScorer retorna 'critical', 'high', 'medium', o 'low'
      expect(['critical', 'high', 'medium', 'low']).toContain(critical);
    });

    it('returns low for null/undefined race', () => {
      const scorer = new RiskScorer();

      expect(scorer.calculate(null, {})).toBe('low');
      expect(scorer.calculate(undefined, {})).toBe('low');
    });

    it('score() is alias for calculate()', () => {
      const scorer = new RiskScorer();
      const race = { type: 'WW' };

      const result1 = scorer.score(race, {});
      const result2 = scorer.calculate(race, {});

      expect(result1).toBe(result2);
    });

    it('scoreToSeverity converts numeric score to severity', () => {
      const scorer = new RiskScorer();

      expect(scorer.scoreToSeverity(0.9)).toBe('critical');
      expect(scorer.scoreToSeverity(0.7)).toBe('high');
      expect(scorer.scoreToSeverity(0.5)).toBe('medium');
      expect(scorer.scoreToSeverity(0.2)).toBe('low');
    });

    it('explainScore returns array of factors', () => {
      const scorer = new RiskScorer();
      const race = { type: 'WW', stateKey: 'counter' };

      const explanation = scorer.explainScore(race, {});

      expect(Array.isArray(explanation)).toBe(true);
    });

    it('suggestTestingLevel returns advice for severity', () => {
      const scorer = new RiskScorer();

      const criticalAdvice = scorer.suggestTestingLevel('critical');
      
      expect(criticalAdvice.level).toBe('mandatory');
      expect(criticalAdvice.tests).toContain('unit');
      expect(criticalAdvice.priority).toBe('P0');
    });

    it('setWeights updates weights', () => {
      const scorer = new RiskScorer();
      
      // No debe lanzar error
      expect(() => scorer.setWeights({ type: { WW: 0.5 } })).not.toThrow();
    });
  });

  describe('TypeScorer Detailed', () => {
    it('score method returns a number', () => {
      const weights = new ScoreWeights();
      const scorer = new TypeScorer(weights);
      
      const result = scorer.score({ type: 'write-write' });
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('returns 0.5 for null race', () => {
      const weights = new ScoreWeights();
      const scorer = new TypeScorer(weights);

      expect(scorer.score(null)).toBe(0.5);
    });

    it('returns 0.5 for unknown type', () => {
      const weights = new ScoreWeights();
      const scorer = new TypeScorer(weights);

      expect(scorer.score({ type: 'unknown-type' })).toBe(0.5);
    });

    it('scores init-error (IE) high', () => {
      const weights = new ScoreWeights();
      const scorer = new TypeScorer(weights);

      const ieScore = scorer.score({ type: 'IE' });

      expect(ieScore).toBe(0.9);
    });
  });

  describe('AsyncScorer Detailed', () => {
    it('returns a number score', () => {
      const weights = new ScoreWeights();
      const scorer = new AsyncScorer(weights);

      const result = scorer.score({ asyncType: 'both' });

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('handles null input gracefully', () => {
      const weights = new ScoreWeights();
      const scorer = new AsyncScorer(weights);

      const result = scorer.score(null);
      expect(typeof result).toBe('number');
    });
  });

  describe('DataIntegrityScorer Detailed', () => {
    it('returns a number score', () => {
      const weights = new ScoreWeights();
      const scorer = new DataIntegrityScorer(weights);

      const result = scorer.score({ integrityLevel: 'critical' });

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('returns 0.5 for null race', () => {
      const weights = new ScoreWeights();
      const scorer = new DataIntegrityScorer(weights);

      expect(scorer.score(null)).toBe(0.5);
    });
  });

  describe('ScopeScorer Detailed', () => {
    it('returns a number score', () => {
      const weights = new ScoreWeights();
      const scorer = new ScopeScorer(weights);

      const result = scorer.score({ scope: 'global' });

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('returns 0.5 for null race', () => {
      const weights = new ScoreWeights();
      const scorer = new ScopeScorer(weights);

      expect(scorer.score(null)).toBe(0.5);
    });
  });

  describe('ImpactScorer Detailed', () => {
    it('scores based on project data', () => {
      const scorer = new ImpactScorer();

      // ImpactScorer usa projectData para calcular impacto
      const score = scorer.score({}, {});

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('FrequencyScorer Detailed', () => {
    it('scores based on race frequency', () => {
      const scorer = new FrequencyScorer();

      const score = scorer.score({});

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('TestingAdvisor Detailed', () => {
    it('provides advice for critical severity', () => {
      const advisor = new TestingAdvisor();

      const advice = advisor.getAdvice('critical');

      expect(advice.level).toBe('mandatory');
      expect(advice.tests).toContain('unit');
      expect(advice.tests).toContain('integration');
      expect(advice.tests).toContain('e2e');
      expect(advice.tests).toContain('stress');
      expect(advice.priority).toBe('P0');
    });

    it('provides advice for high severity', () => {
      const advisor = new TestingAdvisor();

      const advice = advisor.getAdvice('high');

      expect(advice.level).toBe('recommended');
      expect(advice.priority).toBe('P1');
    });

    it('provides advice for medium severity', () => {
      const advisor = new TestingAdvisor();

      const advice = advisor.getAdvice('medium');

      expect(advice.level).toBe('optional');
      expect(advice.priority).toBe('P2');
    });

    it('provides advice for low severity', () => {
      const advisor = new TestingAdvisor();

      const advice = advisor.getAdvice('low');

      expect(advice.level).toBe('documentation');
      expect(advice.priority).toBe('P3');
    });

    it('returns low advice for unknown severity', () => {
      const advisor = new TestingAdvisor();

      const advice = advisor.getAdvice('unknown');

      expect(advice.level).toBe('documentation');
    });
  });

  describe('ScoreWeights Detailed', () => {
    it('provides type weights', () => {
      const weights = new ScoreWeights();

      expect(weights.getTypeWeight('WW')).toBe(1.0);
      expect(weights.getTypeWeight('RW')).toBe(0.8);
      expect(weights.getTypeWeight('IE')).toBe(0.9);
      expect(weights.getTypeWeight('EH')).toBe(0.7);
      expect(weights.getTypeWeight('OTHER')).toBe(0.5);
    });

    it('provides async weights', () => {
      const weights = new ScoreWeights();

      expect(weights.getAsyncWeight('both')).toBe(1.0);
      expect(weights.getAsyncWeight('one')).toBe(0.8);
      expect(weights.getAsyncWeight('none')).toBe(0.3);
    });

    it('provides data integrity weights', () => {
      const weights = new ScoreWeights();

      expect(weights.getDataIntegrityWeight('critical')).toBe(1.0);
      expect(weights.getDataIntegrityWeight('high')).toBe(0.8);
      expect(weights.getDataIntegrityWeight('medium')).toBe(0.5);
      expect(weights.getDataIntegrityWeight('low')).toBe(0.2);
    });

    it('provides scope weights', () => {
      const weights = new ScoreWeights();

      expect(weights.getScopeWeight('global')).toBe(1.0);
      expect(weights.getScopeWeight('module')).toBe(0.7);
      expect(weights.getScopeWeight('external')).toBe(0.9);
      expect(weights.getScopeWeight('singleton')).toBe(0.8);
      expect(weights.getScopeWeight('closure')).toBe(0.4);
    });

    it('returns 0.5 for unknown weight types', () => {
      const weights = new ScoreWeights();

      expect(weights.getTypeWeight('unknown')).toBe(0.5);
      expect(weights.getAsyncWeight('unknown')).toBe(0.5);
      expect(weights.getDataIntegrityWeight('unknown')).toBe(0.5);
      expect(weights.getScopeWeight('unknown')).toBe(0.5);
    });

    it('update merges new weights', () => {
      const weights = new ScoreWeights();
      
      weights.update({
        type: { WW: 0.5, CUSTOM: 0.7 }
      });

      expect(weights.getTypeWeight('WW')).toBe(0.5);
      expect(weights.getTypeWeight('CUSTOM')).toBe(0.7);
      // Other weights should remain unchanged
      expect(weights.getTypeWeight('RW')).toBe(0.8);
    });

    it('update handles null/undefined gracefully', () => {
      const weights = new ScoreWeights();
      
      expect(() => weights.update(null)).not.toThrow();
      expect(() => weights.update(undefined)).not.toThrow();
      expect(() => weights.update({})).not.toThrow();
    });
  });
});