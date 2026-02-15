import { describe, it, expect } from 'vitest';
import { GraphBuilder } from '#layer-a/pipeline/molecular-chains/graph-builder/GraphBuilder.js';

describe('pipeline/molecular-chains/graph-builder/GraphBuilder.js', () => {
  const atoms = [
    {
      id: 'a1',
      name: 'entryFn',
      isExported: true,
      calledBy: [],
      calls: [{ name: 'workerFn', type: 'internal' }],
      dataFlow: { outputs: [] }
    },
    {
      id: 'a2',
      name: 'workerFn',
      calledBy: ['a1'],
      calls: [],
      dataFlow: { outputs: [{ type: 'return', shape: 'number' }] }
    }
  ];

  const chains = [{ id: 'c1', steps: [{ atomId: 'a1' }, { atomId: 'a2' }] }];
  const mappings = [
    {
      caller: 'entryFn',
      callee: 'workerFn',
      callSite: 4,
      mappings: [
        {
          argument: { variable: 'value' },
          parameter: { name: 'input' },
          transform: { type: 'DIRECT_PASS' },
          confidence: 1
        }
      ],
      totalArgs: 1,
      totalParams: 1,
      summary: { hasDataTransformation: false }
    }
  ];

  it('builds graph with meta counts', () => {
    const builder = new GraphBuilder(atoms, chains, mappings);
    const graph = builder.build();

    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(graph.meta.totalNodes).toBe(2);
    expect(graph.meta.totalEdges).toBe(graph.edges.length);
  });

  it('finds paths between functions', () => {
    const builder = new GraphBuilder(atoms, chains, mappings);
    const paths = builder.findPaths('entryFn', 'workerFn');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('calculates graph metrics', () => {
    const builder = new GraphBuilder(atoms, chains, mappings);
    const metrics = builder.calculateMetrics();
    expect(metrics.totalNodes).toBe(2);
    expect(metrics.totalEdges).toBeGreaterThanOrEqual(1);
    expect(metrics).toHaveProperty('mostCentralNodes');
  });
});

