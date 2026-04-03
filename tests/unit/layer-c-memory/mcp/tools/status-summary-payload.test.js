import { describe, expect, it } from 'vitest';

import { buildStatusSummaryPayload } from '../../../../../src/shared/compiler/status-summary-payload.js';

describe('status summary payload', () => {
  it('exposes the update surface alongside the system table', () => {
    const payload = buildStatusSummaryPayload({
      initialized: true,
      telemetryMode: 'full',
      project: 'C:/Dev/OmnySystem',
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
      databaseHealth: {
        healthy: true,
        healthScore: 100,
        grade: 'A+',
        summary: 'Database projections are aligned'
      },
      metadata: {
        liveFileCount: 2456,
        phase2PendingFiles: 0,
        phase2CompletedFiles: 2456
      },
      watcher: {
        isRunning: true,
        pendingChanges: 0,
        failedChanges: 0,
        lastChangeOrigin: 'src/example.js'
      },
      cache: {
        files: 2456,
        status: 'aligned'
      },
      background: {
        graphCoverage: {
          dependenciesTotal: 3
        }
      },
      metricsSnapshot: {
        current: {
          behaviorState: 'ready',
          structuralGroups: 0,
          conceptualGroups: 0,
          pipelineOrphans: 0,
          namingDebt: 0,
          driftState: 'fresh',
          driftScore: 0,
          readinessReason: 'ready'
        }
      },
      toolInventory: {
        totalTools: 40,
        dominantCategory: 'action',
        concentration: 50
      },
      mcpSessions: {
        totalPersistentActive: 2,
        totalPersistent: 4,
        uniqueClients: 2,
        clientSyncState: 'watchful'
      }
    }, {
      summary: {
        total: 0,
        warnings: 0,
        errors: 0
      }
    });

    expect(payload).toHaveProperty('updateSurface');
    expect(payload.updateSurface).toMatchObject({
      state: 'synced',
      source: 'atom/function update pipeline'
    });

    const updateRow = payload.systemTable.rows.find((row) => row.area === 'Update');
    expect(updateRow).toMatchObject({
      area: 'Update',
      state: 'synced',
      source: 'atom/function update pipeline'
    });
    expect(updateRow.detail).toContain('mirror=2456');
    expect(updateRow.detail).toContain('deps=3');
    expect(updateRow.detail).toContain('integrity=ok');

    expect(payload.systemTable.rows.map((row) => row.area)).toEqual([
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
  });
});
