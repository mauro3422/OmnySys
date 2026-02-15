import { describe, it, expect } from 'vitest';
import { RacePatternMatcher } from '#layer-a/race-detector/matchers/RacePatternMatcher.js';

describe('race-detector/matchers/RacePatternMatcher.js', () => {
  it('detects known patterns for a race', () => {
    const matcher = new RacePatternMatcher();
    const race = {
      id: 'r1',
      type: 'WW',
      stateKey: 'counter',
      accesses: [{ code: 'count++' }, { code: 'count += 1' }]
    };

    const detected = matcher.detectPatterns(race);
    expect(Array.isArray(detected)).toBe(true);
    expect(detected.some(p => p.key === 'counter')).toBe(true);
  });

  it('exposes available patterns and supports adding custom ones', () => {
    const matcher = new RacePatternMatcher();
    const before = matcher.getPatterns().length;
    matcher.addPattern('always', 'Always', () => true);
    const after = matcher.getPatterns().length;
    const detected = matcher.detectPatterns({ id: 'r2', type: 'OTHER', stateKey: 'x', accesses: [] });

    expect(after).toBe(before + 1);
    expect(detected.some(p => p.key === 'always')).toBe(true);
  });
});

