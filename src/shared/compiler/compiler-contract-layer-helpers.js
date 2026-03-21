/**
 * @fileoverview Helper builders for the compiler contract layer.
 *
 * Keeps the surface inventory and invariant construction separate from the
 * orchestration layer so the contract file stays thin and easier to extend.
 *
 * @module shared/compiler/compiler-contract-layer-helpers
 */

function normalizeCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function buildSurface({
  id,
  kind,
  status,
  sourceOfTruth = false,
  scope,
  surface,
  backingSurface = null,
  trustworthy = true,
  healthy = true,
  summary,
  evidence = {}
} = {}) {
  return {
    id,
    kind,
    status,
    sourceOfTruth,
    scope,
    surface,
    backingSurface,
    trustworthy,
    healthy,
    summary,
    evidence
  };
}

function buildInvariant({
  id,
  status,
  severity = 'medium',
  message,
  recommendedAction,
  evidence = {}
} = {}) {
  return {
    id,
    status,
    severity,
    message,
    recommendedAction,
    evidence
  };
}

function buildCanonicalEntrypoints() {
  return [
    {
      id: 'discover_project_source_files',
      status: 'canonical',
      entrypoint: 'discoverProjectSourceFiles',
      domain: 'file_discovery'
    },
    {
      id: 'scanned_file_manifest',
      status: 'canonical',
      entrypoint: 'syncPersistedScannedFileManifest',
      domain: 'file_universe'
    },
    {
      id: 'persisted_file_coverage',
      status: 'canonical',
      entrypoint: 'summarizePersistedScannedFileCoverage',
      domain: 'file_universe'
    },
    {
      id: 'live_row_sync',
      status: 'canonical',
      entrypoint: 'ensureLiveRowSync',
      domain: 'runtime_sync'
    },
    {
      id: 'metadata_surface_parity',
      status: 'canonical',
      entrypoint: 'getMetadataSurfaceParity',
      domain: 'metadata_surfaces'
    },
    {
      id: 'system_map_persistence',
      status: 'canonical',
      entrypoint: 'getSystemMapPersistenceCoverage',
      domain: 'metadata_surfaces'
    },
    {
      id: 'semantic_surface_granularity',
      status: 'canonical',
      entrypoint: 'getSemanticSurfaceGranularity',
      domain: 'semantic_surfaces'
    },
    {
      id: 'semantic_canonicality',
      status: 'canonical',
      entrypoint: 'summarizeSemanticCanonicality',
      domain: 'semantic_surfaces'
    },
    {
      id: 'file_universe_granularity',
      status: 'canonical',
      entrypoint: 'getFileUniverseGranularity',
      domain: 'file_universe'
    },
    {
      id: 'compiler_standardization',
      status: 'canonical',
      entrypoint: 'buildCompilerStandardizationReport',
      domain: 'governance'
    }
  ];
}

function buildSurfaceInventory({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  semanticSurfaceGranularity = null,
  semanticCanonicality = null,
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
      status: semanticCanonicality?.status === 'drift' ? 'drifting_summary' : 'advisory',
      sourceOfTruth: false,
      scope: 'file-level semantic summary',
      surface: 'semantic_connections',
      backingSurface: 'atom_relations',
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
      backingSurface: 'atom_relations',
      trustworthy: systemMapPersistenceCoverage?.healthy !== false,
      healthy: systemMapPersistenceCoverage?.healthy !== false,
      summary: systemMapPersistenceCoverage?.summary || 'System map projection mirrors the canonical relation surfaces.',
      evidence: {
        healthy: systemMapPersistenceCoverage?.healthy !== false,
        liveAtoms: normalizeCount(systemMapPersistenceCoverage?.liveAtoms)
      }
    })
  ];
}

export {
  normalizeCount,
  buildSurface,
  buildInvariant,
  buildCanonicalEntrypoints,
  buildSurfaceInventory
};
