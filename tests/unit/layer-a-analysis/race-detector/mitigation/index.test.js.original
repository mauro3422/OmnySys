import { describe, it, expect } from 'vitest';
import {
  hasLockProtection,
  getLockDetails,
  isAtomicOperation,
  getAtomicDetails,
  hasAsyncQueue,
  sameQueue,
  usesImmutableData,
  sameBusinessFlow,
  MitigationChecker
} from '#layer-a/race-detector/mitigation/index.js';

describe('race-detector/mitigation/index.js', () => {
  it('exports mitigation API surface', () => {
    expect(hasLockProtection).toBeTypeOf('function');
    expect(getLockDetails).toBeTypeOf('function');
    expect(isAtomicOperation).toBeTypeOf('function');
    expect(getAtomicDetails).toBeTypeOf('function');
    expect(hasAsyncQueue).toBeTypeOf('function');
    expect(sameQueue).toBeTypeOf('function');
    expect(usesImmutableData).toBeTypeOf('function');
    expect(sameBusinessFlow).toBeTypeOf('function');
    expect(MitigationChecker).toBeTypeOf('function');
  });

  it('MitigationChecker handles invalid race input safely', () => {
    const checker = new MitigationChecker({ modules: [] });
    expect(checker.findMitigation(null)).toBeNull();
    expect(checker.isFullyMitigated(null)).toBe(false);
  });
});
