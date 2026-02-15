import { describe, it, expect } from 'vitest';
import PatternRegistryDefault, { PatternRegistry } from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/PatternRegistry.js';

describe('race-detector/.../patterns/PatternRegistry.js', () => {
  it('loads built-ins and supports registry operations', () => {
    const registry = new PatternRegistry();
    expect(registry.getAllTypes().length).toBeGreaterThanOrEqual(8);
    expect(registry.has('RW')).toBe(true);
    expect(registry.getSeverity('WW')).toBe('critical');
    expect(registry.getMitigationStrategies('RW').length).toBeGreaterThan(0);
    expect(registry.getCategories().length).toBeGreaterThan(0);
  });

  it('registers/unregisters custom patterns and matches safely', () => {
    const registry = new PatternRegistry();
    registry.register('X', {
      matcher: () => true,
      name: 'X pattern',
      severity: 'low',
      mitigationStrategies: ['noop']
    }, 'custom');
    expect(registry.match('X', {}, {})).toBe(true);
    expect(registry.matchAll({}, {}).some(p => p.type === 'X')).toBe(true);
    expect(registry.unregister('X')).toBe(true);
    expect(registry.has('X')).toBe(false);
    registry.clear();
    expect(registry.getAllTypes()).toEqual([]);
    expect(PatternRegistryDefault).toBe(PatternRegistry);
  });
});

