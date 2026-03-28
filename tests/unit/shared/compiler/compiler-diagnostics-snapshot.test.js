import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  discoverCompilerFiles: vi.fn(),
  discoverProjectSourceFiles: vi.fn(),
  syncPersistedScannedFileManifest: vi.fn(),
  summarizePersistedScannedFileCoverage: vi.fn(),
  getFileImportEvidenceCoverage: vi.fn(),
  getSystemMapPersistenceCoverage: vi.fn(),
  getMetadataSurfaceParity: vi.fn(),
  getMetadataExtractionCoverage: vi.fn(),
  getSemanticSurfaceGranularity: vi.fn(),
  summarizeSemanticCanonicality: vi.fn(),
  getFileUniverseGranularity: vi.fn(),
  getDatabaseHealthSummary: vi.fn(),
  buildCompilerStandardizationReport: vi.fn(),
  buildCompilerContractLayer: vi.fn(),
  buildCompilerDriftAssessment: vi.fn(),
  getLiveFileTotal: vi.fn(),
  summarizeContractTaxonomy: vi.fn(),
  buildAnalysisGenerationSnapshot: vi.fn(),
  buildDataGatewayContract: vi.fn(),
  buildSurfaceAudit: vi.fn(),
  getPhase2PendingFiles: vi.fn()
}));

vi.mock('../../../../src/shared/compiler/file-discovery.js', () => ({
  discoverCompilerFiles: mocks.discoverCompilerFiles,
  discoverProjectSourceFiles: mocks.discoverProjectSourceFiles
}));

vi.mock('../../../../src/shared/compiler/compiler-persistence.js', () => ({
  syncPersistedScannedFileManifest: mocks.syncPersistedScannedFileManifest,
  summarizePersistedScannedFileCoverage: mocks.summarizePersistedScannedFileCoverage
}));

vi.mock('../../../../src/shared/compiler/file-import-evidence.js', () => ({
  getFileImportEvidenceCoverage: mocks.getFileImportEvidenceCoverage
}));

vi.mock('../../../../src/shared/compiler/system-map-persistence.js', () => ({
  getSystemMapPersistenceCoverage: mocks.getSystemMapPersistenceCoverage
}));

vi.mock('../../../../src/shared/compiler/metadata-surface-parity.js', () => ({
  getMetadataSurfaceParity: mocks.getMetadataSurfaceParity
}));

vi.mock('../../../../src/shared/compiler/metadata-extraction-coverage/coverage.js', () => ({
  getMetadataExtractionCoverage: mocks.getMetadataExtractionCoverage
}));

vi.mock('../../../../src/shared/compiler/semantic-surface-granularity.js', () => ({
  getSemanticSurfaceGranularity: mocks.getSemanticSurfaceGranularity,
  summarizeSemanticCanonicality: mocks.summarizeSemanticCanonicality
}));

vi.mock('../../../../src/shared/compiler/file-universe-granularity.js', () => ({
  getFileUniverseGranularity: mocks.getFileUniverseGranularity
}));

vi.mock('../../../../src/shared/compiler/database-health.js', () => ({
  getDatabaseHealthSummary: mocks.getDatabaseHealthSummary
}));

vi.mock('../../../../src/shared/compiler/standardization-report.js', () => ({
  buildCompilerStandardizationReport: mocks.buildCompilerStandardizationReport
}));

vi.mock('../../../../src/shared/compiler/compiler-contract-layer.js', () => ({
  buildCompilerContractLayer: mocks.buildCompilerContractLayer
}));

vi.mock('../../../../src/shared/compiler/live-row-utils.js', () => ({
  getLiveFileTotal: mocks.getLiveFileTotal
}));

vi.mock('../../../../src/shared/compiler/contract-taxonomy.js', () => ({
  summarizeContractTaxonomy: mocks.summarizeContractTaxonomy
}));

vi.mock('../../../../src/shared/compiler/analysis-generation.js', () => ({
  buildAnalysisGenerationSnapshot: mocks.buildAnalysisGenerationSnapshot
}));

vi.mock('../../../../src/shared/compiler/data-gateway-contract.js', () => ({
  buildDataGatewayContract: mocks.buildDataGatewayContract
}));

vi.mock('../../../../src/shared/compiler/surface-audit.js', () => ({
  buildSurfaceAudit: mocks.buildSurfaceAudit
}));

vi.mock('../../../../src/shared/compiler/compiler-drift-assessment.js', () => ({
  buildCompilerDriftAssessment: mocks.buildCompilerDriftAssessment
}));

vi.mock('../../../../src/shared/compiler/compiler-runtime-metrics/index.js', () => ({
  getPhase2PendingFiles: mocks.getPhase2PendingFiles
}));

