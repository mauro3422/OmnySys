import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGraphCoverageSummary: vi.fn(),
  getIssueSummary: vi.fn(),
  getConceptualDuplicateSummary: vi.fn(),
  getPipelineOrphanSummary: vi.fn(),
  getPhase2PendingFiles: vi.fn()
}));

vi.mock('../../../../src/shared/compiler/compiler-runtime-metrics/summary.js', () => ({
  getGraphCoverageSummary: mocks.getGraphCoverageSummary,
  getIssueSummary: mocks.getIssueSummary,
  getConceptualDuplicateSummary: mocks.getConceptualDuplicateSummary
}));

vi.mock('../../../../src/shared/compiler/pipeline-orphans.js', () => ({
  getPipelineOrphanSummary: mocks.getPipelineOrphanSummary
}));

vi.mock('../../../../src/shared/compiler/compiler-runtime-metrics-db.js', () => ({
  getPhase2PendingFiles: mocks.getPhase2PendingFiles
}));

import { buildCompilerMetricsSnapshot, summarizeCompilerMetricsSnapshot } from '../../../../src/shared/compiler/snapshot.js';

function createRepo() {
  const insertCalls = [];

  return {
    insertCalls,
    db: {
      prepare: vi.fn((sql) => {
        if (sql.includes('GROUP BY dna_json') && sql.includes('HAVING COUNT(*) > 1')) {
          return {
            get: vi.fn(() => ({ n: 4 }))
          };
        }

        if (sql.includes('FROM compiler_metrics_snapshots') && sql.includes('LIMIT ?') && sql.includes('ORDER BY captured_at DESC')) {
          return {
            all: vi.fn(() => ([
              {
                captured_at: '2026-03-30T00:00:00.000Z',
                health_score: 91,
                issue_count: 12,
                structural_groups: 5,
                conceptual_groups: 3,
                conceptual_raw_groups: 7,
                pipeline_orphans: 4,
                folderization_candidate_count: 6,
                flat_families: 18,
                mixed_families: 4,
                already_folderized_families: 12,
                naming_families: 9,
                naming_targets: 16,
                naming_debt: 16,
                live_coverage_ratio: 0.91,
                zero_atom_file_count: 5,
                call_links: 120,
                semantic_links: 40,
                watcher_alert_count: 3,
                recent_warning_count: 2,
                recent_error_count: 1,
                phase2_pending_files: 7,
                summary_text: 'previous'
              },
              {
                captured_at: '2026-03-28T00:00:00.000Z',
                health_score: 84,
                issue_count: 18,
                structural_groups: 7,
                conceptual_groups: 5,
                conceptual_raw_groups: 11,
                pipeline_orphans: 6,
                folderization_candidate_count: 8,
                flat_families: 22,
                mixed_families: 5,
                already_folderized_families: 10,
                naming_families: 12,
                naming_targets: 22,
                naming_debt: 22,
                live_coverage_ratio: 0.87,
                zero_atom_file_count: 9,
                call_links: 100,
                semantic_links: 31,
                watcher_alert_count: 4,
                recent_warning_count: 4,
                recent_error_count: 2,
                phase2_pending_files: 10,
                summary_text: 'baseline'
              }
            ]))
          };
        }

        if (sql.includes('captured_at <= ?') && sql.includes('FROM compiler_metrics_snapshots')) {
          return {
            get: vi.fn(() => ({
              captured_at: '2026-03-27T00:00:00.000Z',
              health_score: 80,
              issue_count: 20,
              structural_groups: 8,
              conceptual_groups: 6,
              conceptual_raw_groups: 13,
              pipeline_orphans: 8,
              folderization_candidate_count: 10,
              flat_families: 24,
              mixed_families: 6,
              already_folderized_families: 8,
              naming_families: 14,
              naming_targets: 30,
              naming_debt: 30,
              live_coverage_ratio: 0.82,
              zero_atom_file_count: 12,
              call_links: 90,
              semantic_links: 25,
              watcher_alert_count: 5,
              recent_warning_count: 5,
              recent_error_count: 3,
              phase2_pending_files: 12,
              summary_text: 'three-day baseline'
            }))
          };
        }

        if (sql.includes('INSERT INTO compiler_metrics_snapshots')) {
          return {
            run: vi.fn((params) => {
              insertCalls.push(params);
              return { changes: 1, lastInsertRowid: 123 };
            })
          };
        }

        if (sql.includes('COUNT(*) as total_runs') && sql.includes('FROM mcp_tool_runs')) {
          return {
            get: vi.fn(() => ({
              total_runs: 6,
              successful_runs: 5,
              failed_runs: 1,
              repaired_runs: 2,
              thrashing_runs: 1,
              stable_runs: 3,
              comparable_runs: 6,
              pressure_runs: 3,
              observation_runs: 6,
              alert_clearance_runs: 2,
              error_clearance_runs: 1,
              clearance_runs: 2,
              avg_duration_ms: 250,
              avg_repair_score: 4.5,
              last_run_at: '2026-03-30T00:01:00.000Z',
              last_successful_run_at: '2026-03-30T00:01:00.000Z'
            }))
          };
        }

        if (sql.includes('FROM mcp_tool_runs') && sql.includes('GROUP BY tool_name')) {
          return {
            all: vi.fn(() => ([
              {
                tool_name: 'mcp_omnysystem_get_metrics_snapshot',
                run_count: 4,
                success_count: 4,
                avg_repair_score: 6.5,
                last_run_at: '2026-03-30T00:01:00.000Z'
              }
            ]))
          };
        }

        return {
          get: vi.fn(() => ({ n: 0 })),
          all: vi.fn(() => []),
          run: vi.fn(() => ({ changes: 0 }))
        };
      })
    }
  };
}

