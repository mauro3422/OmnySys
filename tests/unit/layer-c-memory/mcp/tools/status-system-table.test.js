import { describe, expect, it } from 'vitest';

import { buildSystemTableSummary } from '../../../../../src/layer-c-memory/mcp/tools/status-system-table.js';

describe('status system table', () => {
  it('shows cache policy counts and hot-path indicators', () => {
    const summary = buildSystemTableSummary({
      initialized: true,
      telemetryMode: 'full',
      project: 'C:/Dev/OmnySystem',
      databaseHealth: {
        healthy: true,
        healthScore: 100,
        grade: 'A+',
        summary: 'Database projections are aligned'
      },
      repository: {
        status: {
          dbOpen: true,
          journal: {
            queued: 0
          }
        },
        integrity: {
          healthy: true
        }
      },
      metadata: {
        liveFileCount: 2456,
        phase2PendingFiles: 0,
        phase2CompletedFiles: 2456
      },
      metricsSnapshot: {
        current: {
          behaviorState: 'blocked',
          recentErrorCount: 1,
          structuralGroups: 2,
          conceptualGroups: 1,
          pipelineOrphans: 0,
          namingDebt: 10,
          driftState: 'blocked',
          driftScore: 70,
          readinessReason: 'blocked',
          snapshotFingerprint: 'abc123',
          behaviorGateSummary: {
            blockerCount: 2,
            primaryBlocker: {
              gate: 'drift_assessment'
            }
          },
          behaviorBlockers: [
            { gate: 'drift_assessment' },
            { gate: 'recent_errors' }
          ],
          primaryBehaviorBlocker: {
            gate: 'drift_assessment'
          }
        }
      },
      watcher: {
        isRunning: true,
        pendingChanges: 0,
        failedChanges: 1,
        lastChangeOrigin: 'src/example.js'
      },
      recentErrors: {
        summary: {
          total: 1,
          warnings: 1,
          errors: 0
        }
      },
      cache: {
        files: 2456,
        status: 'aligned'
      },
      toolInventory: {
        totalTools: 40,
        dominantCategory: 'action',
        concentration: 50
      },
      background: {
        mcpSessionSummary: {
          totalPersistentActive: 2,
          totalPersistent: 4,
          uniqueClients: 2,
          clientSyncState: 'watchful'
        }
      },
      cachePolicy: {
        decision: 'freshness-first',
        stableSnapshot: false,
        hotPathDetected: true,
        whereToCache: [
          { surface: 'technical_debt_report' },
          { surface: 'compiler_metrics_snapshot' }
        ],
        whereNotToCache: [
          { surface: 'databaseHealth / execute_sql' }
        ],
        signals: {
          recentErrors: {
            errors: 1
          },
          metrics: {
            toolTelemetry: {
              thrashingRuns: 4
            }
          }
        }
      }
    });

    const cacheRow = summary.rows.find((row) => row.area === 'Cache');

    expect(cacheRow).toMatchObject({
      area: 'Cache',
      state: 'freshness-first',
      source: 'cache policy advisor'
    });
    expect(cacheRow.detail).toContain('2 cache targets');
    expect(cacheRow.detail).toContain('no-cache=1');
    expect(cacheRow.detail).toContain('hot=yes');
    expect(cacheRow.detail).toContain('thrash=4');
    expect(cacheRow.detail).toContain('recent=1 err');

    const behaviorRow = summary.rows.find((row) => row.area === 'Behavior');
    expect(behaviorRow).toMatchObject({
      area: 'Behavior',
      state: 'blocked',
      source: 'behavior gate summary'
    });
    expect(behaviorRow.detail).toContain('blockers=2');
    expect(behaviorRow.detail).toContain('primary=drift_assessment');
    expect(behaviorRow.detail).toContain('reason=blocked');

    const updateRow = summary.rows.find((row) => row.area === 'Update');
    expect(updateRow).toMatchObject({
      area: 'Update',
      state: 'syncing',
      source: 'atom/function update pipeline'
    });
    expect(updateRow.detail).toContain('files=2456');
    expect(updateRow.detail).toContain('mirror=2456');
    expect(updateRow.detail).toContain('deps=0');
    expect(updateRow.detail).toContain('pending=0');
    expect(updateRow.detail).toContain('watcher=0/1');
    expect(updateRow.detail).toContain('journal=0');
    expect(updateRow.detail).toContain('integrity=ok');

    const areas = summary.rows.map((row) => row.area);
    expect(areas).toEqual([
      'Daemon',
      'Database',
      'Snapshots',
      'Update',
      'Behavior',
      'Drift',
      'Debt',
      'Sessions',
      'Tools',
      'Cache',
      'Watcher',
      'Errors'
    ]);

    const errorsRow = summary.rows.find((row) => row.area === 'Errors');
    expect(errorsRow).toMatchObject({
      area: 'Errors',
      state: 'watching',
      source: 'recent_errors'
    });
    expect(errorsRow.detail).toContain('warnings=1');
    expect(errorsRow.detail).toContain('errors=0');
  });
});
