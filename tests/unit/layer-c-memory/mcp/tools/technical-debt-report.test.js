import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRepository: vi.fn(),
  buildCompilerMetricsSnapshot: vi.fn(),
  buildFolderizationReportFromRepo: vi.fn(),
  buildEmptyFolderizationReport: vi.fn(),
  aggregateExecute: vi.fn(),
  normalizeSnapshotPath: vi.fn((value) => value)
}));

vi.mock('#layer-c/storage/repository/index.js', () => ({
  getRepository: mocks.getRepository
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  buildCompilerMetricsSnapshot: mocks.buildCompilerMetricsSnapshot,
  buildFolderizationReportFromRepo: mocks.buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport: mocks.buildEmptyFolderizationReport,
  normalizeSnapshotPath: mocks.normalizeSnapshotPath
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/aggregate-metrics.js', () => ({
  AggregateMetricsTool: class AggregateMetricsTool {
    execute(...args) {
      return mocks.aggregateExecute(...args);
    }
  }
}));

import { technical_debt_report } from '../../../../../src/layer-c-memory/mcp/tools/technical-debt-report.js';

function buildCurrentSnapshot() {
  return {
    current: {
      snapshotFingerprint: 'fingerprint-abc',
      healthScore: 96,
      healthGrade: 'A',
      issueCount: 0,
      structuralGroups: 0,
      conceptualGroups: 0,
      conceptualRawGroups: 0,
      pipelineOrphans: 0,
      folderizationCandidateCount: 0,
      flatFamilies: 0,
      mixedFamilies: 0,
      alreadyFolderizedFamilies: 0,
      namingFamilies: 0,
      namingTargets: 0,
      namingDebt: 0,
      liveCoverageRatio: 1,
      activeAtoms: 12,
      zeroAtomFileCount: 0,
      callLinks: 15,
      semanticLinks: 4,
      watcherAlertCount: 0,
      recentWarningCount: 0,
      recentErrorCount: 0,
      phase2PendingFiles: 0,
      driftState: 'fresh',
      driftScore: 100,
      stabilityScore: 97,
      successScore: 95,
      successThreshold: 85,
      mvpReady: true,
      behaviorState: 'ready',
      readinessReason: 'System is ready.'
    },
    summary: 'Health 96/A | ready'
  };
}

