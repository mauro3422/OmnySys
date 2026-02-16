import { describe, it, expect } from 'vitest';
import {
  enrichWithPatterns,
  EnrichPhase
} from '#layer-a/race-detector/phases/enrich-phase.js';

describe('race-detector/phases/enrich-phase.js', () => {
  it('enriches races with primary and all matched pattern keys', () => {
    const races = [{ id: 'r1' }, { id: 'r2' }];
    const matcher = {
      detectPatterns(race) {
        if (race.id === 'r1') return [{ key: 'counter', name: 'Counter' }, { key: 'cache', name: 'Cache' }];
        return [];
      }
    };

    const enriched = enrichWithPatterns(races, matcher);
    expect(enriched[0]).toMatchObject({
      pattern: 'counter',
      patternName: 'Counter',
      allPatterns: ['counter', 'cache']
    });
    expect(enriched[1].pattern).toBeUndefined();
  });

  it('executes through EnrichPhase class', () => {
    const phase = new EnrichPhase([{ id: 'r1' }], { detectPatterns: () => [] });
    expect(phase.execute()).toHaveLength(1);
  });
});

