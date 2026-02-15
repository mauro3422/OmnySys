import { describe, it, expect } from 'vitest';
import PatternMatcherDefault, { PatternMatcher } from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/pattern-matcher.js';
import { PatternMatcher as DetectorPatternMatcher } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/PatternMatcher.js';

describe('race-detector/.../patterns/pattern-matcher.js', () => {
  it('re-exports detector PatternMatcher compatibility wrapper', () => {
    expect(PatternMatcher).toBe(DetectorPatternMatcher);
    expect(PatternMatcherDefault).toBe(DetectorPatternMatcher);
  });
});

