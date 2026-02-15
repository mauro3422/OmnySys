import { describe, it, expect } from 'vitest';
import LockAnalyzerDefault, { LockAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock-analyzer.js';
import { LockAnalyzer as DetectorLockAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/LockAnalyzer.js';

describe('race-detector/.../analyzers/lock-analyzer.js', () => {
  it('re-exports detector LockAnalyzer for backward compatibility', () => {
    expect(LockAnalyzer).toBe(DetectorLockAnalyzer);
    expect(LockAnalyzerDefault).toBe(DetectorLockAnalyzer);
  });
});

