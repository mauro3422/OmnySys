import { normalizeCount } from '../surface-utils.js';
import { buildInvariant, buildSurface } from './models.js';

export function buildSurfaceInventory({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  semanticSurfaceGranularity = null,
  semanticCanonicality = null,
  dataGatewayContract = null,
  systemMapPersistenceCoverage = null,
  tableCounts = {}
} = {}) {
  const filesCount = normalizeCount(tableCounts.files);
  const atomsCount = normalizeCount(tableCounts.atoms);
  const relationsCount = normalizeCount(tableCounts.atom_relations);
  const manifestCount = normalizeCount(persistedFileCoverage?.manifestFileTotal);
  const scannedCount = normalizeCount(persistedFileCoverage?.scannedFileTotal);
  const liveFileCount = normalizeCount(fileUniverseGranularity?.liveFileCount ?? persistedFileCoverage?.liveIndexedFiles);
  const semanticSummaryCount = normalizeCount(semanticSurfaceGranularity?.fileLevel?.total);
  const semanticDetailCount = normalizeCount(semanticSurfaceGranularity?.atomLevel?.total);
  const riskCount = normalizeCount(tableCounts.risk_assessments);

  return [
    buildSurface({
      id: 'atoms',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'live graph atoms',
      surface: 'atoms',
      trustworthy: atomsCount > 0,
      healthy: atomsCount > 0,
      summary: `Primary atom graph with ${atomsCount} live rows.`,
      evidence: { rows: atomsCount }
    }),
    buildSurface({
      id: 'files',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'primary file metadata',
      surface: 'files',
      trustworthy: filesCount > 0,
      healthy: filesCount > 0,
      summary: `Primary file-level metadata surface with ${filesCount} live rows.`,
      evidence: { rows: filesCount }
    }),
    buildSurface({
      id: 'atom_relations',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'dependency and semantic detail',
      surface: 'atom_relations',
      trustworthy: relationsCount > 0,
      healthy: relationsCount > 0,
      summary: `Canonical atom-level relation surface with ${relationsCount} live rows.`,
      evidence: { rows: relationsCount }
    }),
    buildSurface({
      id: 'compiler_scanned_files',
      kind: 'table',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'scanner manifest',
      surface: 'compiler_scanned_files',
      trustworthy: persistedFileCoverage?.synchronized !== false,
      healthy: fileUniverseGranularity?.healthy !== false,
      summary: `Scanner manifest tracks ${manifestCount} persisted rows for ${scannedCount} discovered files.`,
      evidence: {
        scannedFileTotal: scannedCount,
        manifestFileTotal: manifestCount,
        liveFileCount
      }
    }),
    buildSurface({
      id: 'semantic_connections',
      kind: 'table',
      status: semanticCanonicality?.status === 'drift' ? 'drifting_summary' : 'advisory_only',
      sourceOfTruth: false,
      scope: 'file-level semantic summary',
      surface: 'semantic_connections',
      backingSurface: 'atoms.semantic_metadata',
      trustworthy: semanticCanonicality?.trustworthy !== false,
      healthy: semanticSurfaceGranularity?.materiallyDrifting !== true,
      summary: semanticCanonicality?.summary || `Advisory semantic summary with ${semanticSummaryCount} rows.`,
      evidence: {
        fileLevelTotal: semanticSummaryCount,
        canonicalFileLevelTotal: normalizeCount(semanticSurfaceGranularity?.canonicalAdapterView?.total),
        atomLevelTotal: semanticDetailCount
      }
    }),
    buildSurface({
      id: 'data_gateway_contract',
      kind: 'contract',
      status: dataGatewayContract?.summary?.trustworthy === true
        ? 'canonical'
        : (dataGatewayContract?.summary?.primaryIssue?.state || 'watching'),
      sourceOfTruth: true,
      scope: 'canonical data gateway freshness and coverage gate',
      surface: 'data_gateway_contract',
      backingSurface: 'atoms + files + atom_relations',
      trustworthy: dataGatewayContract?.summary?.trustworthy !== false,
      healthy: dataGatewayContract?.summary?.trustworthy !== false,
      summary: dataGatewayContract?.summary?.nextAction
        || 'Canonical data gateway contract governs freshness, coverage and drift.',
      evidence: {
        state: dataGatewayContract?.summary?.state || null,
        fresh: dataGatewayContract?.summary?.fresh || 0,
        partial: dataGatewayContract?.summary?.partial || 0,
        stale: dataGatewayContract?.summary?.stale || 0,
        missing: dataGatewayContract?.summary?.missing || 0,
        blocked: dataGatewayContract?.summary?.blocked || 0
      }
    }),
    buildSurface({
      id: 'runtime_boundary_surfaces',
      kind: 'surface',
      status: 'canonical',
      sourceOfTruth: true,
      scope: 'runtime boundary checks',
      surface: 'runtime_boundary_surfaces',
      backingSurface: 'runtime-boundary-execution + runtime-boundary-classification + runtime-boundary-recovery',
      trustworthy: true,
      healthy: true,
      summary: 'Canonical runtime boundary surface for async recovery, network execution, and boundary classification.',
      evidence: {
        entrypoints: [
          'executeWithBoundary',
          'executeWithNetworkBoundary',
          'classifyBoundaryError'
        ]
      },
      recommendedAction: 'Keep this as the source of truth.'
    }),
    buildSurface({
      id: 'system_files',
      kind: 'table',
      status: 'mirrored_support',
      sourceOfTruth: false,
      scope: 'mirrored metadata support',
      surface: 'system_files',
      backingSurface: 'files',
      trustworthy: metadataSurfaceParity?.trustworthy !== false,
      healthy: metadataSurfaceParity?.healthy !== false,
      summary: metadataSurfaceParity?.summary || 'Mirrored support metadata surface used for parity checks.',
      evidence: {
        parityStatus: metadataSurfaceParity?.status || 'unknown'
      }
    }),
    buildSurface({
      id: 'metadata_extraction_coverage',
      kind: 'coverage',
      status: metadataExtractionCoverage?.healthy === false ? 'advisory' : 'canonical',
      sourceOfTruth: false,
      scope: 'metadata extraction coverage',
      surface: 'metadata_extraction_coverage',
      backingSurface: 'atoms + files + system_files',
      trustworthy: metadataExtractionCoverage?.trustworthy !== false,
      healthy: metadataExtractionCoverage?.healthy !== false,
      summary: metadataExtractionCoverage?.summary
        ? `Metadata extraction coverage spans ${normalizeCount(metadataExtractionCoverage.summary.totalFields)} tracked field(s) across ${normalizeCount(metadataExtractionCoverage.summary.totalTables)} table(s).`
        : 'Metadata extraction coverage is tracked across atoms, files, and system_files.',
      evidence: {
        totalTables: normalizeCount(metadataExtractionCoverage?.summary?.totalTables),
        totalRows: normalizeCount(metadataExtractionCoverage?.summary?.totalRows),
        totalFields: normalizeCount(metadataExtractionCoverage?.summary?.totalFields),
        coveredFields: normalizeCount(metadataExtractionCoverage?.summary?.coveredFields),
        fieldCoverageRatio: Number(metadataExtractionCoverage?.summary?.fieldCoverageRatio || 0),
        rowCoverageRatio: Number(metadataExtractionCoverage?.summary?.rowCoverageRatio || 0),
        primaryIssue: metadataExtractionCoverage?.primaryIssue || null
      }
    }),
    buildSurface({
      id: 'risk_assessments',
      kind: 'table',
      status: riskCount > 0 ? 'advisory' : 'advisory_only',
      sourceOfTruth: false,
      scope: 'risk advisory support',
      surface: 'risk_assessments',
      backingSurface: 'atoms',
      trustworthy: riskCount > 0,
      healthy: riskCount > 0,
      summary: riskCount > 0
        ? `Risk advisory surface tracks ${riskCount} rows.`
        : 'Risk advisory surface is empty until the runtime repopulates it.',
      evidence: { rows: riskCount }
    }),
    buildSurface({
      id: 'system_map',
      kind: 'table',
      status: 'mirrored_support',
      sourceOfTruth: false,
      scope: 'system map projection',
      surface: 'system_map',
      backingSurface: 'atoms + files',
      trustworthy: systemMapPersistenceCoverage?.healthy !== false,
      healthy: systemMapPersistenceCoverage?.healthy !== false,
      summary: systemMapPersistenceCoverage?.summary || 'System map projection mirrors the canonical relation surfaces.',
      evidence: {
        healthy: systemMapPersistenceCoverage?.healthy !== false,
        liveAtoms: normalizeCount(systemMapPersistenceCoverage?.liveAtomFiles)
      }
    })
  ];
}

export {
  buildSurface,
  buildInvariant
};
