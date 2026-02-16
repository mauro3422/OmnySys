import { describe, it, expect } from 'vitest';
import { buildCallGraph } from '#layer-a/pipeline/phases/atom-extraction/graph/call-graph.js';

describe('pipeline/phases/atom-extraction/graph/call-graph.js', () => {
  it('classifies internal/external calls and computes calledBy', () => {
    const atoms = [
      { id: 'a1', name: 'main', className: null, calls: [{ name: 'helper' }, { name: 'fetch' }] },
      { id: 'a2', name: 'helper', className: null, calls: [] }
    ];

    buildCallGraph(atoms);

    expect(atoms[0].calls.find(c => c.name === 'helper').type).toBe('internal');
    expect(atoms[0].calls.find(c => c.name === 'fetch').type).toBe('external');
    expect(atoms[1].calledBy).toContain('a1');
  });

  it('tracks sibling class method invocations', () => {
    const atoms = [
      { id: 'm1', name: 'render', className: 'Widget', calls: [{ name: 'compute' }] },
      { id: 'm2', name: 'compute', className: 'Widget', calls: [] }
    ];

    buildCallGraph(atoms);
    expect(atoms[1].calledBy).toContain('m1');
  });
});

