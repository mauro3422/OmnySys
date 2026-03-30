import { describe, expect, it } from 'vitest';

import {
  buildCompilerHealthDashboard,
  summarizeCompilerHealthDashboard
} from '../../../../src/shared/compiler/compiler-health-dashboard.js';

describe('compiler-health-dashboard', () => {
  it('builds a compact health dashboard with regressions, improvements and telemetry', () => {
    const dashboard = buildCompilerHealthDashboard(
      {
        projectPath: 'C:/Dev/OmnySystem',
        scopePath: 'src/core/file-watcher/guards',
        focusPath: 'src/core/file-watcher/guards/integrity-guard',
        snapshotKind: 'dashboard',
        captureSource: 'test',
        capturedAt: '2026-03-30T01:38:18.819Z',
        current: {
          healthScore: 97,
          healthGrade: 'A+',
          successScore: 91,
          successThreshold: 85,
          mvpReady: true,
          behaviorState: 'ready',
          readinessReason: 'System satisfies the current MVP success threshold.',
          driftState: 'stable',
          driftScore: 98,
          stabilityScore: 95,
          issueCount: 2,
          structuralGroups: 1,
          conceptualGroups: 0,
          pipelineOrphans: 0,
          folderizationCandidateCount: 3,
          flatFamilies: 10,
          mixedFamilies: 2,
          alreadyFolderizedFamilies: 20,
          namingFamilies: 14,
          namingTargets: 18,
          namingDebt: 18,
          liveCoverageRatio: 0.99,
          zeroAtomFileCount: 1,
          callLinks: 120,
          semanticLinks: 42,
          watcherAlertCount: 1,
          recentWarningCount: 1,
          recentErrorCount: 0,
          phase2PendingFiles: 2,
          toolTelemetry: {
            totalRuns: 10,
            successfulRuns: 8,
            repairedRuns: 6,
            thrashingRuns: 1,
            repairYield: 0.6,
            toolSuccessRate: 0.8,
            alertClearanceRate: 0.7,
            errorClearanceRate: 0.9,
            averageDurationMs: 120,
            averageRepairScore: 8.5,
            lastRunAt: '2026-03-30T01:00:00.000Z',
            lastSuccessfulRunAt: '2026-03-30T01:01:00.000Z',
            topTools: [{ toolName: 'mcp_omnysystem_get_health_snapshot', repairScore: 9 }]
          },
          summaryText: 'health=97/A+ | success=91/85 ready'
        },
        trend: {
          status: 'improving',
          summary: 'health +5, issues -2',
          progressScore: 4,
          velocityPerDay: 1.5,
          improvingStreak: true,
          behaviorTrend: 2,
          daysSincePrevious: 1,
          daysSinceBaseline: 3,
          deltaSinceBaseline: {
            healthScore: 5,
            issueCount: 1,
            structuralGroups: 1,
            conceptualGroups: 0,
            pipelineOrphans: -1,
            namingTargets: -4,
            namingDebt: -4,
            flatFamilies: -2,
            liveCoverageRatio: 0.02,
            recentErrorCount: 1,
            recentWarningCount: -1,
            watcherAlertCount: 1,
            phase2PendingFiles: -1,
            alreadyFolderizedFamilies: 2
          }
        },
        history: {
          entries: [
            { capturedAt: '2026-03-30T01:38:18.819Z' },
            { capturedAt: '2026-03-29T01:38:18.819Z' }
          ],
          latest: { capturedAt: '2026-03-30T01:38:18.819Z' },
          previous: { capturedAt: '2026-03-29T01:38:18.819Z' },
          baseline: { capturedAt: '2026-03-27T01:38:18.819Z' }
        }
      },
      {
        databaseHealth: {
          summary: {
            nextAction: 'Reconcile canonical rows'
          }
        },
        folderization: {
          creationGuidance: {
            guidance: 'Reuse the current folderized family'
          }
        },
        metadataExtractionCoverage: {
          summary: {
            nextAction: 'Fill missing metadata fields'
          }
        }
      },
      {
        watcherAlerts: [{ severity: 'high', message: 'drift' }],
        recentErrors: {
          summary: {
            total: 1,
            warnings: 1,
            errors: 0
          },
          logs: [{ level: 'warning', message: 'watcher drift', time: '2026-03-30T01:37:00.000Z' }]
        }
      }
    );

    expect(dashboard.health.mvpReady).toBe(true);
    expect(dashboard.status).toBe('ready');
    expect(dashboard.regressors[0].metric).toBe('recentErrorCount');
    expect(dashboard.improvements[0].metric).toBe('healthScore');
    expect(dashboard.toolTelemetry.totalRuns).toBe(10);
    expect(dashboard.recommendations.length).toBeGreaterThan(0);

    const compact = summarizeCompilerHealthDashboard(dashboard);
    expect(compact.health.successScore).toBe(91);
    expect(compact.trend.velocityPerDay).toBe(1.5);
    expect(compact.regressors.length).toBeGreaterThan(0);
    expect(compact.recentErrors.errors).toBe(0);
  });
});
