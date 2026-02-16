import { describe, it, expect } from 'vitest';
import { ExpensiveOperationsAnalyzer } from '#layer-a/extractors/metadata/performance-impact/analyzers/expensive-ops-analyzer.js';

describe('extractors/metadata/performance-impact/analyzers/expensive-ops-analyzer.js', () => {
  it('detects heavy array/JSON/DOM operations', () => {
    const analyzer = new ExpensiveOperationsAnalyzer();
    const metrics = analyzer.analyze('arr.sort(); JSON.parse(bigPayload); document.querySelectorAll("div");', {
      nestedLoops: [{ depth: 2 }],
      hasRecursion: true,
      blockingOperations: ['alert']
    });
    expect(metrics.nestedLoops).toBe(1);
    expect(metrics.recursion).toBe(true);
    expect(metrics.heavyCalls.length).toBeGreaterThan(0);
  });
});

