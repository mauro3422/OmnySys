export function buildStatusSummaryPayloadFixture() {
  const status = {
    initialized: true,
    telemetryMode: 'full',
    project: 'C:/Dev/OmnySystem',
    repository: {
      status: { dbOpen: true, journal: { queued: 0 } },
      integrity: { healthy: true }
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
    cache: { files: 2456, status: 'aligned' },
    background: { graphCoverage: { dependenciesTotal: 3 } },
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
    toolInventory: { totalTools: 40, dominantCategory: 'action', concentration: 50 },
    topologySummary: {
      topologyState: 'watchful',
      state: 'watchful',
      connectedClients: 2,
      activeSessions: 2,
      sessionReplacementCount: 1,
      sessionReuseCount: 3,
      bridgeState: 'watchful',
      proxyState: 'stable',
      requestDeliveryState: 'watchful',
      transportOriginCounts: {
        http_direct: 1,
        stdio_bridge: 1
      },
      transportOriginMix: [
        { origin: 'http_direct', count: 1 },
        { origin: 'stdio_bridge', count: 1 }
      ],
      alerts: [
        { code: 'mixed_transport_provenance' }
      ]
    },
    systemInventory: {
      inventoryState: 'watching',
      canonicalSurfaceCount: 12,
      canonicalEntrypointCount: 4,
      emergentSystemCount: 2,
      bridgeSystemCount: 1,
      wrapperSystemCount: 1,
      legacySystemCount: 0,
      metadataCoveragePct: 79,
      integrationCoveragePct: 68,
      historyStores: {
        archiveDir: '.omnysysdata',
        totalStores: 2,
        readyStoreCount: 2,
        missingStoreCount: 0,
        state: 'ready',
        summaryText: 'health=ready | atom=ready | ready=2/2',
        stores: [
          { label: 'health-history.db', state: 'ready', exists: true, sizeBytes: 2048 },
          { label: 'atom-history.db', state: 'ready', exists: true, sizeBytes: 4096 }
        ]
      },
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
      clientSyncState: 'watchful',
      transportProvenanceState: 'watchful',
      transportOriginCounts: {
        http_direct: 1,
        stdio_bridge: 1
      },
      transportOriginMix: [
        { origin: 'http_direct', count: 1 },
        { origin: 'stdio_bridge', count: 1 }
      ]
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
      systemInventory: {
        integrationCoveragePct: 68,
        metadataCoveragePct: 79,
        historyStores: {
          archiveDir: '.omnysysdata',
          totalStores: 2,
          readyStoreCount: 2,
          missingStoreCount: 0,
          state: 'ready',
          summaryText: 'health=ready | atom=ready | ready=2/2',
          stores: [
            { label: 'health-history.db', state: 'ready', exists: true, sizeBytes: 2048 },
            { label: 'atom-history.db', state: 'ready', exists: true, sizeBytes: 4096 }
          ]
        }
      },
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
      },
      policyCoverage: {
        coverageState: 'watching',
        coverageScore: 77,
        coverageRatio: 0.5,
        coverageLoad: 8,
        totalSystemCount: 16,
        canonicalSurfaceCount: 4,
        canonicalEntrypointCount: 2,
        bridgeSystemCount: 1,
        wrapperSystemCount: 1,
        emergentSystemCount: 0,
        policyDriftCount: 3,
        propagationExpansionState: 'stale',
        nextAction: 'Attach the canonical propagation plan.',
        recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.',
        summaryText: 'coverage=watching | score=77 | load=8/16 | drift=3 | expansion=stale',
        inventoryState: 'watching'
      },
      metadataExtractionCoverage: {
        summary: {
          nextAction: 'Fill missing metadata fields'
        }
      }
    }
  };

  const recentErrors = {
    summary: {
      total: 0,
      warnings: 0,
      errors: 0
    }
  };

  return { status, recentErrors };
}
