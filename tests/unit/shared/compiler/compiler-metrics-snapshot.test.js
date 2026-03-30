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

import { buildCompilerMetricsSnapshot, summarizeCompilerMetricsSnapshot } from '../../../../src/shared/compiler/compiler-metrics-snapshot.js';

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
    expect(snapshot.current.structuralGroups).toBe(4);
    expect(snapshot.current.conceptualGroups).toBe(2);
    expect(snapshot.current.activeAtomsDriftState).toBe('fresh');
    expect(snapshot.trend.status).toBe('improving');
    expect(snapshot.trend.progressScore).toBeGreaterThan(0);
    expect(snapshot.trend.summary).toContain('health');
    expect(snapshot.summary).toContain('Health 97/A+');
    expect(snapshot.summary).toContain('dbsync=fresh');
    expect(snapshot.summary).toContain('clientsync=blocked');
    expect(snapshot.summary).toContain('progress=');
    expect(snapshot.history.latest.capturedAt).toBeTruthy();
    expect(snapshot.history.previous.capturedAt).toBe('2026-03-30T00:00:00.000Z');
    expect(snapshot.history.baseline.capturedAt).toBe('2026-03-27T00:00:00.000Z');
    expect(repo.insertCalls).toHaveLength(1);

    const compact = summarizeCompilerMetricsSnapshot(snapshot);
    expect(compact.current.healthGrade).toBe('A+');
    expect(compact.current.clientSyncState).toBe('blocked');
    expect(compact.trend.status).toBe('improving');
    expect(compact.history.total).toBeGreaterThanOrEqual(3);
  });
});
