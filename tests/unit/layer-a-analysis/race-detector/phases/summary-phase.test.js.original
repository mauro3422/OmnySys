import { describe, it, expect } from 'vitest';
import {
  generateSummary,
  SummaryPhase
} from '#layer-a/race-detector/phases/summary-phase.js';

describe('race-detector/phases/summary-phase.js', () => {
  it('builds summary totals and grouped counts', () => {
    const races = [
      { type: 'WW', severity: 'high' },
      { type: 'RW', severity: 'high' },
      { type: 'WW', severity: 'critical' }
    ];
    const warnings = [{}, {}];
    const shared = new Map([['x', []], ['y', []]]);
    const config = { trackers: [{}, {}], strategies: [{}] };

    const summary = generateSummary(races, warnings, shared, config);

    expect(summary.totalRaces).toBe(3);
    expect(summary.totalWarnings).toBe(2);
    expect(summary.byType.WW).toBe(2);
    expect(summary.bySeverity.high).toBe(2);
    expect(summary.sharedStateItems).toBe(2);
  });

  it('executes through SummaryPhase class', () => {
    const phase = new SummaryPhase([], [], new Map(), { trackers: [], strategies: [] });
    const summary = phase.execute();
    expect(summary.totalRaces).toBe(0);
    expect(summary.totalWarnings).toBe(0);
  });
});

