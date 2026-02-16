import { describe, it, expect } from 'vitest';
import { PatternMatcher } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/PatternMatcher.js';

describe('race-detector/.../detectors/PatternMatcher.js', () => {
  it('matches RW/WW/IE patterns from access pairs', () => {
    const matcher = new PatternMatcher();
    expect(matcher.match({ type: 'read' }, { type: 'write' }, {}).some(m => m.type === 'RW')).toBe(true);
    expect(matcher.match({ type: 'write' }, { type: 'write' }, {}).some(m => m.type === 'WW')).toBe(true);
    expect(matcher.match({ type: 'initialization' }, { type: 'read' }, {}).some(m => m.type === 'IE')).toBe(true);
  });
});

