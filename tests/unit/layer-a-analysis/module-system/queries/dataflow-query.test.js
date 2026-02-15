import { describe, it, expect } from 'vitest';
import { queryDataFlow, listDataFlows, findFlowsByModule, findFlowsByFunction } from '../../../../../src/layer-a-static/module-system/queries/dataflow-query.js';

const data = {
  system: {
    businessFlows: [{
      name: 'auth-flow',
      type: 'request',
      entryPoint: { handler: { function: 'login' } },
      steps: [{ order: 1, module: 'auth', file: 'login.js', function: 'login', input: [], output: [], async: false, sideEffects: [] }],
      sideEffects: [],
      modulesInvolved: ['auth']
    }]
  }
};

describe('module-system/queries/dataflow-query.js', () => {
  it('queries a specific flow by entry point', () => {
    const out = queryDataFlow('login', data);
    expect(out.name).toBe('auth-flow');
  });

  it('lists data flows', () => {
    const out = listDataFlows(data);
    expect(out[0].name).toBe('auth-flow');
  });

  it('filters by module and function', () => {
    expect(findFlowsByModule('auth', data)).toHaveLength(1);
    expect(findFlowsByFunction('login', data)).toHaveLength(1);
  });
});

