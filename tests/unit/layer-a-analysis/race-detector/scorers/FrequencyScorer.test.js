import { describe, it, expect } from 'vitest';
import { FrequencyScorer } from '#layer-a/race-detector/scorers/FrequencyScorer.js';

describe('race-detector/scorers/FrequencyScorer.js', () => {
  it('returns baseline for invalid race/accesses', () => {
    const scorer = new FrequencyScorer();
    expect(scorer.score(null)).toBe(0.5);
    expect(scorer.score({ accesses: 'nope' })).toBe(0.5);
  });

  it('increases score with more than two accesses', () => {
    const scorer = new FrequencyScorer();
    expect(scorer.score({ accesses: [{}, {}] })).toBe(0.5);
    expect(scorer.score({ accesses: [{}, {}, {}] })).toBeCloseTo(0.85);
  });
});

