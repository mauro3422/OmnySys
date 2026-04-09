import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRepository: vi.fn(),
  buildFolderizationReportFromRepo: vi.fn(),
  buildEmptyFolderizationReport: vi.fn(),
  getDatabaseHealthSummary: vi.fn()
}));

vi.mock('#layer-c/storage/repository/index.js', () => ({
  getRepository: mocks.getRepository
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  buildFolderizationReportFromRepo: mocks.buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport: mocks.buildEmptyFolderizationReport,
  getDatabaseHealthSummary: mocks.getDatabaseHealthSummary
}));

import { buildFolderizationSnapshotContext } from '../../../../../src/layer-c-memory/mcp/tools/folderization-snapshot-service.js';

describe('folderization-snapshot-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const insertCalls = [];
    const historyRows = [{
      captured_at: '2026-03-29T00:00:00.000Z',
      health_score: 70,
      health_grade: 'C',
      active_atoms: 110,
      folderization_candidate_count: 3,
      flat_families: 2,
      mixed_families: 1,
      already_folderized_families: 4,
      naming_families: 3,
      naming_targets: 5,
      naming_debt: 5,
      drift_state: 'fresh',
      summary_text: 'previous',
      payload_json: JSON.stringify({
        summary: {
          candidateCount: 3,
          flatFamilies: 2,
          mixedFamilies: 1,
          alreadyFolderizedFamilies: 4,
          namingFamilies: 3,
          namingTargets: 5,
          dbSyncState: 'fresh'
        }
      })
    }];

    mocks.getRepository.mockReturnValue({
      db: {
        prepare: vi.fn((sql) => {
          if (sql.includes('SELECT') && sql.includes("snapshot_kind = 'folderization'")) {
            return {
              all: vi.fn(() => historyRows)
            };
          }

          if (sql.includes('INSERT INTO compiler_metrics_snapshots')) {
            return {
              run: vi.fn((params) => {
                insertCalls.push(params);
                return { changes: 1, lastInsertRowid: 42 };
              })
            };
          }

          return {
            all: vi.fn(() => []),
            get: vi.fn(() => null),
            run: vi.fn(() => ({ changes: 0 }))
          };
        })
      },
      insertCalls
    });
    mocks.buildFolderizationReportFromRepo.mockReturnValue({
      candidateReport: { candidateCount: 2 },
      familyState: { stateCounts: { flat: 3, mixed: 1, already_folderized: 5 } },
      migrationPlans: { candidates: [], focusCandidate: null },
      naming: { familyCount: 4, renameTargetCount: 6 },
      namingPatterns: { patternCounts: { helper: 2 } },
      creationGuidance: {
        guidance: 'Use the nearest folderized family',
        preferredFolder: 'src/core/file-watcher/guards/dead-code',
        scopePath: 'src/core/file-watcher/guards',
        focusPath: 'src/core/file-watcher/guards/dead-code/guard.js'
      },
      propagation: {
        decision: 'review',
        mode: 'move_and_rewrite',
        moveTargetCount: 2,
        impactedFileCount: 3,
        rewriteCount: 4,
        renameTargetCount: 6,
        validationTargetCount: 5,
        hasCrossFamilyPropagation: true,
        topImpactedFiles: [{ filePath: 'src/core/file-watcher/guards/dead-code/index.js', importCount: 2 }],
        topCandidates: [{ familyRoot: 'dead-code', decision: 'review', moveTargetCount: 2, impactedFileCount: 3, rewriteCount: 4 }],
        candidateCount: 2,
        flatFamilies: 3,
        mixedFamilies: 1,
        alreadyFolderizedFamilies: 5,
        guidance: 'Use the nearest folderized family',
        recommendationStrategy: 'folderization'
      },
      recommendation: { strategy: 'folderization' },
      decision: 'review',
      summary: {
        candidateCount: 2,
        flatFamilies: 3,
        mixedFamilies: 1,
        alreadyFolderizedFamilies: 5,
        namingFamilies: 4,
        namingTargets: 6,
        namingPatternCounts: { helper: 2 },
        guidanceScopePath: 'src/core/file-watcher/guards',
        guidanceFocusPath: 'src/core/file-watcher/guards/dead-code/guard.js',
        recommendationStrategy: 'folderization',
        propagationMoveTargets: 2,
        propagationImpactedFiles: 3,
        propagationRewriteCount: 4,
        propagationValidationTargets: 5,
        propagationMode: 'move_and_rewrite'
      }
    });
    mocks.buildEmptyFolderizationReport.mockReturnValue({
      candidateReport: { candidateCount: 0 },
      familyState: { stateCounts: { flat: 0, mixed: 0, already_folderized: 0 } },
      migrationPlans: { candidates: [], focusCandidate: null },
      naming: { familyCount: 0, renameTargetCount: 0 },
      namingPatterns: { patternCounts: {} },
      creationGuidance: { guidance: 'No guidance available' },
      recommendation: { strategy: 'folderization' },
      decision: 'reject',
      summary: { candidateCount: 0, flatFamilies: 0, mixedFamilies: 0, alreadyFolderizedFamilies: 0, namingFamilies: 0, namingTargets: 0, namingPatternCounts: {}, recommendationStrategy: null }
    });
    mocks.getDatabaseHealthSummary.mockReturnValue({
      healthy: false,
      healthScore: 73,
      grade: 'C',
      summary: 'Database needs reconciliation',
      metrics: {
        activeAtoms: 120,
        liveRowSync: {
          summary: {
            staleAtomRows: 2,
            staleFileRows: 0,
            staleRiskRows: 0,
            staleRelationRows: 0,
            staleConnectionRows: 0
          }
        }
      },
      criticalFindings: [{ code: 'db_sync_drift', message: 'DB desync detected' }],
      warnings: [{ code: 'db_sync_drift', message: 'DB desync detected' }],
      recommendations: ['Reconcile the live support tables before trusting folderization guidance.']
    });
  });

  it('builds a lightweight folderization snapshot with db sync state', async () => {
    const result = await buildFolderizationSnapshotContext(
      {
        scopePath: 'src/core/file-watcher/guards',
        focusPath: 'src/core/file-watcher/guards/dead-code/guard.js',
        filePaths: ['src/core/file-watcher/guards/dead-code/guard.js']
      },
      { projectPath: 'C:/Dev/OmnySystem' }
    );

    expect(result.success).toBe(true);
    expect(mocks.getRepository).toHaveBeenCalledWith('C:/Dev/OmnySystem');
    expect(mocks.buildFolderizationReportFromRepo).toHaveBeenCalled();
    expect(mocks.getDatabaseHealthSummary).toHaveBeenCalled();
    expect(result.snapshot.summary.dbSyncState).toBe('stale');
    expect(result.snapshot.summary.summaryText).toContain('dbsync=stale');
    expect(result.snapshot.summary.recommendedAction).toContain('Reconcile the live support tables');
    expect(result.snapshot.summary.nextBestFolder).toBe('src/core/file-watcher/guards/dead-code');
    expect(result.snapshot.summary.nextBestStem).toBe('core.js');
    expect(result.snapshot.folderization.creationGuidance.guidance).toContain('folderized family');
    expect(result.snapshot.folderization.propagation.impactedFileCount).toBe(3);
    expect(result.snapshot.folderization.propagation.rewriteCount).toBe(4);
    expect(result.databaseHealth.healthScore).toBe(73);
    expect(result.history).toHaveLength(2);
    expect(result.trend.status).toBe('improving');
    expect(result.persisted).toBeTruthy();
    expect(result.repo.insertCalls).toHaveLength(1);
  });

  it('surfaces split_large_file when no folderization candidate is available', async () => {
    mocks.buildFolderizationReportFromRepo.mockReturnValueOnce({
      candidateReport: { candidateCount: 0 },
      familyState: { stateCounts: { flat: 0, mixed: 0, already_folderized: 0 } },
      migrationPlans: { candidates: [], focusCandidate: null },
      naming: { familyCount: 0, renameTargetCount: 0 },
      namingPatterns: { patternCounts: {} },
      creationGuidance: {
        guidance: 'No guidance available',
        selectionReason: 'The current family is monolithic.'
      },
      propagation: {
        decision: 'reject',
        mode: 'blocked',
        moveTargetCount: 0,
        impactedFileCount: 0,
        rewriteCount: 0,
        renameTargetCount: 0,
        validationTargetCount: 0,
        hasCrossFamilyPropagation: false,
        topImpactedFiles: [],
        topCandidates: [],
        candidateCount: 0,
        flatFamilies: 0,
        mixedFamilies: 0,
        alreadyFolderizedFamilies: 0,
        guidance: 'No guidance available',
        recommendationStrategy: 'split_large_file'
      },
      recommendation: {
        message: 'No folderization candidate available; split the monolith before folderizing.',
        action: 'Use split_large_file to break the monolith into smaller helpers before retrying folderization.',
        strategy: 'split_large_file'
      },
      decision: 'reject',
      summary: {
        candidateCount: 0,
        flatFamilies: 0,
        mixedFamilies: 0,
        alreadyFolderizedFamilies: 0,
        namingFamilies: 0,
        namingTargets: 0,
        namingPatternCounts: {},
        recommendationStrategy: 'split_large_file'
      }
    });
    mocks.getDatabaseHealthSummary.mockReturnValueOnce({
      healthy: true,
      healthScore: 96,
      grade: 'A',
      summary: 'Database projections are aligned',
      metrics: {
        activeAtoms: 120,
        liveRowSync: {
          summary: {
            staleAtomRows: 0,
            staleFileRows: 0,
            staleRiskRows: 0,
            staleRelationRows: 0,
            staleConnectionRows: 0
          }
        }
      },
      criticalFindings: [],
      warnings: [],
      recommendations: []
    });

    const result = await buildFolderizationSnapshotContext(
      {
        scopePath: 'src/shared/compiler',
        focusPath: 'src/shared/compiler/folderization-report'
      },
      { projectPath: 'C:/Dev/OmnySystem' }
    );

    expect(result.success).toBe(true);
    expect(result.snapshot.summary.recommendationStrategy).toBe('split_large_file');
    expect(result.snapshot.summary.recommendedTool).toBe('split_large_file');
    expect(result.snapshot.summary.recommendedAction).toContain('split_large_file');
    expect(result.snapshot.summary.whyThisFirst).toContain('split');
  });
});
