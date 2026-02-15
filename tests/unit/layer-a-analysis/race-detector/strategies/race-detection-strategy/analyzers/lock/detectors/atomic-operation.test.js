import { describe, it, expect } from 'vitest';
import { detectAtomicOperation } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/atomic-operation.js';

describe('race-detector/.../detectors/atomic-operation.js', () => {
  it('detects atomic operation patterns', () => {
    const lock = detectAtomicOperation('AtomicInteger.compareAndSet(v, 1, 2)', { name: 'v', line: 3, column: 1 });
    expect(lock).toMatchObject({ type: 'atomic', scope: 'operation', target: 'v' });
  });

  it('returns null when context is non-atomic', () => {
    expect(detectAtomicOperation('value = value + 1', { line: 1 })).toBe(null);
  });
});

