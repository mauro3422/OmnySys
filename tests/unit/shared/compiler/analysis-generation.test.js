import { describe, expect, it } from 'vitest';

import {
  buildAnalysisGenerationSnapshot,
  compareAnalysisGenerations,
  summarizeAnalysisGeneration,
  buildDerivedFeatureRegistry,
  summarizeDerivedFeatureRegistry,
  findDerivedFeatureDefinition,
  buildDataGatewayContract,
  summarizeDataGatewayContract
} from '../../../../src/shared/compiler/index.js';
import { getMetadataSurfaceParity } from '../../../../src/shared/compiler/metadata-surface-parity.js';
import { buildCompilerContractLayer } from '../../../../src/shared/compiler/compiler-contract-layer/layer.js';

describe('derived feature registry', () => {
  it('exposes canonical derived feature groups', () => {
    const registry = buildDerivedFeatureRegistry();

    expect(registry.summary.total).toBeGreaterThanOrEqual(7);
    expect(registry.summary.byFamily.semantic).toBeGreaterThan(0);
    expect(findDerivedFeatureDefinition('purpose_type')).toMatchObject({
      key: 'purpose_type',
      family: 'semantic'
    });
  });

  it('summarizes the feature registry consistently', () => {
    const summary = summarizeDerivedFeatureRegistry();

    expect(summary.canonicalCount).toBeGreaterThanOrEqual(7);
    expect(summary.canonicalKeys).toContain('generation_epoch');
    expect(summary.bySourceSurface.atoms).toBeGreaterThan(0);
  });
});

describe('analysis generation snapshots', () => {
  it('normalizes counts and starts with initial drift', () => {
    const snapshot = buildAnalysisGenerationSnapshot({
      projectPath: '/tmp/project',
      source: 'test',
      phase: 'startup',
      totalFiles: '12',
      atomCount: 7,
      relationCount: 3,
      semanticConnectionCount: 2
    });

    expect(snapshot.generationId).toMatch(/^analysis:startup:/);
    expect(snapshot.counts.files).toBe(12);
    expect(snapshot.drift.status).toBe('initial');
  });

  it('detects regression between generations', () => {
    const previous = buildAnalysisGenerationSnapshot({
      projectPath: '/tmp/project',
      source: 'test',
      phase: 'startup',
      totalFiles: 12,
      atomCount: 10,
      relationCount: 8,
      semanticConnectionCount: 4
    });
    const current = buildAnalysisGenerationSnapshot({
      projectPath: '/tmp/project',
      source: 'test',
      phase: 'startup',
      totalFiles: 10,
      atomCount: 8,
      relationCount: 7,
      semanticConnectionCount: 4,
      previousGeneration: previous
    });

    expect(compareAnalysisGenerations(previous, current).status).toBe('regressed');
    expect(summarizeAnalysisGeneration(current).healthy).toBe(false);
  });
});

describe('compiler contract layer', () => {
  it('includes derived feature governance data', () => {
    const dataGatewayContract = buildDataGatewayContract({
      analysisGeneration: buildAnalysisGenerationSnapshot({
        projectPath: '/tmp/project',
        source: 'test',
        phase: 'status',
        totalFiles: 12,
        atomCount: 10,
        relationCount: 8,
        semanticConnectionCount: 4
      }),
      persistedFileCoverage: {
        healthy: true,
        synchronized: true,
        scannedFileTotal: 12,
        manifestFileTotal: 12,
        liveIndexedFiles: 12,
        summary: 'Persisted scanned-file coverage is fresh.'
      },
      fileImportEvidenceCoverage: {
        healthy: true,
        total: 12,
        filesTotal: 12,
        activeFiles: 12,
        primaryFilesWithImports: 12,
        systemFilesTotal: 12,
        fileDependenciesTotal: 12,
        summary: 'File import evidence is fresh.'
      },
      systemMapPersistenceCoverage: {
        healthy: true,
        systemFilesTotal: 12,
        activeFiles: 12,
        fileDependenciesTotal: 12,
        summary: 'System-map persistence is fresh.'
      },
      metadataSurfaceParity: {
        healthy: true,
        primaryFilesTotal: 12,
        primaryFilesWithImports: 12,
        primaryFilesWithExports: 12,
        mirroredFilesTotal: 12,
        mirroredFilesWithImports: 12,
        mirroredFilesWithExports: 12,
        summary: 'Mirrored metadata parity is fresh.'
      },
      metadataExtractionCoverage: {
        healthy: true,
        trustworthy: true,
        filesTotal: 24,
        activeFiles: 18,
        primaryFilesWithImports: 18,
        liveAtomFiles: 3,
        systemFilesTotal: 36,
        systemFilesWithImports: 18,
        fileDependenciesTotal: 36,
        dependencySourceFiles: 18,
        summary: {
          totalTables: 3,
          totalRows: 24,
          totalFields: 36,
          coveredFields: 18,
          emptyFields: 18,
          partialFields: 6,
          fieldCoverageRatio: 0.5,
          rowCoverageRatio: 0.75,
          coverageRatio: 0.75,
          coveragePct: 75,
          fieldCoveragePct: 50,
          nextAction: 'Metadata extraction coverage is healthy enough to trust downstream consumers.'
        },
        primaryIssue: null
      },
      semanticSurfaceGranularity: {
        healthy: true,
        fileLevel: { total: 1 },
        atomLevel: { total: 1 },
        summary: 'Semantic surface granularity is fresh.'
      },
      fileUniverseGranularity: {
        healthy: true,
        scannedFileTotal: 12,
        manifestFileTotal: 12,
        liveFileCount: 12
      },
      databaseHealth: {
        healthy: true,
        summary: 'Database projections are aligned',
        metrics: {
          activeAtoms: 10,
          activeCallRelations: 8,
          activeSemanticConnections: 4
        }
      }
    });

    const layer = buildCompilerContractLayer({
      tableCounts: {
        files: 1,
        atoms: 1,
        atom_relations: 1,
        risk_assessments: 1
      },
      dataGatewayContract
    });

    expect(layer.summary.derivedFeatureCount).toBeGreaterThan(0);
    expect(layer.derivedFeatures.total).toBeGreaterThan(0);
    expect(layer.governanceContracts.dataGatewayContract).toMatchObject({
      trustworthy: true,
      primaryIssue: null
    });
    expect(layer.summary.dataGatewayContractTrustworthy).toBe(true);
    expect(layer.summary.dataGatewayContractState).toBe('trustworthy');
  });
});

