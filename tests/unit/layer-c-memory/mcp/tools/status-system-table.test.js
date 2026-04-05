import { describe, expect, it } from 'vitest';
import { buildSystemTableSummary } from '../../../../../src/shared/compiler/status-system-table.js';

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
          startupTelemetry: {
            state: 'expected-slow',
            totalDurationMs: 1321150,
            layerAStrategy: 'full_reindex',
            budgetState: 'over-budget',
            reason: 'Layer A ran as full_reindex, so the long startup is expected.',
            recommendation: 'Treat this startup as a reindex bootstrap and compare it against full-reindex baselines.'
          },
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
          },
          propagationExpansionState: 'stale',
          propagationExpansionReason: '2 propagation_expansion policy finding(s) indicate watcher or tool surfaces are not surfacing propagation where expected.',
          propagationExpansionRecommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.'
        }
      },
      proxyRuntimeTelemetry: {
        state: 'watchful',
        restartCount: 2,
        crashCount: 1,
        unexpectedExitCount: 1,
        cleanExitCount: 0,
        lastEventType: 'worker-crash'
      },
      bridgeRuntimeTelemetry: {
        state: 'reconnecting',
        connectCount: 3,
        reconnectCount: 2,
        transportClosedCount: 1,
        sessionExpiredCount: 1,
        retryableErrorCount: 2,
        stdioCloseCount: 0,
        lastEventType: 'bridge-recovery-needed'
      },
      compilerExplainability: {
        systemInventory: {
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
            confidence: 91,
            riskScore: 9,
            decision: 'approve',
            propagationMode: 'move_and_rewrite',
            propagationCacheHit: false,
            normalizationSafetyLevel: 'safe',
            normalizationAction: 'execute',
            normalizationTargets: 6,
            normalizationDensity: 1.5,
            policyCoverageState: 'fresh',
            promotionState: 'watching',
            systemInventoryState: 'watching',
            driftState: 'fresh',
            driftScore: 5,
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
        driftAssessment: {
          primaryIssue: {
            key: 'propagation_expansion',
            state: 'stale',
            reason: '2 propagation_expansion policy finding(s) indicate watcher or tool surfaces are not surfacing propagation where expected.',
            recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.'
          }
        },
        policyCoverage: {
          coverageState: 'stale',
          coverageScore: 0,
          coverageRatio: 0.5,
          policyDriftCount: 100,
          propagationExpansionState: 'stale',
          nextAction: 'Attach the canonical propagation plan.',
          summaryText: 'coverage=stale | score=0 | load=8/16 | drift=100 | expansion=stale',
          inventoryState: 'watching'
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
              thrashingRuns: 4,
              noiseSummary: {
                noiseScore: 48,
                noisyToolCount: 3
              },
              cachePolicySummary: {
                tierCounts: {
                  live: 2,
                  fingerprintCache: 5,
                  snapshotCache: 1,
                  ttlCache: 7
                }
              }
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
    expect(cacheRow.detail).toContain('noise=48');
    expect(cacheRow.detail).toContain('noisyTools=3');
    expect(cacheRow.detail).toContain('tiers=l:2/fp:5/snap:1/ttl:7');
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

    const propagationRow = summary.rows.find((row) => row.area === 'Propagation');
    expect(propagationRow).toMatchObject({
      area: 'Propagation',
      state: 'stale',
      source: 'compiler drift assessment'
    });
    expect(propagationRow.detail).toContain('signal=stale');
    expect(propagationRow.detail).toContain('propagation_expansion policy finding');

    const automationRow = summary.rows.find((row) => row.area === 'Automation');
    expect(automationRow).toMatchObject({
      area: 'Automation',
      state: 'ready',
      source: 'folderization automation plan'
    });
    expect(automationRow.detail).toContain('mode=execute');
    expect(automationRow.detail).toContain('exec=yes');
    expect(automationRow.detail).toContain('target=folderize_family');
    expect(automationRow.detail).toContain('confidence=91');
    expect(automationRow.detail).toContain('systems=3');

    const adoptionRow = summary.rows.find((row) => row.area === 'Adoption');
    expect(adoptionRow).toMatchObject({
      area: 'Adoption',
      state: 'ready',
      source: 'folderization propagation adoption'
    });
    expect(adoptionRow.detail).toContain('required=3');
    expect(adoptionRow.detail).toContain('surfaced=3');
    expect(adoptionRow.detail).toContain('missing=0');

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

    const startupRow = summary.rows.find((row) => row.area === 'Startup');
    expect(startupRow).toMatchObject({
      area: 'Startup',
      state: 'expected-slow',
      source: 'bootstrap startup telemetry'
    });
    expect(startupRow.detail).toContain('mode=full_reindex');
    expect(startupRow.detail).toContain('total=1321150ms');
    expect(startupRow.detail).toContain('budget=over-budget');

    const historyRow = summary.rows.find((row) => row.area === 'History');
    expect(historyRow).toMatchObject({
      area: 'History',
      state: 'ready',
      source: '.omnysysdata/health-history.db + .omnysysdata/atom-history.db'
    });
    expect(historyRow.detail).toContain('ready=2/2');
    expect(historyRow.detail).toContain('health-history.db:ready:2kb');
    expect(historyRow.detail).toContain('atom-history.db:ready:4kb');

    const proxyRow = summary.rows.find((row) => row.area === 'Proxy');
    expect(proxyRow).toMatchObject({
      area: 'Proxy',
      state: 'watchful',
      source: '.omnysysdata/proxy-runtime-telemetry.json'
    });
    expect(proxyRow.detail).toContain('restarts=2');
    expect(proxyRow.detail).toContain('crashes=1');
    expect(proxyRow.detail).toContain('exits=1');
    expect(proxyRow.detail).toContain('clean=0');
    expect(proxyRow.detail).toContain('last=worker-crash');

    const bridgeRow = summary.rows.find((row) => row.area === 'Bridge');
    expect(bridgeRow).toMatchObject({
      area: 'Bridge',
      state: 'reconnecting',
      source: '.omnysysdata/bridge-runtime-telemetry.json'
    });
    expect(bridgeRow.detail).toContain('connects=3');
    expect(bridgeRow.detail).toContain('reconnects=2');
    expect(bridgeRow.detail).toContain('closed=1');
    expect(bridgeRow.detail).toContain('expired=1');
    expect(bridgeRow.detail).toContain('retryable=2');
    expect(bridgeRow.detail).toContain('last=bridge-recovery-needed');
    const aduanaRow = summary.rows.find((row) => row.area === 'Aduana');
    expect(aduanaRow).toMatchObject({
      area: 'Aduana',
      state: 'stale',
      source: 'system inventory policy coverage'
    });
    expect(aduanaRow.detail).toContain('score=0');
    expect(aduanaRow.detail).toContain('drift=100');
    expect(aduanaRow.detail).toContain('expansion=stale');
    expect(aduanaRow.detail).toContain('coverage=50');
    const areas = summary.rows.map((row) => row.area);
    expect(areas).toEqual([
      'Daemon',
      'Database',
      'Snapshots',
      'History',
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
