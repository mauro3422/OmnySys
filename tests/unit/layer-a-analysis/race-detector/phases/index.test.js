import { describe, it, expect } from 'vitest';
import {
  PHASES,
  DEFAULT_PIPELINE_ORDER,
  generateSummary
} from '#layer-a/race-detector/phases/index.js';

describe('race-detector/phases/index.js', () => {
  it('exports phase registry and default pipeline order', () => {
    expect(PHASES).toHaveProperty('COLLECT');
    expect(PHASES).toHaveProperty('SUMMARY');
    expect(Array.isArray(DEFAULT_PIPELINE_ORDER)).toBe(true);
    expect(DEFAULT_PIPELINE_ORDER[0]).toBe(PHASES.COLLECT);
  });

  it('generateSummary returns deterministic summary contract', () => {
    const summary = generateSummary(
      [{ type: 'WW', severity: 'high' }],
      [],
      new Map([['state', []]]),
      { trackers: ['a'], strategies: ['b'] }
    );
    expect(summary.totalRaces).toBe(1);
    expect(summary.byType.WW).toBe(1);
    expect(summary).toHaveProperty('analyzedAt');
  });
});
