import { describe, it, expect } from 'vitest';
import PatternRegistryDefault, {
  PatternRegistry,
  BUILTIN_PATTERNS,
  defaultRegistry
} from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/index.js';

describe('race-detection-strategy/patterns/index.js', () => {
  it('exports registry and builtin patterns', () => {
    expect(PatternRegistry).toBeTypeOf('function');
    expect(Array.isArray(BUILTIN_PATTERNS)).toBe(true);
    expect(defaultRegistry).toBeInstanceOf(PatternRegistry);
    expect(PatternRegistryDefault).toBe(PatternRegistry);
  });
});
