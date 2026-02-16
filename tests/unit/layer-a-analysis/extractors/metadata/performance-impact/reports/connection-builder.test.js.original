import { describe, it, expect } from 'vitest';
import { ConnectionBuilder } from '#layer-a/extractors/metadata/performance-impact/reports/connection-builder.js';

describe('extractors/metadata/performance-impact/reports/connection-builder.js', () => {
  it('builds impact connections when caller invokes slow atoms', () => {
    const builder = new ConnectionBuilder();
    const atoms = [
      {
        id: 'a1',
        name: 'slow',
        calls: [],
        performance: { impactScore: 0.8, complexity: { bigO: 'O(n^2)' }, expensiveOps: { nestedLoops: 1 }, resources: {} }
      },
      {
        id: 'a2',
        name: 'caller',
        calls: ['slow()'],
        performance: { impactScore: 0.2, complexity: { bigO: 'O(1)' }, expensiveOps: { nestedLoops: 0 }, resources: {} }
      }
    ];
    const connections = builder.build(atoms);
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0]).toHaveProperty('type', 'performance-impact');
  });
});
