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
        policyCoverage: {
          coverageState: 'watching',
          coverageScore: 77,
          coverageRatio: 0.5,
          policyDriftCount: 3,
          propagationExpansionState: 'stale',
          nextAction: 'Attach the canonical propagation plan.'
        },
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
      },
      proxyRuntimeTelemetry: {
        state: 'stable',
        restartCount: 0,
        crashCount: 0,
        unexpectedExitCount: 0,
        cleanExitCount: 1,
        lastEventType: 'worker-exit-clean'
      },
      bridgeRuntimeTelemetry: {
        state: 'watchful',
        connectCount: 2,
        reconnectCount: 1,
        transportClosedCount: 1,
        sessionExpiredCount: 0,
        retryableErrorCount: 1,
        stdioCloseCount: 0,
        lastEventType: 'transport-closed'
      },
      compilerExplainability: {
        folderization: {
          automation: {
            automationState: 'ready',
            executionMode: 'execute',
            shouldExecute: true,
            executionTarget: 'folderize_family',
            confidence: 89,
            riskScore: 11,
            decision: 'approve',
            propagationMode: 'move_and_rewrite',
            propagationCacheHit: true,
            normalizationSafetyLevel: 'safe',
            normalizationAction: 'execute',
            normalizationTargets: 4,
            normalizationDensity: 1.2,
            policyCoverageState: 'watching',
            promotionState: 'ready',
            systemInventoryState: 'watching',
            driftState: 'fresh',
            driftScore: 3,
            nextAction: 'Execute folderize_family using the propagation plan.',
            reason: 'Folderization can execute because propagation is attached and the normalization plan is safe.',
            connectedSystemCount: 3,
            connectedSystems: [
              { name: 'technical_debt_report', role: 'consumer' },
              { name: 'status_panel', role: 'visibility' },
              { name: 'compiler_explainability', role: 'explainability' }
            ],
            connectedSystemNames: ['technical_debt_report', 'status_panel', 'compiler_explainability'],
            propagationAdoption: {
              adoptionState: 'ready',
              coverageRatio: 1,
              requiredSystemCount: 3,
              surfacedSystemCount: 3,
              missingSystemCount: 0,
              requiredSystemNames: ['technical_debt_report', 'status_panel', 'compiler_explainability'],
              surfacedSystemNames: ['technical_debt_report', 'status_panel', 'compiler_explainability'],
              missingSystemNames: [],
              nextAction: 'All connected systems already surface the propagation pattern.',
              reason: '3/3 connected system(s) already surface the propagation pattern; missing=none.',
              summaryText: 'state=ready | coverage=1 | required=3 | surfaced=3 | missing=0 | surfacedSystems=technical_debt_report, status_panel, compiler_explainability'
            }
          }
        }
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
    expect(payload.folderizationAutomation).toMatchObject({
      automationState: 'ready',
      executionMode: 'execute',
      executionTarget: 'folderize_family'
    });
    expect(payload.folderizationAdoption).toMatchObject({
      adoptionState: 'ready',
      requiredSystemCount: 3,
      surfacedSystemCount: 3
    });
    expect(payload.proxyRuntimeTelemetry).toMatchObject({
      state: 'stable',
      restartCount: 0,
      cleanExitCount: 1
    });
    expect(payload.bridgeRuntimeTelemetry).toMatchObject({
      state: 'watchful',
      connectCount: 2,
      reconnectCount: 1
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

    const aduanaRow = payload.systemTable.rows.find((row) => row.area === 'Aduana');
    expect(aduanaRow).toMatchObject({
      area: 'Aduana',
      state: 'watching',
      source: 'system inventory policy coverage'
    });
    expect(aduanaRow.detail).toContain('score=77');
    expect(aduanaRow.detail).toContain('drift=3');
    expect(aduanaRow.detail).toContain('expansion=stale');
    expect(aduanaRow.detail).toContain('coverage=50');

    const promotionRow = payload.systemTable.rows.find((row) => row.area === 'Promotion');
    expect(promotionRow).toMatchObject({
      area: 'Promotion',
      state: 'ready',
      source: 'canonical promotion'
    });
    expect(promotionRow.detail).toContain('candidates=3');
    expect(promotionRow.detail).toContain('folder=1');
    expect(promotionRow.detail).toContain('emergent=2');

    const automationRow = payload.systemTable.rows.find((row) => row.area === 'Automation');
    expect(automationRow).toMatchObject({
      area: 'Automation',
      state: 'ready',
      source: 'folderization automation plan'
    });
    expect(automationRow.detail).toContain('mode=execute');
    expect(automationRow.detail).toContain('exec=yes');
    expect(automationRow.detail).toContain('target=folderize_family');
    expect(automationRow.detail).toContain('systems=3');

    const adoptionRow = payload.systemTable.rows.find((row) => row.area === 'Adoption');
    expect(adoptionRow).toMatchObject({
      area: 'Adoption',
      state: 'ready',
      source: 'folderization propagation adoption'
    });
    expect(adoptionRow.detail).toContain('required=3');
    expect(adoptionRow.detail).toContain('surfaced=3');
    expect(adoptionRow.detail).toContain('missing=0');
    expect(adoptionRow.detail).toContain('coverage=100');
    expect(adoptionRow.detail).toContain('missingNames=none');

    expect(payload.systemTable.rows.map((row) => row.area)).toEqual([
      'Daemon',
      'Database',
      'Snapshots',
      'Update',
      'Startup',
      'Proxy',
      'Bridge',
      'Behavior',
      'Drift',
      'Propagation',
      'Debt',
      'Sessions',
      'Tools',
      'Systems',
      'Aduana',
      'Promotion',
      'Automation',
      'Adoption',
      'Cache',
      'Watcher',
      'Errors'
    ]);
  });
});
