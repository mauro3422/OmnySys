import { describe, it, expect } from 'vitest';
import {
  detectConnectionConflicts,
  hasCriticalConflicts,
  groupConflictsBySeverity
} from '#layer-a/pipeline/enhancers/connections/conflicts/index.js';

describe('pipeline/enhancers/connections/conflicts/index.js', () => {
  it('exports conflict analysis helpers', () => {
    expect(detectConnectionConflicts).toBeTypeOf('function');
    expect(hasCriticalConflicts).toBeTypeOf('function');
    expect(groupConflictsBySeverity).toBeTypeOf('function');
  });

  it('detects and groups race-like conflict contracts', () => {
    const conflicts = detectConnectionConflicts([
      {
        type: 'temporal-dependency',
        relationship: 'same-execution-phase',
        potentialRace: true,
        from: 'a',
        to: 'b',
        phase: 'init'
      }
    ]);

    const grouped = groupConflictsBySeverity(conflicts);
    expect(Array.isArray(conflicts)).toBe(true);
    expect(grouped.warning || grouped.critical).toBeDefined();
    expect(hasCriticalConflicts(conflicts)).toBeTypeOf('boolean');
  });
});
