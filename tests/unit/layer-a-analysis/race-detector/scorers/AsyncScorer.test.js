/**
 * @fileoverview AsyncScorer.test.js
 * 
 * Tests for AsyncScorer class.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/scorers/AsyncScorer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncScorer } from '#layer-a/race-detector/scorers/AsyncScorer.js';
import { ScoreWeights } from '#layer-a/race-detector/factors/ScoreWeights.js';
import { RaceConditionBuilder } from '../../../../factories/race-detector-test.factory.js';

describe('AsyncScorer', () => {
  describe('Structure Contract', () => {
    it('should export AsyncScorer class', () => {
      expect(AsyncScorer).toBeDefined();
      expect(typeof AsyncScorer).toBe('function');
    });

    it('should create instance with weights', () => {
      const weights = new ScoreWeights();
      const scorer = new AsyncScorer(weights);
      expect(scorer.weights).toBe(weights);
    });

    it('should have score method', () => {
      const weights = new ScoreWeights();
      const scorer = new AsyncScorer(weights);
      expect(typeof scorer.score).toBe('function');
    });
  });

  describe('score', () => {
    let scorer;
    let weights;

    beforeEach(() => {
      weights = new ScoreWeights();
      scorer = new AsyncScorer(weights);
    });

    it('should return weight for both async', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { isAsync: true })
        .withAccess('a2', { isAsync: true })
        .build();
      
      const score = scorer.score(race);
      expect(score).toBe(weights.getAsyncWeight('both'));
    });

    it('should return weight for one async', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { isAsync: true })
        .withAccess('a2', { isAsync: false })
        .build();
      
      const score = scorer.score(race);
      expect(score).toBe(weights.getAsyncWeight('one'));
    });

    it('should return weight for none async', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { isAsync: false })
        .withAccess('a2', { isAsync: false })
        .build();
      
      const score = scorer.score(race);
      expect(score).toBe(weights.getAsyncWeight('none'));
    });

    it('should return correct values for different async combinations', () => {
      expect(scorer.score({
        accesses: [{ isAsync: true }, { isAsync: true }]
      })).toBe(1.0);

      expect(scorer.score({
        accesses: [{ isAsync: true }, { isAsync: false }]
      })).toBe(0.8);

      expect(scorer.score({
        accesses: [{ isAsync: false }, { isAsync: true }]
      })).toBe(0.8);

      expect(scorer.score({
        accesses: [{ isAsync: false }, { isAsync: false }]
      })).toBe(0.3);
    });

    it('should handle race with no accesses', () => {
      const race = { id: 'race-1', accesses: [] };
      const score = scorer.score(race);
      expect(score).toBe(weights.getAsyncWeight('none'));
    });

    it('should handle race with single access', () => {
      const race = { id: 'race-1', accesses: [{ isAsync: true }] };
      const score = scorer.score(race);
      expect(score).toBe(weights.getAsyncWeight('one'));
    });

    it('should handle race with more than 2 accesses', () => {
      const race = {
        accesses: [
          { isAsync: true },
          { isAsync: false },
          { isAsync: true }
        ]
      };
      // With 3 accesses, both true and false exist
      const score = scorer.score(race);
      expect(score).toBe(weights.getAsyncWeight('one'));
    });

    it('should handle accesses without isAsync property', () => {
      const race = {
        accesses: [{}, {}]
      };
      const score = scorer.score(race);
      expect(score).toBe(weights.getAsyncWeight('none'));
    });
  });

  describe('Error Handling Contract', () => {
    let scorer;

    beforeEach(() => {
      scorer = new AsyncScorer(new ScoreWeights());
    });

    it('should handle null race', () => {
      expect(() => scorer.score(null)).not.toThrow();
    });

    it('should handle undefined race', () => {
      expect(() => scorer.score(undefined)).not.toThrow();
    });

    it('should handle race without accesses property', () => {
      const score = scorer.score({ id: 'race-1' });
      expect(typeof score).toBe('number');
    });

    it('should handle null accesses', () => {
      const score = scorer.score({ accesses: null });
      expect(typeof score).toBe('number');
    });

    it('should handle null weights in constructor', () => {
      const scorerWithoutWeights = new AsyncScorer(null);
      const race = new RaceConditionBuilder()
        .withAccess('a1', { isAsync: true })
        .withAccess('a2', { isAsync: true })
        .build();
      
      expect(() => scorerWithoutWeights.score(race)).not.toThrow();
      const score = scorerWithoutWeights.score(race);
      expect(typeof score).toBe('number');
    });

    it('should handle undefined weights in constructor', () => {
      const scorerWithoutWeights = new AsyncScorer(undefined);
      const race = new RaceConditionBuilder().build();
      
      expect(() => scorerWithoutWeights.score(race)).not.toThrow();
      const score = scorerWithoutWeights.score(race);
      expect(typeof score).toBe('number');
    });
  });
});
