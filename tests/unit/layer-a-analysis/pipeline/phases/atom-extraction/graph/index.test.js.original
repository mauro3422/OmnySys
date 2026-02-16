import { describe, it, expect } from 'vitest';
import { buildCallGraph } from '#layer-a/pipeline/phases/atom-extraction/graph/index.js';

describe('pipeline/phases/atom-extraction/graph/index.js', () => {
  it('exports call graph builder', () => {
    expect(buildCallGraph).toBeTypeOf('function');
  });

  it('buildCallGraph classifies internal calls and calledBy links', () => {
    const atoms = [
      { id: '1', name: 'a', className: null, calls: [{ name: 'b' }], calledBy: [] },
      { id: '2', name: 'b', className: null, calls: [], calledBy: [] }
    ];
    buildCallGraph(atoms);
    expect(atoms[0].calls[0].type).toBe('internal');
    expect(atoms[1].calledBy).toContain('1');
  });
});
