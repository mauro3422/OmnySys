import { describe, expect, it } from 'vitest';

import { buildCompilerMetricsSnapshotSummary } from '../../../../src/shared/compiler/metrics/snapshot-summary-text.js';
import { validateSnapshotSummaryCoherence } from '../../../../src/shared/compiler/metric-coherence-validator.js';

describe('compiler metrics snapshot summary text', () => {
  it('builds the canonical high-level summary from current metrics and trend state', () => {
    const summary = buildCompilerMetricsSnapshotSummary(
      {
        globalHealthScore: 98.4,
        globalHealthGrade: 'A+',
        healthScore: 97,
        healthGrade: 'A+',
        reliabilityScore: 94.2,
        reliabilityGrade: 'A',
        successScore: 91.4,
        successThreshold: 85,
        mvpReady: true,
        behaviorState: 'watchful',
        activeAtomsDriftState: 'fresh',
        clientSyncState: 'blocked',
        toolTelemetry: {
          totalRuns: 6,
          successfulRuns: 5,
          pressureRuns: 2,
          repairedRuns: 1
        },
        structuralGroups: 2,
        conceptualGroups: 1,
        alreadyFolderizedFamilies: 3,
        flatFamilies: 4,
        mixedFamilies: 1,
        liveCoverageRatio: 0.98
      },
      {
        summary: 'trend=stable',
        progressScore: 12.5,
        velocityPerDay: 3.1
      }
    );

    expect(summary).toContain('Health 98/A+');
    expect(summary).toContain('db=97/A+');
    expect(summary).toContain('trust=94/A');
    expect(summary).toContain('trend=stable');
    expect(summary).toContain('success=91/85 ready');
    expect(summary).toContain('clientsync=blocked');
    expect(summary).toContain('tools=5/6 ok');
    expect(summary).toContain('repair=1/2');
    expect(summary).toContain('dups=3');
    expect(summary).toContain('folder=3/8');
    expect(summary).toContain('coverage=98%');
  });

  it('detects when a persisted snapshot summary drifts from the canonical builder output', () => {
    const snapshot = {
      current: {
        globalHealthScore: 98.4,
        globalHealthGrade: 'A+',
        healthScore: 97,
        healthGrade: 'A+',
        reliabilityScore: 94.2,
        reliabilityGrade: 'A',
        successScore: 91.4,
        successThreshold: 85,
        mvpReady: true,
        behaviorState: 'watchful',
        activeAtomsDriftState: 'fresh',
        clientSyncState: 'blocked',
        toolTelemetry: {
          totalRuns: 6,
          successfulRuns: 5,
          pressureRuns: 2,
          repairedRuns: 1
        },
        structuralGroups: 2,
        conceptualGroups: 1,
        alreadyFolderizedFamilies: 3,
        flatFamilies: 4,
        mixedFamilies: 1,
        liveCoverageRatio: 0.98,
        summaryText: 'Health 98/A+ | db=97/A+ | trust=94/A | trend=stable'
      },
      trend: {
        summary: 'trend=stable',
        progressScore: 12.5,
        velocityPerDay: 3.1
      },
      summary: 'Health 98/A+ | db=97/A+ | trust=94/A | trend=drifted'
    };

    const coherence = validateSnapshotSummaryCoherence(snapshot);

    expect(coherence.coherent).toBe(false);
    expect(coherence.severity).toBe('medium');
    expect(coherence.reason).toContain('does not match');
    expect(coherence.expectedSummary).toContain('trend=stable');
    expect(coherence.actualSummary).toContain('trend=drifted');
  });
});
