import { describe, it, expect } from 'vitest';
import { findPaths } from '#layer-a/pipeline/molecular-chains/graph-builder/paths/finder.js';

describe('pipeline/molecular-chains/graph-builder/paths/finder.js', () => {
  it('returns empty list when source or target function is unknown', () => {
    const atomByName = new Map([['a', { id: 'a1' }]]);
    const paths = findPaths('a', 'b', atomByName, () => []);
    expect(paths).toEqual([]);
  });

  it('finds linear paths between functions', () => {
    const atomByName = new Map([
      ['a', { id: 'a1' }],
      ['b', { id: 'a2' }],
      ['c', { id: 'a3' }]
    ]);

    const paths = findPaths('a', 'c', atomByName, () => [
      { from: 'a1', to: 'a2', type: 'call' },
      { from: 'a2', to: 'a3', type: 'call' }
    ]);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveLength(2);
  });

  it('handles cycles using visited tracking', () => {
    const atomByName = new Map([
      ['a', { id: 'a1' }],
      ['b', { id: 'a2' }],
      ['c', { id: 'a3' }]
    ]);
    const edges = [
      { from: 'a1', to: 'a2', type: 'call' },
      { from: 'a2', to: 'a1', type: 'call' },
      { from: 'a2', to: 'a3', type: 'call' }
    ];

    const paths = findPaths('a', 'c', atomByName, () => edges);
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });
});

