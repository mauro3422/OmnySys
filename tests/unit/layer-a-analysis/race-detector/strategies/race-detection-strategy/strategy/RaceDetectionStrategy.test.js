import { describe, it, expect } from 'vitest';
import { RaceDetectionStrategy } from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/RaceDetectionStrategy.js';

describe('race-detector/.../strategy/RaceDetectionStrategy.js', () => {
  it('is abstract and requires subclass methods', () => {
    expect(() => new RaceDetectionStrategy()).toThrow('Cannot instantiate abstract class');

    class Partial extends RaceDetectionStrategy {
      getRaceType() { return 'X'; }
    }
    expect(() => new Partial().detect()).toThrow('Subclasses must implement detect()');
  });

  it('provides shared helper methods through subclass implementation', () => {
    class Concrete extends RaceDetectionStrategy {
      getRaceType() { return 'RW'; }
      detect() { return []; }
    }
    const strategy = new Concrete();
    const race = strategy.createRace('global:x', { atomName: 'a', type: 'read' }, { atomName: 'b', type: 'write' }, 'RW');
    expect(race.type).toBe('RW');
    expect(Array.isArray(strategy.getMitigationStrategies('RW'))).toBe(true);
  });
});
