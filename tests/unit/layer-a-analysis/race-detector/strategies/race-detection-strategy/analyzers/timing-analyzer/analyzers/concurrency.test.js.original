import { describe, it, expect } from 'vitest';
import { canRunConcurrently, analyzeTiming } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/concurrency.js';

describe('race-detector/.../timing-analyzer/analyzers/concurrency.js', () => {
  const analyzer = {
    getAtomCallers: () => [],
    findEntryPoints: () => ['EntryA'],
    findAtomById: () => null
  };

  it('detects simple concurrency rules', () => {
    expect(canRunConcurrently(
      { atom: 'a1', isAsync: true },
      { atom: 'a2', isAsync: true },
      {},
      analyzer
    )).toBe(true);

    expect(canRunConcurrently(
      { atom: 'a1', isAsync: false },
      { atom: 'a1', isAsync: false },
      {},
      analyzer
    )).toBe(false);
  });

  it('builds timing analysis with concurrent pairs', () => {
    const accesses = [
      { atom: 'a1', isAsync: true },
      { atom: 'a2', isAsync: true },
      { atom: 'a3', isAsync: false }
    ];
    const result = analyzeTiming(accesses, {}, analyzer);
    expect(result.totalAccesses).toBe(3);
    expect(result.concurrentPairs).toBeGreaterThan(0);
    expect(result.isConcurrent).toBe(true);
  });
});

