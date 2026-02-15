import { describe, it, expect } from 'vitest';
import * as lockModule from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/index.js';

describe('race-detector/.../analyzers/lock/index.js', () => {
  it('exports lock analyzer API surface', () => {
    expect(lockModule.LockAnalyzer).toBeTypeOf('function');
    expect(lockModule.detectExplicitLock).toBeTypeOf('function');
    expect(lockModule.detectMonitorPattern).toBeTypeOf('function');
    expect(lockModule.detectAtomicOperation).toBeTypeOf('function');
    expect(lockModule.detectTransactionalContext).toBeTypeOf('function');
    expect(lockModule.analyzeLockCoverage).toBeTypeOf('function');
    expect(lockModule.findPotentialDeadlocks).toBeTypeOf('function');
    expect(lockModule.checkMitigation).toBeTypeOf('function');
    expect(lockModule.determineScope).toBeTypeOf('function');
    expect(lockModule.default).toBe(lockModule.LockAnalyzer);
  });
});

