import { describe, it, expect } from 'vitest';
import { TypeScorer } from '#layer-a/race-detector/scorers/TypeScorer.js';

describe('race-detector/scorers/TypeScorer.js', () => {
  it('scores using type weights and has null fallback', () => {
    const scorer = new TypeScorer({
      getTypeWeight(type) {
        return { WW: 0.95, RW: 0.75 }[type];
      }
    });
    expect(scorer.score({ type: 'WW' })).toBe(0.95);
    expect(scorer.score({ type: 'OTHER' })).toBe(0.5);
    expect(scorer.score(null)).toBe(0.5);
  });
});
