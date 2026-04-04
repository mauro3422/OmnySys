export function buildCompilerHealthDashboardFixture() {
  return {
    dashboardInput: {
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
        canonicalPromotion: {
          promotionState: 'watching',
          inventoryState: 'ready',
          folderizationState: 'fresh',
          folderizationDecision: 'approve',
          candidateCount: 2,
          folderizedFamilyCount: 1,
          emergentCandidateCount: 1,
          canonicalCandidateCount: 1,
          nextAction: 'Review the top promotion targets',
          summaryText: 'promotion=watching:2',
          topPromotionTargets: [
            {
              surface: 'compiler-health-dashboard',
              type: 'folderized-family',
              priority: 1
            }
          ]
        },
        policyCoverage: {
          coverageState: 'stale',
          coverageScore: 0,
          coverageRatio: 0.5,
          coverageLoad: 8,
          totalSystemCount: 16,
          canonicalSurfaceCount: 4,
          canonicalEntrypointCount: 2,
          bridgeSystemCount: 1,
          wrapperSystemCount: 1,
          emergentSystemCount: 0,
          policyDriftCount: 100,
          propagationExpansionState: 'stale',
          nextAction: 'Attach the canonical propagation plan.',
          recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.',
          summaryText: 'coverage=stale | score=0 | load=8/16 | drift=100 | expansion=stale',
          inventoryState: 'watching'
        },
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
    compilerExplainability: {
      databaseHealth: {
        summary: {
          nextAction: 'Reconcile canonical rows'
        }
      },
      driftAssessment: {
        primaryIssue: {
          key: 'propagation_expansion',
          state: 'stale',
          reason: '2 propagation_expansion policy finding(s) indicate watcher or tool surfaces are not surfacing propagation where expected.',
          recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.'
        },
        signals: [
          {
            key: 'propagation_expansion',
            state: 'stale',
            reason: '2 propagation_expansion policy finding(s) indicate watcher or tool surfaces are not surfacing propagation where expected.',
            recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.'
          }
        ]
      },
      folderization: {
        creationGuidance: {
          guidance: 'Reuse the current folderized family'
        }
      },
      systemInventory: {
        integrationCoveragePct: 68,
        metadataCoveragePct: 79,
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
      },
      inventorySignals: {
        total: 5,
        byType: {
          canonical: 2,
          bridge: 1,
          wrapper: 1,
          unknown: 1
        }
      }
    },
    options: {
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
  };
}
