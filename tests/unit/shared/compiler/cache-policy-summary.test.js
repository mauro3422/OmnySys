import { describe, expect, it } from 'vitest';

import { buildCachePolicySummary } from '../../../../src/shared/compiler/cache-policy/summary.js';

describe('cache policy summary', () => {
  it('surfaces explicit cache and no-cache guidance with tool telemetry signals', () => {
    const summary = buildCachePolicySummary({
      recentErrors: {
        summary: {
          total: 2,
          warnings: 1,
          errors: 1
        },
        watcherAlerts: [
          {
            level: 'warn',
            severity: 'medium',
            issueType: 'drift',
            filePath: 'src/example.js',
            message: 'Example alert'
          }
        ]
      },
      databaseHealth: {
        healthy: true,
        healthScore: 100,
        grade: 'A+'
      },
      metricsSnapshot: {
        current: {
          snapshotFingerprint: 'abc123',
          phase2PendingFiles: 0,
          recentErrorCount: 0,
          watcherAlertCount: 0,
          behaviorState: 'ready',
          clientSyncState: 'watchful',
          namingDebt: 12,
          structuralGroups: 1,
          conceptualGroups: 0,
          toolTelemetry: {
            totalRuns: 80,
            successfulRuns: 76,
            failedRuns: 4,
            repairedRuns: 3,
            thrashingRuns: 4,
            stableRuns: 60,
            comparableRuns: 70,
            observationRuns: 78,
            pressureRuns: 6,
            clearanceRuns: 5,
            repairYield: 0.04,
            repairRateOnPressure: 0.5,
            observationRate: 0.98,
            toolSuccessRate: 0.95,
            alertClearanceRate: 0.25,
            errorClearanceRate: 0.5,
            averageDurationMs: 6100,
            averageRepairScore: 0.8,
            lastRunAt: '2026-04-02T18:00:00.000Z',
            lastSuccessfulRunAt: '2026-04-02T18:05:00.000Z',
            noiseSummary: {
              totalRuns: 80,
              noisyRunCount: 36,
              noisyToolCount: 2,
              noiseRate: 0.45,
              noiseScore: 62,
              noiseTopTools: [
                {
                  toolName: 'mcp_omnysystem_get_technical_debt_report',
                  runCount: 10,
                  successRate: 1,
                  avgRepairScore: 0,
                  noiseScore: 82,
                  noiseLevel: 'high',
                  noiseReasons: ['slow-critical', 'observation-only']
                }
              ],
              topReasons: [
                { reason: 'slow-critical', count: 18 }
              ]
            },
            topTools: [
              {
                toolName: 'mcp_omnysystem_get_technical_debt_report',
                runCount: 10,
                successRate: 1,
                avgRepairScore: 0,
                lastRunAt: '2026-04-02T18:05:00.000Z',
                noise: {
                  toolName: 'mcp_omnysystem_get_technical_debt_report',
                  runCount: 10,
                  successRate: 1,
                  repairedCount: 0,
                  thrashingCount: 0,
                  stableCount: 0,
                  pressureCount: 0,
                  observationCount: 0,
                  clearanceCount: 0,
                  avgDurationMs: 28600,
                  avgRepairScore: 0,
                  observationOnly: true,
                  noiseScore: 82,
                  noiseLevel: 'high',
                  noiseReasons: ['slow-critical', 'observation-only']
                }
              }
            ]
          }
        },
        daily: {
          healthScore: 97,
          healthGrade: 'A',
          driftScore: 70,
          behaviorState: 'blocked',
          clientSyncState: 'watchful'
        },
        lifetime: {
          daysObserved: 7,
          snapshotsRecorded: 7,
          averageHealthScore: 96,
          averageDriftScore: 68,
          averageSuccessScore: 82
        }
      },
      toolInventory: {
        totalTools: 40,
        dominantCategory: {
          category: 'action'
        },
        concentration: 50,
        recommendations: [
          {
            category: 'action',
            reason: 'dense action bucket',
            suggestion: 'split action tools'
          }
        ]
      },
      watcher: {
        isRunning: true,
        pendingChanges: 0,
        failedChanges: 1,
        lastChangeOrigin: 'src/example.js'
      },
      mcpSessions: {
        totalPersistentActive: 2,
        totalPersistent: 4,
        uniqueClients: 2,
        clientSyncState: 'watchful'
      }
    });

    expect(summary.decision).toBe('freshness-first');
    expect(summary.hotPathDetected).toBe(true);
    expect(summary.whereToCache.map((item) => item.surface)).toEqual([
      'folderization propagation / propagation-engine',
      'technical_debt_report',
      'compiler_metrics_snapshot',
      'aggregate_metrics / pipeline_health / duplicates',
      'tool_run_telemetry / diagnose_tool_health',
      'get_server_status'
    ]);
    expect(summary.whereNotToCache.map((item) => item.surface)).toContain('databaseHealth / execute_sql');
    expect(summary.whereNotToCache.map((item) => item.surface)).toContain('recentErrors / watcherAlerts');
    expect(summary.signals.recentErrors.errors).toBe(1);
    expect(summary.signals.metrics.toolTelemetry.thrashingRuns).toBe(4);
    expect(summary.signals.metrics.toolTelemetry.noiseSummary.noisyToolCount).toBe(2);
    expect(summary.signals.metrics.toolTelemetry.cachePolicySummary.tierCounts.fingerprintCache).toBeGreaterThan(0);
    expect(summary.signals.metrics.toolTelemetry.cachePolicySummary.topTools[0].cacheTier).toBe('fingerprint-cache');
    expect(summary.recurringHotspots.hotspots.length).toBeGreaterThanOrEqual(2);
    expect(summary.recurringHotspots.topTools[0].toolName).toBe('mcp_omnysystem_get_technical_debt_report');
    expect(summary.recurringHotspots.hotspots.some((item) => item.signal === 'operational noise')).toBe(true);
    expect(summary.targets).toHaveLength(summary.whereToCache.length);
    expect(summary.summary).toContain('Cache fingerprinted snapshots');
    expect(summary.why).toContain('Fingerprint-led surfaces');
  });
});
