import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFolderizationSnapshotTrend: vi.fn(),
  buildCompilerDriftAssessment: vi.fn(),
  buildCompilerControlPlaneFoundations: vi.fn(),
  summarizeDataGatewayContract: vi.fn(),
  summarizeSemanticCanonicality: vi.fn()
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/folderization-snapshot-helpers.js', () => ({
  buildFolderizationSnapshotTrend: mocks.buildFolderizationSnapshotTrend
}));

vi.mock('../../../../../src/shared/compiler/compiler-drift-assessment.js', () => ({
  buildCompilerDriftAssessment: mocks.buildCompilerDriftAssessment
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  buildCompilerControlPlaneFoundations: mocks.buildCompilerControlPlaneFoundations,
  summarizeDataGatewayContract: mocks.summarizeDataGatewayContract
}));

vi.mock('../../../../../src/shared/compiler/semantic-surface-granularity-contract.js', () => ({
  summarizeSemanticCanonicality: mocks.summarizeSemanticCanonicality
}));

import { buildFolderizationSnapshotSummary } from '../../../../../src/layer-c-memory/mcp/tools/folderization-snapshot-summary.js';

describe('folderization-snapshot-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildFolderizationSnapshotTrend.mockReturnValue({ status: 'stable' });
    mocks.buildCompilerDriftAssessment.mockReturnValue({
      signals: [{
        key: 'live_row_sync',
        state: 'stale',
        healthy: false,
        trustworthy: false,
        reason: 'Live support tables are drifting from the atom graph.',
        recommendation: 'Reconcile the live support tables before trusting folderization guidance.',
        evidence: { source: 'drift-assessment' }
      }]
    });
    mocks.buildCompilerControlPlaneFoundations.mockImplementation(({ dbSurfaces = {} }) => ({
      databaseHealth: dbSurfaces.databaseHealth || null,
      dataGatewayContract: { summary: { trustworthy: false } },
      fileUniverseGranularity: { healthy: true },
      liveRowSync: dbSurfaces.databaseHealth?.metrics?.liveRowSync || null
    }));
    mocks.summarizeDataGatewayContract.mockReturnValue({
      trustworthy: false,
      nextAction: 'Reconcile the live support tables before trusting folderization guidance.'
    });
    mocks.summarizeSemanticCanonicality.mockReturnValue({ status: 'stable' });
  });

  it('derives gateway and live-row sync from control-plane foundations', () => {
    const databaseHealth = {
      healthy: false,
      healthScore: 73,
      grade: 'C',
      metrics: {
        liveRowSync: {
          summary: {
            staleAtomRows: 2,
            staleFileRows: 0,
            staleRiskRows: 0,
            staleRelationRows: 0,
            staleConnectionRows: 0
          }
        }
      }
    };

    const result = buildFolderizationSnapshotSummary({
      folderizationReport: {
        summary: {
          candidateCount: 2,
          flatFamilies: 3,
          mixedFamilies: 1,
          alreadyFolderizedFamilies: 5,
          namingTargets: 6,
          propagationImpactedFiles: 3,
          propagationRewriteCount: 4
        },
        creationGuidance: {
          preferredFolder: 'src/core/file-watcher/guards/dead-code',
          preferredRoleStems: [{ stem: 'core.js' }],
          selectionReason: 'Reuse the closest DB-backed family.'
        },
        recommendation: {
          strategy: 'folderization'
        }
      },
      databaseHealth,
      history: []
    });

    expect(mocks.buildCompilerControlPlaneFoundations).toHaveBeenCalledWith({
      dbSurfaces: { databaseHealth }
    });
    expect(result.dbSyncState).toBe('stale');
    expect(result.recommendedAction).toContain('Reconcile the live support tables');
    expect(result.nextBestFolder).toBe('src/core/file-watcher/guards/dead-code');
    expect(result.nextBestStem).toBe('core.js');
  });
});
