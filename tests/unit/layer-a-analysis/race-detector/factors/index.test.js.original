/**
 * @fileoverview factors/index.test.js
 * 
 * Tests for factors index module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/factors/index
 */

import { describe, it, expect } from 'vitest';
import { ScoreWeights } from '#layer-a/race-detector/factors/index.js';

describe('Factors Index', () => {
  describe('Structure Contract', () => {
    it('should export ScoreWeights class', () => {
      expect(ScoreWeights).toBeDefined();
      expect(typeof ScoreWeights).toBe('function');
    });

    it('should create ScoreWeights instance', () => {
      const weights = new ScoreWeights();
      expect(weights).toBeInstanceOf(ScoreWeights);
    });
  });
});