function createBootstrapRepo() {
  return {
    db: {
      prepare: vi.fn((sql) => {
        if (sql.includes('GROUP BY dna_json') && sql.includes('HAVING COUNT(*) > 1')) {
          return {
            get: vi.fn(() => ({ n: 0 }))
          };
        }

        if (sql.includes('FROM compiler_metrics_snapshots') && sql.includes('LIMIT ?') && sql.includes('ORDER BY captured_at DESC')) {
          return {
            all: vi.fn(() => ([
              {
                captured_at: '2026-03-30T09:24:41.268Z',
                health_score: 100,
                issue_count: 7,
                structural_groups: 0,
                conceptual_groups: 0,
                conceptual_raw_groups: 0,
                pipeline_orphans: 0,
                folderization_candidate_count: 0,
                flat_families: 1386,
                mixed_families: 0,
                already_folderized_families: 0,
                naming_families: 1462,
                naming_targets: 1501,
                naming_debt: 1501,
                live_coverage_ratio: 1,
                zero_atom_file_count: 0,
                call_links: 32731,
                semantic_links: 39,
                watcher_alert_count: 7,
                recent_warning_count: 4,
                recent_error_count: 1,
                phase2_pending_files: 0,
                summary_text: 'latest previous'
              },
              {
                captured_at: '2026-03-30T09:23:33.740Z',
                health_score: 100,
                issue_count: 7,
                structural_groups: 0,
                conceptual_groups: 2,
                conceptual_raw_groups: 2,
                pipeline_orphans: 0,
                folderization_candidate_count: 0,
                flat_families: 1385,
                mixed_families: 0,
                already_folderized_families: 0,
                naming_families: 1462,
                naming_targets: 1500,
                naming_debt: 1500,
                live_coverage_ratio: 1,
                zero_atom_file_count: 0,
                call_links: 32725,
                semantic_links: 39,
                watcher_alert_count: 7,
                recent_warning_count: 4,
                recent_error_count: 1,
                phase2_pending_files: 0,
                summary_text: 'previous'
              }
            ]))
          };
        }

        if (sql.includes('captured_at <= ?') && sql.includes('FROM compiler_metrics_snapshots')) {
          return {
            get: vi.fn(() => null)
          };
        }

        if (sql.includes('COUNT(*) as total_runs') && sql.includes('FROM mcp_tool_runs')) {
          return {
            get: vi.fn(() => ({
              total_runs: 1,
              successful_runs: 1,
              failed_runs: 0,
              repaired_runs: 0,
              thrashing_runs: 1,
              stable_runs: 0,
              comparable_runs: 1,
              pressure_runs: 1,
              observation_runs: 1,
              alert_clearance_runs: 0,
              error_clearance_runs: 0,
              clearance_runs: 0,
              avg_duration_ms: 100,
              avg_repair_score: 0,
              last_run_at: '2026-03-30T09:30:00.000Z',
              last_successful_run_at: '2026-03-30T09:30:00.000Z'
            }))
          };
        }

        if (sql.includes('FROM mcp_tool_runs') && sql.includes('GROUP BY tool_name')) {
          return {
            all: vi.fn(() => [])
          };
        }

        return {
          get: vi.fn(() => ({ n: 0 })),
          all: vi.fn(() => []),
          run: vi.fn(() => ({ changes: 0 }))
        };
      })
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getGraphCoverageSummary.mockReturnValue({
    callLinks: 140,
    semanticLinks: 48
  });
  mocks.getIssueSummary.mockReturnValue({
    total: 9,
    display: '9 items'
  });
  mocks.getConceptualDuplicateSummary.mockReturnValue({
    actionableGroups: 2,
    actionableImplementations: 5,
    rawGroups: 6,
    rawImplementations: 11
  });
  mocks.getPipelineOrphanSummary.mockReturnValue({
    orphanCount: 3
  });
  mocks.getPhase2PendingFiles.mockReturnValue(4);
});

describe('compiler-metrics-snapshot', () => {
  it('captures a persistent snapshot with trend and velocity over historical baseline', () => {
    const repo = createRepo();

    const snapshot = buildCompilerMetricsSnapshot({
      projectPath: 'C:/Dev/OmnySystem',
      scopePath: 'src/core/file-watcher/guards/impact-wave',
      focusPath: 'src/core/file-watcher/guards/impact-wave',
      captureSource: 'test',
      snapshotKind: 'manual',
      repo,
      compilerExplainability: {
        databaseHealth: {
          healthScore: 97,
          grade: 'A+',
          healthy: true
        },
        fileUniverseGranularity: {
          liveCoverageRatio: 0.99,
          zeroAtomFileCount: 1
        },
        analysisGeneration: {
          generationId: 'analysis:status:test'
        },
        metadataExtractionCoverage: {
          healthy: true,
          trustworthy: false,
          primaryIssue: {
            field: 'data_flow_json',
            state: 'empty'
          },
          summary: {
            coveragePct: 79,
            fieldCoveragePct: 93
          }
        },
        dataGatewayContract: {
          summary: {
            trustworthy: true,
            primaryIssue: null
          }
        },
        compilerContractLayer: {
          summary: {
            healthy: true
          }
        },
        semanticCanonicality: {
          healthy: true
        },
        surfaceAudit: {
          summary: {
            trustworthy: true
          }
        },
        folderization: {
          candidateReport: { candidateCount: 2 },
          familyState: {
            stateCounts: {
              flat: 14,
              mixed: 3,
              already_folderized: 20
            }
          },
          naming: {
            familyCount: 8,
            renameTargetCount: 13
          },
          namingDebt: {
            renameTargetCount: 13
          },
          decision: 'already_folderized'
        }
      },
      watcherAlerts: [{ severity: 'high' }],
      recentErrors: {
        summary: {
          total: 1,
          warnings: 1,
          errors: 0
        }
      },
      mcpSessionSummary: {
        runtimeSessions: 1,
        totalPersistent: 1,
        totalPersistentActive: 1,
        uniqueClients: 1,
        clientsWithDuplicates: 0,
        actionableDuplicateClients: 0,
        toleratedDuplicateClients: 0,
        sessionCountDrift: false,
        multiClientChurn: false,
        persistenceState: {
          available: true
        },
        clientSyncState: 'blocked',
        clientSyncSeverity: 'high',
        clientSyncHealthy: false,
        clientSyncTrustworthy: false,
        clientSyncReason: 'client cache drift detected',
        clientSyncRecommendation: 'Refresh the client UI and verify the MCP catalog.',
        clientSyncEvidence: {},
        clientSyncSummary: 'client sync blocked: client cache drift detected',
        summary: '1 runtime session(s), session persistence available | client sync=blocked'
      },
      compareDays: 3,
      historyLimit: 5
    });

    expect(snapshot.current.healthScore).toBe(97);
    expect(snapshot.current.globalHealthScore).toBeGreaterThan(80);
    expect(snapshot.current.reliabilityScore).toBeGreaterThan(70);
    expect(snapshot.current.structuralGroups).toBe(4);
    expect(snapshot.current.conceptualGroups).toBe(2);
    expect(snapshot.current.activeAtomsDriftState).toBe('fresh');
    expect(snapshot.trend.status).toBe('improving');
    expect(snapshot.trend.progressScore).toBeGreaterThan(0);
    expect(snapshot.trend.summary).toContain('health');
    expect(snapshot.summary).toContain('Health');
    expect(snapshot.summary).toContain('db=97/A+');
    expect(snapshot.summary).toContain('trust=');
    expect(snapshot.summary).toContain('dbsync=fresh');
    expect(snapshot.summary).toContain('clientsync=blocked');
    expect(snapshot.summary).toContain('tools=5/6 ok');
    expect(snapshot.summary).toContain('repair=2/3');
    expect(snapshot.summary).toContain('progress=');
    expect(snapshot.metricDictionary.global.score).toBe(snapshot.current.reliabilityScore);
    expect(snapshot.metricDictionary.metrics.activeAtoms.sourceTables).toContain('atoms');
    expect(snapshot.metricDictionary.metrics.callLinks.graphSurface).toBe('calls');
    expect(snapshot.history.latest.capturedAt).toBeTruthy();
    expect(snapshot.history.previous.capturedAt).toBe('2026-03-30T00:00:00.000Z');
    expect(snapshot.history.baseline.capturedAt).toBe('2026-03-27T00:00:00.000Z');
    expect(repo.insertCalls).toHaveLength(1);

    const compact = summarizeCompilerMetricsSnapshot(snapshot);
    expect(compact.current.globalHealthScore).toBe(snapshot.current.globalHealthScore);
    expect(compact.current.reliabilityScore).toBe(snapshot.current.reliabilityScore);
    expect(compact.current.healthGrade).toBe('A+');
    expect(compact.current.clientSyncState).toBe('blocked');
    expect(compact.current.toolTelemetry.totalRuns).toBe(6);
    expect(compact.current.toolTelemetry.repairRateOnPressure).toBeCloseTo(0.67, 2);
    expect(compact.metricDictionary.metrics.metadataCoveragePct.value).toBe(79);
    expect(compact.metricDictionary.metrics.toolRuns.value).toBe(6);
    expect(compact.trend.status).toBe('improving');
    expect(compact.history.total).toBeGreaterThanOrEqual(3);
  });

  it('mutes trend velocity while bootstrap history is still settling', () => {
    const snapshot = buildCompilerMetricsSnapshot({
      projectPath: 'C:/Dev/OmnySystem',
      captureSource: 'test',
      snapshotKind: 'manual',
      repo: createBootstrapRepo(),
      compilerExplainability: {
        databaseHealth: {
          healthScore: 100,
          grade: 'A+',
          healthy: true
        },
        fileUniverseGranularity: {
          liveCoverageRatio: 1,
          zeroAtomFileCount: 0
        },
        metadataExtractionCoverage: {
          healthy: true,
          trustworthy: true,
          summary: {
            coveragePct: 79,
            fieldCoveragePct: 94
          }
        },
        dataGatewayContract: {
          summary: {
            trustworthy: true
          }
        },
        compilerContractLayer: {
          summary: {
            healthy: true
          }
        },
        surfaceAudit: {
          summary: {
            trustworthy: true
          }
        },
        folderization: {
          candidateReport: { candidateCount: 0 },
          familyState: { stateCounts: { flat: 1387, mixed: 0, already_folderized: 0 } },
          naming: { familyCount: 1463, renameTargetCount: 1502 },
          namingDebt: { renameTargetCount: 1502 },
          decision: 'reject'
        }
      },
      watcherAlerts: [],
      recentErrors: {
        summary: {
          total: 0,
          warnings: 0,
          errors: 0
        }
      },
      historyLimit: 3
    });

    expect(snapshot.trend.status).toBe('settling');
    expect(snapshot.trend.progressScore).toBe(0);
    expect(snapshot.trend.velocityPerDay).toBe(0);
    expect(snapshot.summary).toContain('tools=1/1 ok');
  });

  it('keeps manual same-day history in settling mode without synthetic velocity', () => {
    const snapshot = buildCompilerMetricsSnapshot({
      projectPath: 'C:/Dev/OmnySystem',
      captureSource: 'test',
      snapshotKind: 'manual',
      repo: createBootstrapRepo(),
      compilerExplainability: {
        databaseHealth: {
          healthScore: 100,
          grade: 'A+',
          healthy: true
        },
        fileUniverseGranularity: {
          liveCoverageRatio: 1,
          zeroAtomFileCount: 0
        },
        metadataExtractionCoverage: {
          healthy: true,
          trustworthy: true,
          summary: {
            coveragePct: 79,
            fieldCoveragePct: 94
          }
        },
        dataGatewayContract: {
          summary: {
            trustworthy: true
          }
        },
        compilerContractLayer: {
          summary: {
            healthy: true
          }
        },
        surfaceAudit: {
          summary: {
            trustworthy: true
          }
        },
        folderization: {
          candidateReport: { candidateCount: 0 },
          familyState: { stateCounts: { flat: 1387, mixed: 0, already_folderized: 0 } },
          naming: { familyCount: 1463, renameTargetCount: 1502 },
          namingDebt: { renameTargetCount: 1502 },
          decision: 'reject'
        }
      },
      watcherAlerts: [
        { severity: 'high' }
      ],
      recentErrors: {
        summary: {
          total: 4,
          warnings: 3,
          errors: 1
        }
      },
      historyLimit: 6
    });

    expect(snapshot.trend.status).toBe('settling');
    expect(snapshot.trend.progressScore).toBe(0);
    expect(snapshot.trend.velocityPerDay).toBe(0);
    expect(snapshot.summary).toContain('Bootstrap trend settling');
  });
});