describe('data gateway contract', () => {
  it('publishes DB-first freshness and flags the first stale surface', () => {
    const contract = buildDataGatewayContract({
      analysisGeneration: buildAnalysisGenerationSnapshot({
        projectPath: '/tmp/project',
        source: 'test',
        phase: 'status',
        totalFiles: 12,
        atomCount: 10,
        relationCount: 8,
        semanticConnectionCount: 4
      }),
      persistedFileCoverage: {
        healthy: true,
        synchronized: true,
        scannedFileTotal: 12,
        manifestFileTotal: 12,
        liveIndexedFiles: 12,
        summary: 'Persisted scanned-file coverage is fresh.'
      },
      fileImportEvidenceCoverage: {
        healthy: true,
        total: 12,
        filesTotal: 12,
        activeFiles: 12,
        primaryFilesWithImports: 12,
        systemFilesTotal: 12,
        fileDependenciesTotal: 12,
        summary: 'File import evidence is fresh.'
      },
      systemMapPersistenceCoverage: {
        healthy: false,
        systemFilesTotal: 10,
        activeFiles: 12,
        fileDependenciesTotal: 9,
        summary: 'System-map persistence is lagging behind the active file universe.',
        issues: ['system_files lags behind the live atom file universe']
      },
      metadataSurfaceParity: {
        healthy: true,
        primaryFilesTotal: 12,
        primaryFilesWithImports: 12,
        primaryFilesWithExports: 12,
        mirroredFilesTotal: 12,
        mirroredFilesWithImports: 12,
        mirroredFilesWithExports: 12,
        summary: 'Mirrored metadata parity is fresh.'
      },
      metadataExtractionCoverage: {
        healthy: true,
        trustworthy: true,
        filesTotal: 24,
        activeFiles: 18,
        primaryFilesWithImports: 18,
        liveAtomFiles: 3,
        systemFilesTotal: 36,
        systemFilesWithImports: 18,
        fileDependenciesTotal: 36,
        dependencySourceFiles: 18,
        summary: {
          totalTables: 3,
          totalRows: 24,
          totalFields: 36,
          coveredFields: 18,
          emptyFields: 18,
          partialFields: 6,
          fieldCoverageRatio: 0.5,
          rowCoverageRatio: 0.75,
          coverageRatio: 0.75,
          coveragePct: 75,
          fieldCoveragePct: 50,
          nextAction: 'Metadata extraction coverage is healthy enough to trust downstream consumers.'
        },
        primaryIssue: null
      },
      semanticSurfaceGranularity: {
        healthy: true,
        fileLevel: { total: 1 },
        atomLevel: { total: 1 },
        summary: 'Semantic surface granularity is fresh.'
      },
      fileUniverseGranularity: {
        healthy: true,
        scannedFileTotal: 12,
        manifestFileTotal: 12,
        liveFileCount: 12
      },
      databaseHealth: {
        healthy: true,
        summary: 'Database projections are aligned',
        metrics: {
          activeAtoms: 10,
          activeCallRelations: 8,
          activeSemanticConnections: 4
        }
      }
    });

    expect(contract.contract.sourceOfTruth).toBe('atoms');
    expect(contract.summary.total).toBe(9);
    expect(contract.summary.trustworthy).toBe(false);
    expect(contract.summary.primaryIssue).toMatchObject({
      key: 'system_map_persistence',
      state: 'stale'
    });
    expect(summarizeDataGatewayContract(contract)).toMatchObject({
      total: 9,
      stale: 1,
      trustworthy: false
    });
  });

  it('treats active files as the mirrored file-universe baseline', () => {
    const db = {
      prepare: () => ({
        get: () => ({
          primaryFilesTotal: 819,
          activeFilesTotal: 732,
          primaryFilesWithImports: 464,
          primaryFilesWithExports: 700,
          mirroredFilesTotal: 725,
          mirroredFilesWithImports: 457,
          mirroredFilesWithExports: 693
        })
      })
    };

    const parity = getMetadataSurfaceParity(db);

    expect(parity.healthy).toBe(true);
    expect(parity.fileUniverseParityRatio).toBeGreaterThanOrEqual(0.99);
    expect(parity.issues).toHaveLength(0);
  });
});
