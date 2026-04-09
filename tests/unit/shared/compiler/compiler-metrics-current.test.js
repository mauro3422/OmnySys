import { describe, expect, it } from 'vitest';

import { buildBehaviorScore } from '../../../../src/shared/compiler/metrics-current/index.js';

describe('compiler metrics behavior score', () => {
  it('surfaces explicit blocker gates when drift is blocked', () => {
    const behavior = buildBehaviorScore(
      {
        healthScore: 100,
        issueCount: 0,
        structuralGroups: 0,
        conceptualGroups: 0,
        pipelineOrphans: 0,
        watcherAlertCount: 0,
        recentWarningCount: 1,
        recentErrorCount: 0,
        phase2PendingFiles: 0,
        namingDebt: 0,
        flatFamilies: 0,
        liveCoverageRatio: 1,
        databaseTrustworthy: true,
        clientSyncState: 'watchful',
        activeAtomsDriftState: 'fresh'
      },
      {
        progressScore: 0
      },
      {
        status: 'blocked',
        healthy: false,
        trustworthy: false,
        summary: {
          total: 1,
          fresh: 0,
          partial: 0,
          stale: 0,
          missing: 0,
          blocked: 1,
          nextAction: 'Route freshness, coverage and drift checks through the canonical data gateway contract before reading raw tables directly.',
          primaryIssue: {
            key: 'policy_drift',
            label: 'Policy drift',
            state: 'blocked',
            severity: 'high',
            reason: '6 data_gateway policy finding(s) detect raw DB access or freshness bypasses.',
            recommendation: 'Route freshness, coverage and drift checks through the canonical data gateway contract before reading raw tables directly.'
          }
        },
        signals: [],
        recommendations: [
          'Route freshness, coverage and drift checks through the canonical data gateway contract before reading raw tables directly.'
        ]
      },
      null
    );

    expect(behavior.behaviorState).toBe('blocked');
    expect(behavior.readinessReason).toContain('data_gateway policy finding');
    expect(behavior.behaviorGateSummary.blockerCount).toBe(1);
    expect(behavior.behaviorGateSummary.primaryBlocker.gate).toBe('drift_assessment');
    expect(behavior.blockedBy.map((item) => item.gate)).toContain('drift_assessment');
    expect(behavior.watchSignals.map((item) => item.gate)).toContain('recent_warnings');
  });
});
