import { describe, it, expect } from 'vitest';
import { RaceFactory } from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/RaceFactory.js';
import { PatternRegistry } from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/PatternRegistry.js';

describe('race-detector/strategies/race-detection-strategy/strategy/RaceFactory.js', () => {
  it('creates race objects with metadata and generated id', () => {
    const factory = new RaceFactory();
    const race = factory.create(
      'global:counter',
      { atomName: 'inc', type: 'write' },
      { atomName: 'dec', type: 'write' },
      'WW'
    );

    expect(race.id).toMatch(/^race_/);
    expect(race.type).toBe('WW');
    expect(race.stateType).toBe('global');
    expect(race.severity).toBe('high');
    expect(race.description).toContain('Write-Write');
  });

  it('uses registry for mitigation strategies and custom severity behavior', () => {
    const registry = new PatternRegistry();
    registry.setSeverity('CUSTOM', 'critical');
    registry.registerMitigations('CUSTOM', ['queue']);
    const factory = new RaceFactory(registry);

    const race = factory.create('module:x', { atomName: 'a', type: 'read' }, { atomName: 'b', type: 'write' }, 'CUSTOM');
    expect(race.severity).toBe('critical');
    expect(factory.getMitigationStrategies('CUSTOM')).toEqual(['queue']);
  });
});
