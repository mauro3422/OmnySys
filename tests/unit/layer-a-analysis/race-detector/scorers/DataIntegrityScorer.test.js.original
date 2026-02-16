import { describe, it, expect } from 'vitest';
import { DataIntegrityScorer } from '#layer-a/race-detector/scorers/DataIntegrityScorer.js';

describe('race-detector/scorers/DataIntegrityScorer.js', () => {
  const weights = {
    getDataIntegrityWeight(level) {
      return { low: 0.2, medium: 0.5, high: 0.8, critical: 1 }[level];
    }
  };

  it('scores by state type and race type multipliers', () => {
    const scorer = new DataIntegrityScorer(weights);
    expect(scorer.score({ stateType: 'closure', type: 'RW' })).toBe(0.2);
    expect(scorer.score({ stateType: 'global', type: 'WW' })).toBeCloseTo(0.96);
    expect(scorer.score({ stateType: 'external', type: 'IE' })).toBe(1);
  });

  it('returns default score when race is null', () => {
    const scorer = new DataIntegrityScorer(weights);
    expect(scorer.score(null)).toBe(0.5);
  });
});

