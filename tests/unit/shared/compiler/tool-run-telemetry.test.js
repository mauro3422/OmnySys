import { describe, expect, it, vi } from 'vitest';
import {
  buildToolRunTelemetrySummary,
  evaluateToolRunTelemetry,
  persistToolRunTelemetry
} from '../../../../src/shared/compiler/tool-run-telemetry.js';

function createDbMock() {
  return {
    prepare: vi.fn((sql) => {
      if (sql.includes('COUNT(*) as total_runs') && sql.includes('FROM mcp_tool_runs')) {
        return {
          get: vi.fn(() => ({
            total_runs: 8,
            successful_runs: 7,
            failed_runs: 1,
            repaired_runs: 5,
            thrashing_runs: 1,
            stable_runs: 2,
            comparable_runs: 6,
            pressure_runs: 6,
            observation_runs: 8,
            alert_clearance_runs: 4,
            error_clearance_runs: 3,
            clearance_runs: 5,
            avg_duration_ms: 412.5,
            avg_repair_score: 9.75,
            last_run_at: '2026-03-30T10:00:00.000Z',
            last_successful_run_at: '2026-03-30T09:55:00.000Z'
          }))
        };
      }

      if (sql.includes('GROUP BY tool_name')) {
        return {
          all: vi.fn(() => ([
            {
              tool_name: 'mcp_omnysystem_get_metrics_snapshot',
              run_count: 4,
              success_count: 4,
              repaired_count: 3,
              thrashing_count: 1,
              stable_count: 1,
              pressure_count: 3,
              observation_count: 4,
              clearance_count: 2,
              avg_repair_score: 11.5,
              avg_duration_ms: 6400,
              last_run_at: '2026-03-30T10:00:00.000Z'
            },
            {
              tool_name: 'mcp_omnysystem_status',
              run_count: 3,
              success_count: 2,
              repaired_count: 0,
              thrashing_count: 0,
              stable_count: 2,
              pressure_count: 1,
              observation_count: 1,
              clearance_count: 0,
              avg_repair_score: 7.1,
              avg_duration_ms: 900,
              last_run_at: '2026-03-30T09:30:00.000Z'
            }
          ]))
        };
      }

      return {
        get: vi.fn(() => null),
        all: vi.fn(() => [])
      };
    })
  };
}

describe('tool-run-telemetry', () => {
  it('derives repair status from before/after snapshot deltas', () => {
    const telemetry = evaluateToolRunTelemetry({
      projectPath: 'C:/Dev/OmnySystem',
      toolName: 'mcp_omnysystem_atomic_edit',
      transportOrigin: 'stdio_bridge',
      startedAt: '2026-03-30T09:59:00.000Z',
      endedAt: '2026-03-30T10:00:00.000Z',
      success: true,
      beforeSnapshot: {
        current: {
          watcherAlertCount: 5,
          recentErrorCount: 2,
          recentWarningCount: 3,
          issueCount: 18,
          structuralGroups: 4,
          conceptualGroups: 3,
          pipelineOrphans: 2,
          driftScore: 42,
          successScore: 61
        }
      },
      afterSnapshot: {
        current: {
          watcherAlertCount: 1,
          recentErrorCount: 0,
          recentWarningCount: 1,
          issueCount: 12,
          structuralGroups: 1,
          conceptualGroups: 1,
          pipelineOrphans: 0,
          driftScore: 12,
          successScore: 88,
          mvpReady: true
        }
      }
    });

    expect(telemetry.repairStatus).toBe('repaired');
    expect(telemetry.transportOrigin).toBe('stdio_bridge');
    expect(telemetry.deltas.alertClearance).toBe(4);
    expect(telemetry.deltas.errorClearance).toBe(2);
    expect(telemetry.repairScore).toBeGreaterThan(0);
    expect(telemetry.successThresholdMet).toBe(true);
  });

  it('summarizes tool telemetry totals and top tools from SQLite', () => {
    const summary = buildToolRunTelemetrySummary(createDbMock(), {
      projectPath: 'C:/Dev/OmnySystem',
      windowDays: 7
    });

    expect(summary.totalRuns).toBe(8);
    expect(summary.repairYield).toBe(0.63);
    expect(summary.repairRateOnPressure).toBe(0.83);
    expect(summary.observationRate).toBe(1);
    expect(summary.toolSuccessRate).toBe(0.88);
    expect(summary.alertClearanceRate).toBe(0.67);
    expect(summary.topTools).toHaveLength(2);
    expect(summary.topTools[0].toolName).toBe('mcp_omnysystem_get_metrics_snapshot');
    expect(summary.noiseSummary.noisyToolCount).toBe(1);
    expect(summary.noiseSummary.noisyRunCount).toBe(4);
    expect(summary.noiseSummary.noiseTopTools[0].toolName).toBe('mcp_omnysystem_get_metrics_snapshot');
    expect(summary.topTools[0].noise.noiseLevel).toBe('medium');
    expect(summary.topTools[0].cachePolicy.cacheTier).toBe('fingerprint-cache');
    expect(summary.cachePolicySummary.tierCounts.fingerprintCache).toBeGreaterThan(0);
  });

  it('persists telemetry with compact safe JSON payloads', () => {
    let capturedParams = null;
    const circularArgs = { action: 'debug' };
    circularArgs.self = circularArgs;
    const db = {
      prepare: vi.fn(() => ({
        run: vi.fn((params) => {
          capturedParams = params;
          return { changes: 1, lastInsertRowid: 1 };
        })
      }))
    };

    persistToolRunTelemetry(db, {
      projectPath: 'C:/Dev/OmnySystem',
      toolName: 'mcp_omnysystem_get_metrics_snapshot',
      captureSource: 'mcp.tool',
      transportOrigin: 'native_mcp',
      startedAt: '2026-03-30T09:59:00.000Z',
      endedAt: '2026-03-30T10:00:00.000Z',
      durationMs: 60000,
      success: true,
      beforeSnapshot: {
        current: {
          globalHealthScore: 92,
          watcherAlertCount: 5,
          recentErrorCount: 2,
          successScore: 61
        },
        trend: { status: 'watchful' }
      },
      afterSnapshot: {
        current: {
          globalHealthScore: 96,
          watcherAlertCount: 1,
          recentErrorCount: 0,
          successScore: 88
        },
        trend: { status: 'improving' }
      },
      beforeNotifications: {
        count: 3,
        warnings: 1,
        errors: 2,
        watcherSummary: { totalAlerts: 5 }
      },
      afterNotifications: {
        count: 1,
        warnings: 1,
        errors: 0,
        watcherSummary: { totalAlerts: 1 }
      },
      deltas: {
        alertClearance: 4,
        bigintValue: BigInt(3)
      },
      args: circularArgs,
      repairStatus: 'repaired',
      repairScore: 14
    });

    expect(capturedParams).toBeTruthy();
    expect(capturedParams.transport_origin).toBe('native_mcp');
    expect(JSON.parse(capturedParams.before_snapshot_json).current.watcherAlertCount).toBe(5);
    expect(JSON.parse(capturedParams.after_notifications_json).watcherSummary.totalAlerts).toBe(1);
    expect(JSON.parse(capturedParams.delta_json).bigintValue).toBe(3);
    expect(JSON.parse(capturedParams.args_json).self).toBe('[Circular]');
  });
});
