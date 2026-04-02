import { describe, expect, it } from 'vitest';

import {
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
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
        metricDictionary: {
          global: {
            score: 89,
            grade: 'B+'
          },
          layers: {
            runtime: { score: 82, grade: 'B-' }
          },
          metrics: {
            globalHealthScore: { value: 93, sourceTables: ['atoms'] }
          }
        },
        healthArchive: {
          daysObserved: 12,
          snapshotsRecorded: 12,
          firstCapturedAt: '2026-03-01T00:00:00.000Z',
          lastCapturedAt: '2026-03-30T01:38:18.819Z',
          averageHealthScore: 92.5,
          averageDriftScore: 94,
          averageStabilityScore: 93,
          averageSuccessScore: 90,
          totalIssueCount: 42,
          totalWarningCount: 6,
          totalErrorCount: 1,
          totalWatcherAlertCount: 3,
          latestHealthScore: 97,
          latestHealthGrade: 'A+',
          latestBehaviorState: 'ready',
          latestClientSyncState: 'fresh',
          summary: 'days=12 | avgHealth=93 | avgSuccess=90 | errors=1 | warnings=6'
        },
        current: {
          globalHealthScore: 93,
          globalHealthGrade: 'A',
          healthScore: 97,
          healthGrade: 'A+',
          reliabilityScore: 89,
          reliabilityGrade: 'B+',
          reliabilityState: 'watchful',
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
          metadataCoveragePct: 79,
          metadataFieldCoveragePct: 93,
          dataGatewayTrustworthy: true,
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
            comparableRuns: 9,
            observationRuns: 10,
            pressureRuns: 7,
            clearanceRuns: 6,
            repairYield: 0.6,
            repairRateOnPressure: 0.86,
            observationRate: 1,
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
    expect(dashboard.health.globalHealthScore).toBe(93);
    expect(dashboard.health.reliabilityScore).toBe(89);
    expect(dashboard.metricDictionary.global.grade).toBe('B+');
    expect(dashboard.regressors[0].metric).toBe('recentErrorCount');
    expect(dashboard.improvements[0].metric).toBe('healthScore');
    expect(dashboard.toolTelemetry.totalRuns).toBe(10);
    expect(dashboard.toolTelemetry.repairRateOnPressure).toBe(0.86);
    expect(dashboard.recommendations.length).toBeGreaterThan(0);
    expect(dashboard.archive.daily.capturedAt).toBe('2026-03-30T01:38:18.819Z');
    expect(dashboard.archive.lifetime.daysObserved).toBe(12);
    expect(dashboard.archive.lifetime.firstCapturedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(dashboard.archive.lifetime.lastCapturedAt).toBe('2026-03-30T01:38:18.819Z');
    expect(dashboard.archive.lifetime.averageHealthScore).toBe(92.5);

    const compact = summarizeCompilerHealthDashboard(dashboard);
    expect(compact.health.globalHealthScore).toBe(93);
    expect(compact.health.reliabilityGrade).toBe('B+');
    expect(compact.health.successScore).toBe(91);
    expect(compact.trend.velocityPerDay).toBe(1.5);
    expect(compact.regressors.length).toBeGreaterThan(0);
    expect(compact.recentErrors.errors).toBe(0);
    expect(compact.archive.lifetime.daysObserved).toBe(12);
    expect(compact.archive.daily.healthScore).toBe(97);
  });

  it('builds a one-line health panel from the dashboard', () => {
    const dashboard = buildCompilerHealthDashboard({
      projectPath: 'C:/Dev/OmnySystem',
      current: {
        globalHealthScore: 81,
        globalHealthGrade: 'B-',
        healthScore: 88,
        healthGrade: 'A',
        reliabilityScore: 73,
        reliabilityGrade: 'C',
        reliabilityState: 'limited',
        successScore: 84,
        successThreshold: 85,
        mvpReady: false,
        behaviorState: 'watchful',
        driftState: 'stable',
        driftScore: 90,
        stabilityScore: 86,
        clientSyncState: 'blocked',
        clientSyncReason: 'client cache drift detected',
        clientSyncRecommendation: 'Refresh the client UI and verify the MCP catalog.',
        readinessReason: 'Success score 84 is below the 85 threshold.',
        toolTelemetry: {
          totalRuns: 4,
          successfulRuns: 3,
          repairedRuns: 1,
          pressureRuns: 2,
          repairYield: 0.5,
          repairRateOnPressure: 0.5,
          toolSuccessRate: 0.75,
          alertClearanceRate: 0.5,
          errorClearanceRate: 0.5,
          topTools: [{ toolName: 'mcp_omnysystem_get_health_snapshot', repairScore: 8 }]
        },
        summaryText: 'health=88/A | success=84/85'
      },
      trend: {
        status: 'improving',
        velocityPerDay: 2,
        progressScore: 3,
        improvingStreak: true,
        behaviorTrend: 1,
        summary: 'health +3'
      }
    }, null, {});

    const panel = buildCompilerHealthPanel(dashboard);

    expect(panel.headline).toContain('B- 81/85');
    expect(panel.oneLine).toContain('now=81/B-');
    expect(panel.oneLine).toContain('db=88/A');
    expect(panel.oneLine).toContain('trust=73/C');
    expect(panel.oneLine).toContain('clientsync=blocked');
    expect(panel.oneLine).toContain('tools=3/4 ok');
    expect(panel.oneLine).toContain('repair=1/2');
    expect(panel.topRegressors).toEqual([]);
    expect(panel.topImprovements).toEqual([]);

    const compact = summarizeCompilerHealthPanel(panel);
    expect(compact.now.globalHealthScore).toBe(81);
    expect(compact.now.healthScore).toBe(88);
    expect(compact.trend.velocityPerDay).toBe(2);
    expect(compact.oneLine).toContain('ready=no');
  });
});