function buildRepo({ cacheRow = null, folderizationRow = null } = {}) {
  const insertCalls = [];

  return {
    insertCalls,
    db: {
      prepare: vi.fn((sql) => {
        if (sql.includes('SELECT payload_json') && sql.includes("snapshot_kind = 'folderization'")) {
          return {
            get: vi.fn(() => folderizationRow)
          };
        }

        if (sql.includes('SELECT captured_at, snapshot_fingerprint, summary_text, payload_json') && sql.includes('FROM compiler_metrics_snapshots')) {
          return {
            get: vi.fn(() => cacheRow)
          };
        }

        if (sql.includes('INSERT INTO compiler_metrics_snapshots')) {
          return {
            run: vi.fn((params) => {
              insertCalls.push(params);
              return { changes: 1, lastInsertRowid: 321 };
            })
          };
        }

        return {
          get: vi.fn(() => null),
          all: vi.fn(() => []),
          run: vi.fn(() => ({ changes: 0 }))
        };
      })
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.buildCompilerMetricsSnapshot.mockReturnValue(buildCurrentSnapshot());
  mocks.buildEmptyFolderizationReport.mockReturnValue({
    candidateReport: { candidateCount: 0, topCandidates: [] },
    familyState: { stateCounts: { flat: 0, mixed: 0, already_folderized: 0 } },
    migrationPlans: { candidates: [], focusCandidate: null },
    naming: { familyCount: 0, renameTargetCount: 0 },
    namingPatterns: { totalFamilies: 0, totalTargets: 0, patternCounts: {} },
    creationGuidance: { guidance: 'No guidance available' },
    recommendation: { message: 'No folderization candidate available' },
    decision: 'reject',
    summary: {
      candidateCount: 0,
      flatFamilies: 0,
      mixedFamilies: 0,
      alreadyFolderizedFamilies: 0,
      namingFamilies: 0,
      namingTargets: 0,
      namingPatternCounts: {},
      recommendationStrategy: null
    }
  });
  mocks.buildFolderizationReportFromRepo.mockReturnValue({
    candidateReport: { candidateCount: 1, topCandidates: [] },
    familyState: { stateCounts: { flat: 1, mixed: 0, already_folderized: 0 } },
    migrationPlans: { candidates: [], focusCandidate: null },
    naming: { familyCount: 1, renameTargetCount: 1 },
    namingPatterns: { totalFamilies: 1, totalTargets: 1, patternCounts: {} },
    creationGuidance: { guidance: 'Use the nearest folderized family' },
    recommendation: { message: 'Review folderization signals after more helpers are extracted' },
    decision: 'review',
    summary: {
      candidateCount: 1,
      flatFamilies: 1,
      mixedFamilies: 0,
      alreadyFolderizedFamilies: 0,
      namingFamilies: 1,
      namingTargets: 1,
      namingPatternCounts: {},
      recommendationStrategy: 'folderization'
    }
  });
});

describe('technical_debt_report', () => {
  it('returns a cached report when the fingerprint matches', async () => {
    const cachedReport = {
      success: true,
      aggregationType: 'technical_debt_report',
      summary: { folderization: { candidateCount: 0 } },
      structural: { totalGroups: 0, topIssues: [] },
      conceptual: { totalGroups: 0, topIssues: [] },
      pipelineOrphans: { total: 0, items: [] },
      folderization: { summary: { candidateCount: 0 } },
      debtScore: { score: 0, level: 'low' },
      priorityActions: [],
      timestamp: '2026-04-02T17:00:00.000Z'
    };

    const repo = buildRepo({
      cacheRow: {
        captured_at: '2026-04-02T17:00:00.000Z',
        snapshot_fingerprint: 'fingerprint-abc',
        summary_text: 'cached report',
        payload_json: JSON.stringify({
          fingerprint: 'fingerprint-abc',
          report: cachedReport
        })
      }
    });

    mocks.getRepository.mockReturnValue(repo);

    const result = await technical_debt_report({}, { projectPath: 'C:/Dev/OmnySystem' });

    expect(result.success).toBe(true);
    expect(result.cache.hit).toBe(true);
    expect(result.cache.fingerprint).toBe('fingerprint-abc');
    expect(result.summary.folderization.candidateCount).toBe(0);
    expect(mocks.aggregateExecute).not.toHaveBeenCalled();
    expect(mocks.buildFolderizationReportFromRepo).not.toHaveBeenCalled();
    expect(repo.insertCalls).toHaveLength(0);
  });

  it('skips heavy scans when the current snapshot is empty and persists the cached report', async () => {
    const repo = buildRepo();
    mocks.getRepository.mockReturnValue(repo);

    const result = await technical_debt_report({}, { projectPath: 'C:/Dev/OmnySystem' });

    expect(result.success).toBe(true);
    expect(result.cache.hit).toBe(false);
    expect(mocks.aggregateExecute).not.toHaveBeenCalled();
    expect(mocks.buildFolderizationReportFromRepo).not.toHaveBeenCalled();
    expect(mocks.buildEmptyFolderizationReport).toHaveBeenCalled();
    expect(repo.insertCalls).toHaveLength(1);
    expect(repo.insertCalls[0].snapshot_kind).toBe('technical_debt');
    expect(repo.insertCalls[0].snapshot_fingerprint).toBe('fingerprint-abc');
    expect(result.priorityActions).toHaveLength(1);
    expect(result.priorityActions[0].type).toBe('folderization_creation_guidance');
  });

  it('reuses the latest persisted folderization snapshot when available', async () => {
    const repo = buildRepo({
      folderizationRow: {
        payload_json: JSON.stringify({
          folderization: {
            candidateReport: { candidateCount: 0, topCandidates: [] },
            familyState: { totalFamilies: 1496, stateCounts: { flat: 0, mixed: 0, already_folderized: 0 }, topFamilies: [] },
            migrationPlans: { candidateCount: 0, focusCandidate: null, candidates: [] },
            naming: { familyCount: 1496, renameTargetCount: 1549, topFamilies: [{ directory: 'src/shared/compiler', familyRoot: 'compiler-explainability', renameTargetCount: 3, fileCount: 3, renameTargets: [] }] },
            namingPatterns: { totalFamilies: 1496, totalTargets: 1549, patternCounts: { shortened: 126 }, topFamilyPatterns: [], topRecommendedStems: [] },
            creationGuidance: { guidance: 'Reuse the closest canonical family.' },
            recommendation: { message: 'Use the folderization snapshot only after live-row reconciliation stabilizes.' },
            decision: 'reject',
            summary: {
              candidateCount: 0,
              flatFamilies: 0,
              mixedFamilies: 0,
              alreadyFolderizedFamilies: 0,
              namingFamilies: 1496,
              namingTargets: 1549,
              namingPatternCounts: { shortened: 126 },
              recommendationStrategy: null
            }
          }
        })
      }
    });
    mocks.getRepository.mockReturnValue(repo);

    const result = await technical_debt_report({}, { projectPath: 'C:/Dev/OmnySystem' });

    expect(result.success).toBe(true);
    expect(result.cache.hit).toBe(false);
    expect(mocks.buildFolderizationReportFromRepo).not.toHaveBeenCalled();
    expect(result.folderization.naming.familyCount).toBe(1496);
    expect(result.folderization.naming.renameTargetCount).toBe(1549);
    expect(result.folderization.summary.namingTargets).toBe(1549);
    expect(result.priorityActions.some((item) => item.type === 'folderization_naming_debt')).toBe(true);
  });
});
