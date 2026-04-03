import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  buildBootstrapSettlingSnapshotCase,
  buildPersistentSnapshotCase,
  buildSameDaySettlingSnapshotCase
} from './compiler-metrics-snapshot-fixtures.js';
import {
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot
} from '../../../../src/shared/compiler/snapshot.js';

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

afterEach(() => {
  vi.useRealTimers();
});

describe('compiler-metrics-snapshot', () => {
  it('preserves folderization propagation in compact metrics snapshots', () => {
    const snapshot = {
      projectPath: 'C:/Dev/OmnySystem',
      snapshotKind: 'status',
      captureSource: 'status.runtime',
      current: {
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
        startupTelemetry: {
          state: 'expected-slow',
          totalDurationMs: 1321150,
          layerAStrategy: 'full_reindex',
          layerADurationMs: 865346,
          budgetState: 'over-budget',
          summary: 'expected-slow | startup=1321150ms | layerA=full_reindex:865346ms | budget=over-budget'
        },
        summaryText: 'snapshot summary'
      },
      trend: null,
      history: { entries: [] }
    };

    const compact = summarizeCompilerMetricsSnapshot(snapshot);

    expect(compact.current.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      cacheHit: true,
      decision: 'approve',
      mode: 'family'
    });
    expect(compact.daily.propagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(compact.daily.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      candidateCount: 2
    });
    expect(compact.propagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      connectedSystems: ['folderization', 'status']
    });
    expect(compact.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      inventoryState: 'ready'
    });
    expect(compact.current.startupTelemetry).toMatchObject({
      state: 'expected-slow',
      layerAStrategy: 'full_reindex'
    });
  });

  it('captures a persistent snapshot with trend and velocity over historical baseline', () => {
    const snapshot = buildCompilerMetricsSnapshot({
      ...buildPersistentSnapshotCase(),
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
      }
    });

    expect(snapshot.current.healthScore).toBe(97);
    expect(snapshot.current.globalHealthScore).toBeGreaterThan(80);
    expect(snapshot.current.reliabilityScore).toBeGreaterThan(70);
    expect(snapshot.current.structuralGroups).toBe(4);
    expect(snapshot.current.conceptualGroups).toBe(2);
    expect(snapshot.current.activeAtomsDriftState).toBe('fresh');
    expect(snapshot.trend.status).toBe('regressing');
    expect(snapshot.trend.progressScore).toBeLessThan(0);
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
    expect(snapshot.current.healthArchive).toBeTruthy();

    const compact = summarizeCompilerMetricsSnapshot(snapshot);
    expect(compact.current.globalHealthScore).toBe(snapshot.current.globalHealthScore);
    expect(compact.current.reliabilityScore).toBe(snapshot.current.reliabilityScore);
    expect(compact.current.healthGrade).toBe('A+');
    expect(compact.current.clientSyncState).toBe('blocked');
    expect(compact.current.toolTelemetry.totalRuns).toBe(6);
    expect(compact.current.toolTelemetry.repairRateOnPressure).toBeCloseTo(0.67, 2);
    expect(compact.metricDictionary.metrics.metadataCoveragePct.value).toBe(79);
    expect(compact.metricDictionary.metrics.toolRuns.value).toBe(6);
    expect(compact.trend.status).toBe('regressing');
    expect(compact.history.total).toBeGreaterThanOrEqual(3);
    expect(compact.daily).toBeTruthy();
    expect(compact.lifetime).toBeTruthy();
  });

  it('mutes trend velocity while bootstrap history is still settling', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T10:00:00.000Z'));

    const snapshot = buildCompilerMetricsSnapshot(buildBootstrapSettlingSnapshotCase());

    expect(snapshot.trend.status).toBe('settling');
    expect(snapshot.trend.progressScore).toBe(0);
    expect(snapshot.trend.velocityPerDay).toBe(0);
    expect(snapshot.summary).toContain('tools=1/1 ok');
  });

  it('keeps manual same-day history in settling mode without synthetic velocity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T10:00:00.000Z'));

    const snapshot = buildCompilerMetricsSnapshot(buildSameDaySettlingSnapshotCase());

    expect(snapshot.trend.status).toBe('settling');
    expect(snapshot.trend.progressScore).toBe(0);
    expect(snapshot.trend.velocityPerDay).toBe(0);
    expect(snapshot.summary).toContain('Bootstrap trend settling');
  });
});
