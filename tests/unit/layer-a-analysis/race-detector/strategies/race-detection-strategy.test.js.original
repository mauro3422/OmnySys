import { describe, it, expect } from 'vitest';
import * as strategyCompat from '#layer-a/race-detector/strategies/race-detection-strategy.js';

describe('race-detector/strategies/race-detection-strategy.js', () => {
  it('re-exports compatibility API from modular strategy package', () => {
    expect(strategyCompat.RaceDetectionStrategy).toBeTypeOf('function');
    expect(strategyCompat.SharedStateAnalyzer).toBeTypeOf('function');
    expect(strategyCompat.TimingAnalyzer).toBeTypeOf('function');
    expect(strategyCompat.LockAnalyzer).toBeTypeOf('function');
    expect(strategyCompat.PatternMatcher).toBeTypeOf('function');
    expect(strategyCompat.PatternRegistry).toBeTypeOf('function');
    expect(strategyCompat.default).toBe(strategyCompat.RaceDetectionStrategy);
  });
});

