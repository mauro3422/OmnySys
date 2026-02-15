import { describe, it, expect } from 'vitest';
import { checkMitigation } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/mitigation.js';

describe('race-detector/.../analysis/mitigation.js', () => {
  it('reports common lock and atomic/transaction mitigation states', () => {
    const race = { accesses: [{ atom: 'a1' }, { atom: 'a2' }] };
    const mitigation = checkMitigation(race, {}, {
      haveCommonLock: () => true,
      findAtomForAccess: access => ({ id: access.atom }),
      getLockProtection: access => (access.atom === 'a1' ? { type: 'atomic' } : { type: 'atomic' })
    });
    expect(mitigation.hasMitigation).toBe(true);
    expect(mitigation.type).toBe('atomic_operations');
    expect(mitigation.details.length).toBeGreaterThan(0);
  });

  it('returns default non-mitigated state for missing accesses', () => {
    expect(checkMitigation({ accesses: [] }, {}, {
      haveCommonLock: () => false,
      findAtomForAccess: () => null,
      getLockProtection: () => null
    })).toMatchObject({ hasMitigation: false, type: null });
  });
});

