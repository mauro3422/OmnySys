import { describe, expect, it } from 'vitest';

import {
  buildCompilerPolicyIssueSummary,
  summarizeCompilerPolicyDrift
} from '../../../../src/shared/compiler/policy-conformance-summary.js';

describe('policy-conformance-summary', () => {
  it('separates total findings from active drift findings', () => {
    const summary = summarizeCompilerPolicyDrift([
      { severity: 'high', policyArea: 'data_gateway', rule: 'raw-db-access' },
      { severity: 'medium', policyArea: 'propagation_expansion', rule: 'missing-surface' },
      { severity: 'medium', policyArea: 'propagation_expansion', rule: 'missing-adoption' },
      { severity: 'low', policyArea: 'watcher_diagnostics', rule: 'advisory-only' }
    ]);

    expect(summary.total).toBe(4);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(2);
    expect(summary.active).toBe(3);
    expect(summary.byPolicyArea.data_gateway).toBe(1);
    expect(summary.byPolicyArea.propagation_expansion).toBe(2);
  });

  it('keeps issue summaries readable with the full finding count', () => {
    const issueSummary = buildCompilerPolicyIssueSummary([
      { severity: 'high', rule: 'raw-db-access', reuseGuidance: 'Route through the gateway.' },
      { severity: 'medium', rule: 'missing-surface' }
    ]);

    expect(issueSummary.summary.total).toBe(2);
    expect(issueSummary.message).toContain('2 compiler policy drift finding(s)');
    expect(issueSummary.sampleRules).toContain('raw-db-access');
    expect(issueSummary.reuseGuidance).toContain('Route through the gateway.');
  });
});