import { loadCompilerDiagnosticsSnapshot } from '../../../../src/shared/compiler/compiler-diagnostics-snapshot.js';

beforeEach(() => {
  vi.clearAllMocks();

  mocks.discoverCompilerFiles.mockResolvedValue([]);
  mocks.discoverProjectSourceFiles.mockResolvedValue(['src/a.js']);
  mocks.syncPersistedScannedFileManifest.mockResolvedValue(undefined);
  mocks.summarizePersistedScannedFileCoverage.mockResolvedValue({
    healthy: true,
    scannedFileTotal: 1,
    manifestFileTotal: 1,
    synchronized: true,
    liveIndexedFiles: 1
  });
  mocks.getFileImportEvidenceCoverage.mockReturnValue({ healthy: true, summary: 'imports' });
  mocks.getSystemMapPersistenceCoverage.mockReturnValue({ healthy: true, summary: 'system-map' });
  mocks.getMetadataSurfaceParity.mockReturnValue({ healthy: true, summary: 'parity' });
  mocks.getMetadataExtractionCoverage.mockReturnValue({ healthy: true, summary: 'metadata' });
  mocks.getSemanticSurfaceGranularity.mockReturnValue({ healthy: true, summary: 'semantic' });
  mocks.summarizeSemanticCanonicality.mockReturnValue({ healthy: true, summary: 'semantic canonicality' });
  mocks.getFileUniverseGranularity.mockReturnValue({ healthy: true, summary: 'universe' });
  mocks.getDatabaseHealthSummary.mockReturnValue({
    healthy: true,
    summary: 'database health',
    metrics: {
      activeAtoms: 2,
      activeCallRelations: 3,
      activeSemanticConnections: 4
    }
  });
  mocks.buildCompilerStandardizationReport.mockReturnValue({ healthy: true, summary: 'standardization' });
  mocks.buildCompilerContractLayer.mockReturnValue({ healthy: true, summary: 'contract-layer' });
  mocks.getLiveFileTotal.mockReturnValue(1);
  mocks.summarizeContractTaxonomy.mockReturnValue({ healthy: true, summary: 'taxonomy' });
  mocks.buildAnalysisGenerationSnapshot.mockReturnValue({
    generationId: 'analysis:status:test',
    fingerprint: 'test-fingerprint'
  });
  mocks.buildDataGatewayContract.mockReturnValue({ healthy: true, summary: 'data-gateway' });
  mocks.buildSurfaceAudit.mockReturnValue({ healthy: true, trustworthy: true, summary: 'surface-audit' });
  mocks.buildCompilerDriftAssessment.mockReturnValue({
    status: 'stable',
    healthy: true,
    trustworthy: true,
    summary: {
      total: 1,
      fresh: 1,
      partial: 0,
      stale: 0,
      missing: 0,
      blocked: 0,
      healthy: true,
      trustworthy: true,
      nextAction: 'ok',
      primaryIssue: null
    },
    signals: [],
    issues: [],
    recommendations: []
  });
  mocks.getPhase2PendingFiles.mockReturnValue(0);
});

describe('compiler-diagnostics-snapshot', () => {
  it('assembles the canonical snapshot and syncs the manifest when phase 2 is settled', async () => {
    const snapshot = await loadCompilerDiagnosticsSnapshot({
      projectPath: 'C:/Dev/OmnySystem',
      db: {},
      watcherAlerts: [{ id: 1 }],
      sharedState: { active: true },
      compilerRemediation: { items: [] },
      canonicalAdoptions: { custom: true },
      tableCounts: { atoms: 1 }
    });

    expect(mocks.syncPersistedScannedFileManifest).toHaveBeenCalledWith(
      'C:/Dev/OmnySystem',
      ['src/a.js']
    );
    expect(snapshot.phase2PendingFiles).toBe(0);
    expect(snapshot.persistedFileCoverage.scannedFileTotal).toBe(1);
    expect(snapshot.semanticCanonicality.summary).toBe('semantic canonicality');
    expect(snapshot.analysisGeneration.generationId).toBe('analysis:status:test');
    expect(snapshot.canonicalAdoptions.custom).toBe(true);
    expect(snapshot.dataGatewayContract.summary).toBe('data-gateway');
    expect(snapshot.driftAssessment.summary.trustworthy).toBe(true);
    expect(snapshot.surfaceAudit.trustworthy).toBe(true);
  });

  it('skips manifest sync while phase 2 files are still pending', async () => {
    mocks.getPhase2PendingFiles.mockReturnValue(2);

    await loadCompilerDiagnosticsSnapshot({
      projectPath: 'C:/Dev/OmnySystem',
      db: {}
    });

    expect(mocks.syncPersistedScannedFileManifest).not.toHaveBeenCalled();
  });
});
