import { describe, it, expect } from 'vitest';
import { PatternRegistry } from '#layer-a/race-detector/matchers/PatternRegistry.js';

describe('race-detector/matchers/PatternRegistry.js', () => {
  it('initializes built-in patterns and exposes list metadata', () => {
    const registry = new PatternRegistry();
    const patterns = registry.getAllPatterns();
    const list = registry.getPatternList();

    expect(patterns).toBeInstanceOf(Map);
    expect(patterns.size).toBeGreaterThanOrEqual(8);
    expect(list.some(p => p.key === 'singleton')).toBe(true);
    expect(list.some(p => p.key === 'counter')).toBe(true);
  });

  it('registers custom patterns', () => {
    const registry = new PatternRegistry();
    registry.register('custom', 'Custom Pattern', race => race.type === 'OTHER');
    const patterns = registry.getAllPatterns();
    expect(patterns.has('custom')).toBe(true);
    expect(patterns.get('custom').detect({ type: 'OTHER' })).toBe(true);
  });
});

