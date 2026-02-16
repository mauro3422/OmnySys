import { describe, it, expect } from 'vitest';
import BUILTIN_PATTERNS, { BUILTIN_PATTERNS as NAMED } from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/builtin-patterns.js';

describe('race-detector/.../patterns/builtin-patterns.js', () => {
  it('exports built-in pattern inventory with required fields', () => {
    expect(BUILTIN_PATTERNS).toBe(NAMED);
    expect(Array.isArray(BUILTIN_PATTERNS)).toBe(true);
    expect(BUILTIN_PATTERNS.length).toBeGreaterThanOrEqual(8);
    expect(BUILTIN_PATTERNS[0]).toHaveProperty('type');
    expect(BUILTIN_PATTERNS[0]).toHaveProperty('pattern');
    expect(BUILTIN_PATTERNS[0].pattern).toHaveProperty('matcher');
  });
});

