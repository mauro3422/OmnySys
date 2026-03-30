import { describe, expect, it } from 'vitest';

import { buildDataGatewayContract } from '../../../../src/shared/compiler/contract.js';
import { buildSurfaceAudit, summarizeSurfaceAudit } from '../../../../src/shared/compiler/surface-audit/audit.js';

describe('surface-audit', () => {
  it('summarizes the unified surface audit contract', () => {
    const metadataExtractionCoverage = {
      healthy: false,
      trustworthy: true,
      filesTotal: 9,
      activeFiles: 6,
      primaryFilesWithImports: 6,
      liveAtomFiles: 3,
      systemFilesTotal: 12,
      systemFilesWithImports: 6,
      fileDependenciesTotal: 12,
      dependencySourceFiles: 6,
      metrics: {
        activeAtoms: 9,
        activeCallRelations: 6,
        activeSemanticConnections: 6
      },
      summary: {
        totalTables: 3,
        totalRows: 9,
        totalFields: 12,
        coveredFields: 6,
        emptyFields: 6,
        partialFields: 2,
        fieldCoverageRatio: 0.5,
        rowCoverageRatio: 0.5,
        coverageRatio: 0.5,
        coveragePct: 50,
        fieldCoveragePct: 50,
        nextAction: 'Review metadata extraction coverage before trusting downstream reads.'
      },
      warnings: [
        {
          table: 'files',
          field: 'semantic_analysis_json',
          message: 'metadata extraction coverage is partial'
        }
      ],
      primaryIssue: {
        table: 'files',
        field: 'semantic_analysis_json',
        state: 'partial',
        reason: 'metadata extraction coverage is partial'
      },
      topMissingFields: [
        { table: 'files', field: 'semantic_analysis_json', coveragePct: 0, state: 'empty' }
      ],
      topCoveredFields: [
        { table: 'atoms', field: 'shared_state_json', coveragePct: 100, state: 'covered' }
      ]
    };

    const dataGatewayContract = buildDataGatewayContract({
      analysisGeneration: {
        generationId: 'analysis:status:abc123',
        fingerprint: 'abc123',
        counts: {
          files: 10,
          atoms: 7,
          relations: 5,
          semanticConnections: 3,
          derivedFeatures: 4
        },
        drift: {
          status: 'updated',
          recommendation: 'Refresh downstream consumers.'
        }
      },
      persistedFileCoverage: {
        healthy: true,
        summary: 'Persisted file coverage is fresh.'
      },
      fileImportEvidenceCoverage: {
        healthy: true,
        summary: 'File import evidence is fresh.'
      },
      systemMapPersistenceCoverage: {
        healthy: true,
        summary: 'System map persistence is fresh.'
      },
      metadataSurfaceParity: {
        healthy: true,
        summary: 'Metadata surface parity is fresh.'
      },
      metadataExtractionCoverage,
      semanticSurfaceGranularity: {
        healthy: true,
        summary: 'Semantic surface granularity is fresh.'
      },
      fileUniverseGranularity: {
        healthy: true,
        summary: 'File universe granularity is fresh.'
      },
      databaseHealth: {
        healthy: true,
        summary: 'Database health is fresh.'
      }
    });

    const audit = buildSurfaceAudit({
      analysisGeneration: {
        generationId: 'analysis:status:abc123',
        fingerprint: 'abc123',
        counts: {
          files: 10,
          atoms: 7,
          relations: 5,
          semanticConnections: 3,
          derivedFeatures: 4
        },
        drift: {
          status: 'updated',
          recommendation: 'Refresh downstream consumers.'
        }
      },
      dataGatewayContract,
      databaseHealth: {
        metrics: {
          activeAtoms: 7,
          activeFiles: 4,
          activeCallRelations: 5,
          activeSemanticConnections: 3,
          orphanCallRelations: 0,
          activeSystemFiles: 4,
          systemFilesWithSemantics: 2
        }
      },
      metadataExtractionCoverage
    });

    const compact = summarizeSurfaceAudit(audit);

    expect(compact.summary.total).toBe(9);
    expect(compact.summary.fresh).toBe(8);
    expect(compact.summary.partial).toBe(1);
    expect(compact.summary.trustworthy).toBe(true);
    expect(compact.metrics.metadataTables).toBe(3);
    expect(compact.metrics.metadataCoveragePct).toBe(50);
    expect(compact.surfaces).toHaveLength(9);
    expect(compact.surfaces.find((surface) => surface.key === 'analysis_generation')?.state).toBe('fresh');
    expect(compact.surfaces.find((surface) => surface.key === 'metadata_extraction_coverage')?.reason).toBe('Review metadata extraction coverage before trusting downstream reads.');
    expect(compact.summary.primaryIssue?.key).toBe('metadata_extraction_coverage');
    expect(compact.summary.primaryIssue?.reason).toBe('Review metadata extraction coverage before trusting downstream reads.');
    expect(compact.metadataExtractionCoverage.topMissingFields[0].field).toBe('semantic_analysis_json');
  });
});
