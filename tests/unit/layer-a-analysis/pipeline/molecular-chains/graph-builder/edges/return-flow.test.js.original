import { describe, it, expect } from 'vitest';
import {
  buildReturnEdges,
  findReturnUsage
} from '#layer-a/pipeline/molecular-chains/graph-builder/edges/return-flow.js';

describe('pipeline/molecular-chains/graph-builder/edges/return-flow.js', () => {
  it('detects assignment return usage', () => {
    const usage = findReturnUsage(
      { code: 'const value = fetchData();' },
      { name: 'fetchData' },
      { type: 'return' }
    );
    expect(usage).toMatchObject({ variable: 'value', type: 'assignment' });
  });

  it('detects direct return usage and null usage', () => {
    const direct = findReturnUsage(
      { code: 'return loadConfig();' },
      { name: 'loadConfig' },
      { type: 'return' }
    );
    const none = findReturnUsage(
      { code: 'const x = 1;' },
      { name: 'loadConfig' },
      { type: 'return' }
    );

    expect(direct).toMatchObject({ variable: 'return', type: 'direct_return' });
    expect(none).toBe(null);
  });

  it('builds return flow edges from calledBy relationships', () => {
    const callee = {
      id: 'f2',
      name: 'calculate',
      dataFlow: { outputs: [{ type: 'return', shape: 'number' }] },
      calledBy: ['f1']
    };
    const caller = { id: 'f1', name: 'entry', code: 'const total = calculate(items);' };
    const atoms = [caller, callee];
    const atomById = new Map(atoms.map(a => [a.id, a]));

    const edges = buildReturnEdges(atoms, atomById);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      from: 'f2',
      to: 'f1',
      type: 'return_flow',
      isReturnFlow: true
    });
  });
});
