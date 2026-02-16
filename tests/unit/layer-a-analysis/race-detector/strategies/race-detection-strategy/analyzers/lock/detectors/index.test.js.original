import { describe, it, expect } from 'vitest';
import * as detectors from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/index.js';

describe('race-detector/.../detectors/index.js', () => {
  it('re-exports all lock detectors', () => {
    expect(detectors.detectExplicitLock).toBeTypeOf('function');
    expect(detectors.detectMonitorPattern).toBeTypeOf('function');
    expect(detectors.detectAtomicOperation).toBeTypeOf('function');
    expect(detectors.detectTransactionalContext).toBeTypeOf('function');
  });
});

