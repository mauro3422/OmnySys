import { describe, it, expect } from 'vitest';
import { ScopeScorer } from '#layer-a/race-detector/scorers/ScopeScorer.js';

describe('race-detector/scorers/ScopeScorer.js', () => {
  it('scores based on scope weight and falls back to 0.5', () => {
    const scorer = new ScopeScorer({
      getScopeWeight(stateType) {
        return { global: 0.9, module: 0.6 }[stateType];
      }
    });
    expect(scorer.score({ stateType: 'global' })).toBe(0.9);
    expect(scorer.score({ stateType: 'unknown' })).toBe(0.5);
    expect(scorer.score(null)).toBe(0.5);
  });
});

