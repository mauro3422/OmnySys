import { describe, it, expect } from 'vitest';
import * as queries from '../../../../../src/layer-a-static/module-system/queries/index.js';

describe('module-system/queries/index.js', () => {
  it('exports impact and dataflow query API', () => {
    expect(typeof queries.queryImpact).toBe('function');
    expect(typeof queries.calculateImpactRisk).toBe('function');
    expect(typeof queries.summarizeImpact).toBe('function');
    expect(typeof queries.queryDataFlow).toBe('function');
    expect(typeof queries.listDataFlows).toBe('function');
    expect(typeof queries.findFlowsByModule).toBe('function');
    expect(typeof queries.findFlowsByFunction).toBe('function');
  });
});

