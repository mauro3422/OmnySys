import { describe, it, expect } from 'vitest';
import { queryImpact, calculateImpactRisk, summarizeImpact } from '../../../../../src/layer-a-static/module-system/queries/impact-query.js';

const data = {
  modules: [{
    moduleName: 'auth',
    internalChains: [{ id: 'c1', steps: [{ function: 'login', file: 'login.js' }] }]
  }],
  system: {
    businessFlows: [{ name: 'auth-flow', steps: [{ function: 'login', order: 1 }] }]
  }
};

describe('module-system/queries/impact-query.js', () => {
  it('returns local and global impact', () => {
    const out = queryImpact('login', data);
    expect(out.local.module).toBe('auth');
    expect(out.global.businessFlows).toHaveLength(1);
  });

  it('calculates risk for impact result', () => {
    const risk = calculateImpactRisk({ local: { chains: ['a'], files: ['a.js'] }, global: { businessFlows: [] } });
    expect(['low', 'medium', 'high', 'critical']).toContain(risk);
  });

  it('summarizes impact', () => {
    const txt = summarizeImpact({ local: { module: 'auth', files: ['a.js'], chains: ['c1'] }, global: { businessFlows: [{ name: 'f' }] } });
    expect(txt).toContain('auth');
    expect(txt).toContain('Business flows afectados: 1');
  });
});

