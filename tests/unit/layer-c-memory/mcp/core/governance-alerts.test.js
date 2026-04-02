import { describe, expect, it } from 'vitest';

import {
  buildGovernanceAlerts,
  mergeRecentNotificationsWithGovernanceAlerts
} from '../../../../../src/layer-c-memory/mcp/core/governance-alerts.js';

describe('governance alerts', () => {
  it('builds watcher alerts for blocked policy drift and metadata extraction gaps', () => {
    const governance = buildGovernanceAlerts({
      compilerExplainability: {
        driftAssessment: {
          status: 'blocked',
          nextAction: 'Route drift checks through the canonical data gateway contract.',
          recommendations: ['Route drift checks through the canonical data gateway contract.'],
          signals: [
            {
              key: 'policy_drift',
              state: 'blocked',
              reason: '6 data_gateway policy finding(s) detect raw DB access or freshness bypasses.',
              recommendation: 'Route freshness checks through the canonical data gateway contract.'
            },
            {
              key: 'metadata_extraction_coverage',
              state: 'stale',
              reason: 'Review atoms.test_callback_type before trusting downstream metadata consumers.',
              recommendation: 'Review atoms.test_callback_type before trusting downstream metadata consumers.'
            }
          ]
        }
      },
      source: 'status'
    });

    expect(governance.watcherAlerts).toHaveLength(2);
    expect(governance.watcherAlerts.map((alert) => alert.issueType)).toEqual([
      'policy_drift',
      'metadata_extraction_coverage'
    ]);
    expect(governance.logs.map((entry) => entry.level)).toEqual(['error', 'warn']);
  });

  it('merges governance alerts into recent notifications', () => {
    const merged = mergeRecentNotificationsWithGovernanceAlerts(
      {
        count: 0,
        warnings: 0,
        errors: 0,
        logs: [],
        watcherAlerts: []
      },
      buildGovernanceAlerts({
        compilerExplainability: {
          driftAssessment: {
            status: 'blocked',
            nextAction: 'Route drift checks through the canonical data gateway contract.',
            recommendations: ['Route drift checks through the canonical data gateway contract.'],
            signals: [
              {
                key: 'policy_drift',
                state: 'blocked',
                reason: '6 data_gateway policy finding(s) detect raw DB access or freshness bypasses.',
                recommendation: 'Route freshness checks through the canonical data gateway contract.'
              }
            ]
          }
        },
        source: 'status'
      })
    );

    expect(merged.count).toBeGreaterThan(0);
    expect(merged.watcherAlerts).toHaveLength(1);
    expect(merged.watcherAlerts[0].issueType).toBe('policy_drift');
    expect(merged.logs[0].message).toContain('policy_drift blocked');
  });
});
