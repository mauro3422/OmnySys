import { describe, it, expect } from 'vitest';
import {
  detectPhaseConflicts,
  groupAtomsByPhase,
  getSharedPhases,
  detectRaceConditions
} from '#layer-a/extractors/metadata/temporal-connections/utils/phase-conflicts.js';

describe('extractors/metadata/temporal-connections/utils/phase-conflicts.js', () => {
  it('creates temporal conflict connections for atoms in same phase', () => {
    const atoms = [
      { id: 'a1', temporal: { lifecycleHooks: [{ phase: 'mount' }] } },
      { id: 'a2', temporal: { lifecycleHooks: [{ phase: 'mount' }] } }
    ];
    const conflicts = detectPhaseConflicts(atoms);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('temporal-constraint');
  });

  it('groups atoms by lifecycle phase and finds shared phases', () => {
    const a1 = { id: 'a1', temporal: { lifecycleHooks: [{ phase: 'render' }, { phase: 'mount' }] } };
    const a2 = { id: 'a2', temporal: { lifecycleHooks: [{ phase: 'render' }] } };
    const grouped = groupAtomsByPhase([a1, a2]);
    expect(grouped.render.length).toBe(2);
    expect(getSharedPhases(a1, a2)).toContain('render');
  });

  it('detects potential race conditions in critical phases', () => {
    const out = detectRaceConditions([
      { id: 'a1', temporal: { lifecycleHooks: [{ phase: 'render' }] } },
      { id: 'a2', temporal: { lifecycleHooks: [{ phase: 'render' }] } }
    ]);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].type).toBe('potential-race');
  });
});

