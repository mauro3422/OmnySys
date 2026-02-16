import { describe, it, expect } from 'vitest';
import PatternRegistryCompatDefault, {
  PatternRegistry,
  defaultRegistry
} from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/pattern-registry.js';
import {
  PatternRegistry as StrategyPatternRegistry,
  defaultRegistry as StrategyDefaultRegistry
} from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/PatternRegistry.js';

describe('race-detector/.../patterns/pattern-registry.js', () => {
  it('re-exports strategy PatternRegistry compatibility surface', () => {
    expect(PatternRegistry).toBe(StrategyPatternRegistry);
    expect(defaultRegistry).toBe(StrategyDefaultRegistry);
    expect(PatternRegistryCompatDefault).toBe(StrategyPatternRegistry);
  });
});
