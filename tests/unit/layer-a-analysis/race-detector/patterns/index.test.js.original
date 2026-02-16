import { describe, it, expect } from 'vitest';
import * as patterns from '#layer-a/race-detector/patterns/index.js';

describe('race-detector/patterns/index.js', () => {
  it('exports pattern detector functions and namespace', () => {
    expect(patterns.isSingletonPattern).toBeTypeOf('function');
    expect(patterns.isCounterPattern).toBeTypeOf('function');
    expect(patterns.isArrayPattern).toBeTypeOf('function');
    expect(patterns.isCachePattern).toBeTypeOf('function');
    expect(patterns.PatternDetectors).toBeTypeOf('object');
  });

  it('detects counter-like pattern with real detector', () => {
    const race = {
      type: 'WW',
      stateKey: 'counter',
      accesses: [{ code: 'count++' }, { code: 'count += 1' }]
    };
    expect(patterns.isCounterPattern(race)).toBe(true);
  });
});
