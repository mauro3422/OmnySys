import { describe, it, expect } from 'vitest';
import {
  buildNodes,
  determineNodeType
} from '#layer-a/pipeline/molecular-chains/graph-builder/nodes/builder.js';
import { determinePositionInChains } from '#layer-a/pipeline/molecular-chains/graph-builder/nodes/position.js';

describe('pipeline/molecular-chains/graph-builder/nodes/builder.js', () => {
  it('classifies node types for entry, exit, intermediate and isolated cases', () => {
    expect(determineNodeType({ isExported: true, calls: [] }, [])).toBe('entry');
    expect(determineNodeType({ isExported: false, calledBy: ['external::x'], calls: [] }, [{ name: 'local' }])).toBe('entry');
    expect(determineNodeType({ isExported: false, calledBy: [], calls: [] }, [])).toBe('exit');
    expect(
      determineNodeType(
        { isExported: false, calledBy: ['id::local'], calls: [{ type: 'internal' }] },
        [{ name: 'local' }]
      )
    ).toBe('intermediate');
  });

  it('builds nodes with mapped inputs, outputs and chain positions', () => {
    const atoms = [
      {
        id: 'a1',
        name: 'entryFn',
        isExported: true,
        calledBy: [],
        calls: [{ type: 'internal', name: 'workerFn' }],
        dataFlow: {
          inputs: [{ name: 'x', type: 'number' }],
          outputs: [{ type: 'return', shape: 'number' }]
        },
        complexity: 2,
        hasSideEffects: false
      }
    ];
    const chains = [{ id: 'c1', steps: [{ atomId: 'a1' }] }];

    const nodes = buildNodes(atoms, chains, {
      determineNodeType,
      determinePositionInChains
    });

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: 'a1',
      function: 'entryFn',
      type: 'entry'
    });
    expect(nodes[0].inputs[0]).toEqual({ name: 'x', type: 'number' });
    expect(nodes[0].chains).toEqual(['c1']);
    expect(nodes[0].position).toContain('entry');
  });
});
