import { describe, it, expect } from 'vitest';
import PatternRegistryDefault, {
  PatternRegistry,
  defaultRegistry
} from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/PatternRegistry.js';

describe('race-detector/strategies/race-detection-strategy/strategy/PatternRegistry.js', () => {
  it('provides default severity/mitigation maps', () => {
    const registry = new PatternRegistry();
    expect(registry.getSeverity('WW')).toBe('high');
    expect(registry.getSeverity('IE')).toBe('critical');
    expect(registry.getMitigationStrategies('RW')).toContain('locking');
  });

  it('supports custom overrides and exports expected defaults', () => {
    const registry = new PatternRegistry();
    registry.setSeverity('CUSTOM', 'low');
    registry.registerMitigations('CUSTOM', ['serialize']);
    expect(registry.getSeverity('CUSTOM')).toBe('low');
    expect(registry.getMitigationStrategies('CUSTOM')).toEqual(['serialize']);
    expect(defaultRegistry).toBeInstanceOf(PatternRegistry);
    expect(PatternRegistryDefault).toBe(PatternRegistry);
  });
});

