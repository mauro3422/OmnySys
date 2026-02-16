import { describe, it, expect } from 'vitest';
import { ImpactCalculator } from '#layer-a/extractors/metadata/performance-impact/metrics/impact-calculator.js';

describe('extractors/metadata/performance-impact/metrics/impact-calculator.js', () => {
  it('calculates bounded impact score and execution estimates', () => {
    const calc = new ImpactCalculator();
    const score = calc.calculate({
      complexity: { cyclomatic: 25, bigO: 'O(n^2)' },
      expensiveOps: { nestedLoops: 2, recursion: true, heavyCalls: [{}, {}, {}] },
      resources: { network: true, memory: 'high', dom: true }
    });
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
    const estimate = calc.estimateExecution(score, true);
    expect(estimate).toHaveProperty('executionTime');
  });
});

