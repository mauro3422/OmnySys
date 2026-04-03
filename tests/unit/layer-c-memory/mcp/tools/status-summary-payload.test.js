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
          folderizationPropagation: {
            changeType: 'folderization',
            cacheKey: 'folderization:abc123',
            cacheHit: true,
            decision: 'approve',
            mode: 'family',
            impactedFileCount: 4,
            rewriteCount: 3,
            renameTargetCount: 2,
            validationTargetCount: 5,
            hasCrossFamilyPropagation: true,
            connectedSystems: ['folderization', 'status']
          },
          readinessReason: 'ready'
        }
      },
      toolInventory: {
        totalTools: 40,
        dominantCategory: 'action',
        concentration: 50
      },
      systemInventory: {
        inventoryState: 'watching',
        canonicalSurfaceCount: 12,
        canonicalEntrypointCount: 4,
        emergentSystemCount: 2,
        bridgeSystemCount: 1,
        wrapperSystemCount: 1,
        legacySystemCount: 0,
        nextAction: 'Promote runtime boundary checks into a canonical API.'
      },
      canonicalPromotion: {
        promotionState: 'ready',
        candidateCount: 3,
        folderizedFamilyCount: 1,
        emergentCandidateCount: 2,
        canonicalCandidateCount: 0,
        nextAction: 'Promote the strongest emergent surface into a canonical API.'
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
    expect(payload).toHaveProperty('systemInventory');
    expect(payload).toHaveProperty('canonicalPromotion');
    expect(payload.updateSurface).toMatchObject({
      state: 'synced',
      source: 'atom/function update pipeline'
    });
    expect(payload.systemInventory).toMatchObject({
      inventoryState: 'watching',
      canonicalSurfaceCount: 12,
      canonicalEntrypointCount: 4
    });
    expect(payload.canonicalPromotion).toMatchObject({
      promotionState: 'ready',
      candidateCount: 3,
      folderizedFamilyCount: 1
    });
    expect(payload.propagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve',
      mode: 'family'
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

    const systemsRow = payload.systemTable.rows.find((row) => row.area === 'Systems');
    expect(systemsRow).toMatchObject({
      area: 'Systems',
      state: 'watching',
      source: 'system inventory'
    });
    expect(systemsRow.detail).toContain('canonical=16');
    expect(systemsRow.detail).toContain('emergent=2');
    expect(systemsRow.detail).toContain('bridge=1');

    const promotionRow = payload.systemTable.rows.find((row) => row.area === 'Promotion');
    expect(promotionRow).toMatchObject({
      area: 'Promotion',
      state: 'ready',
      source: 'canonical promotion'
    });
    expect(promotionRow.detail).toContain('candidates=3');
    expect(promotionRow.detail).toContain('folder=1');
    expect(promotionRow.detail).toContain('emergent=2');

    expect(payload.systemTable.rows.map((row) => row.area)).toEqual([
      'Daemon',
      'Database',
      'Snapshots',
      'Update',
      'Startup',
      'Behavior',
      'Drift',
      'Propagation',
      'Debt',
      'Sessions',
      'Tools',
      'Systems',
      'Promotion',
      'Cache',
      'Watcher',
      'Errors'
    ]);
  });
});
