import { describe, expect, it } from 'vitest';

import {
  buildMetricAlignmentSignal,
  summarizeMetricAlignment
} from '../../../../src/shared/compiler/metric-alignment-summary.js';

describe('metric-alignment-summary', () => {
  it('reports aligned when schema, metadata and inventory agree', () => {
    const alignment = buildMetricAlignmentSignal({
      compilerExplainability: {
        databaseHealth: {
          healthy: true
        },
        metadataExtractionCoverage: {
          summary: {
            coveragePct: 98,
            fieldCoveragePct: 98
          }
        }
      },
      systemInventory: {
        metadataCoveragePct: 98,
        policyCoverage: {
          coverageState: 'fresh',
          propagationExpansionState: 'fresh'
        }
      },
      bridgeCallReliability: {
        state: 'stable'
      }
    });

    expect(alignment.state).toBe('aligned');
    expect(alignment.healthy).toBe(true);
    expect(alignment.coverage.driftPct).toBe(0);
    expect(summarizeMetricAlignment(alignment)).toMatchObject({
      state: 'aligned',
      trustworthy: true,
      bridgeState: 'stable'
    });
  });

  it('reports drifting when field coverage and inventory summary diverge', () => {
    const alignment = buildMetricAlignmentSignal({
      compilerExplainability: {
        databaseHealth: {
          healthy: true
        },
        metadataExtractionCoverage: {
          summary: {
            coveragePct: 98,
            fieldCoveragePct: 98
          }
        }
      },
      systemInventory: {
        metadataCoveragePct: 84,
        policyCoverage: {
          coverageState: 'watching',
          propagationExpansionState: 'stale'
        }
      },
      bridgeCallReliability: {
        state: 'thrashing'
      }
    });

    expect(alignment.state).toBe('drifting');
    expect(alignment.coverage.driftPct).toBe(14);
    expect(alignment.reason).toContain('metadata coverage drifts');
    expect(summarizeMetricAlignment(alignment)).toMatchObject({
      state: 'drifting',
      bridgeState: 'thrashing'
    });
  });
});
