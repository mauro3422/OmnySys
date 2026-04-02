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
  });
});
