import { describe, it, expect } from 'vitest';
import {
  buildEdges,
  determineEdgeType
} from '#layer-a/pipeline/molecular-chains/graph-builder/edges/builder.js';

describe('pipeline/molecular-chains/graph-builder/edges/builder.js', () => {
  it('classifies edge types based on mapping transforms', () => {
    expect(determineEdgeType({ mappings: [{ transform: { type: 'DIRECT_PASS' } }] })).toBe('direct_call');
    expect(determineEdgeType({ mappings: [{ transform: { type: 'CALL_RESULT' } }] })).toBe('data_transform');
    expect(determineEdgeType({ mappings: [{ transform: { type: 'UNKNOWN' } }] })).toBe('call');
  });

  it('builds data edges and appends return edges', () => {
    const atoms = [{ id: 'a1', name: 'caller' }, { id: 'a2', name: 'callee' }];
    const atomByName = new Map(atoms.map(a => [a.name, a]));
    const mappings = [
      {
        caller: 'caller',
        callee: 'callee',
        callSite: 3,
        mappings: [
          {
            argument: { variable: 'source' },
            parameter: { name: 'target' },
            transform: { type: 'DIRECT_PASS' },
            confidence: 1
          }
        ],
        returnUsage: { isUsed: true, assignedTo: 'res', usages: [{ line: 1 }] },
        totalArgs: 1,
        totalParams: 1,
        summary: { hasDataTransformation: false }
      }
    ];

    const edges = buildEdges(mappings, atomByName, atoms, {
      determineEdgeType,
      buildReturnEdges: () => [{ id: 'ret_1', from: 'a2', to: 'a1', type: 'return_flow' }]
    });

    expect(edges).toHaveLength(2);
    expect(edges[0].fromFunction).toBe('caller');
    expect(edges[0].toFunction).toBe('callee');
    expect(edges[0].dataMapping[0]).toMatchObject({ source: 'source', target: 'target' });
    expect(edges[1].id).toBe('ret_1');
  });
});

