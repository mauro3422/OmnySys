import { describe, expect, it } from 'vitest';

import { buildCompilerPolicyCoverageSummary } from '../../../../src/shared/compiler/policy-coverage-summary.js';

describe('policy-coverage-summary', () => {
  it('derives a customs-gate style coverage summary from inventory drift', () => {
    const summary = buildCompilerPolicyCoverageSummary({
      inventory: {
        summary: {
          inventoryState: 'watching',
          totalSystemCount: 8,
          canonicalSurfaceCount: 4,
          canonicalEntrypointCount: 2,
          bridgeSystemCount: 1,
          wrapperSystemCount: 1,
          emergentSystemCount: 0,
          policyDriftCount: 100,
          propagationExpansionState: 'stale',
          nextAction: 'Attach the canonical propagation plan.'
        }
      }
    });

    expect(summary.coverageState).toBe('stale');
    expect(summary.coverageScore).toBe(0);
    expect(summary.policyDriftCount).toBe(100);
    expect(summary.propagationExpansionState).toBe('stale');
    expect(summary.summaryText).toContain('coverage=stale');
    expect(summary.summaryText).toContain('drift=100');
  });

  it('includes metadata and integration coverage in the summary signal text', () => {
    const summary = buildCompilerPolicyCoverageSummary({
      inventory: {
        summary: {
          totalSystemCount: 4,
          canonicalSurfaceCount: 2,
          canonicalEntrypointCount: 1,
          bridgeSystemCount: 1,
          wrapperSystemCount: 0,
          emergentSystemCount: 0,
          policyDriftCount: 0,
          propagationExpansionState: 'fresh',
          metadataCoveragePct: 72,
          integrationCoveragePct: 68
        }
      }
    });

    expect(summary.coverageState).toBe('watching');
    expect(summary.summaryText).toContain('meta=72%');
    expect(summary.summaryText).toContain('integration=68%');
  });
});
