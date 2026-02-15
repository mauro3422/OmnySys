import { describe, it, expect } from 'vitest';
import {
  extractPerformanceMetrics,
  extractPerformanceImpactConnections
} from '#layer-a/extractors/metadata/performance-impact/index.js';

describe('extractors/metadata/performance-impact/index.js', () => {
  it('extracts performance metrics from code', () => {
    const metrics = extractPerformanceMetrics('for(let i=0;i<10;i++){ arr.map(x=>x*2); fetch("/x"); }');
    expect(metrics).toHaveProperty('complexity');
    expect(metrics).toHaveProperty('expensiveOps');
    expect(metrics).toHaveProperty('resources');
    expect(typeof metrics.impactScore).toBe('number');
  });

  it('builds performance propagation connections', () => {
    const atoms = [
      {
        id: 'a1',
        name: 'slowFn',
        calls: [],
        performance: { impactScore: 0.8, complexity: { bigO: 'O(n^2)' }, expensiveOps: { nestedLoops: 1 }, resources: {} }
      },
      {
        id: 'a2',
        name: 'callerFn',
        calls: ['slowFn()'],
        performance: { impactScore: 0.2, complexity: { bigO: 'O(1)' }, expensiveOps: { nestedLoops: 0 }, resources: {} }
      }
    ];
    const connections = extractPerformanceImpactConnections(atoms);
    expect(Array.isArray(connections)).toBe(true);
  });
});
