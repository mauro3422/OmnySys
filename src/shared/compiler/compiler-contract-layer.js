/**
 * @fileoverview Explicit compiler contract layer.
 *
 * Consolidates the current canonical/advisory/legacy surfaces, the canonical
 * compiler entrypoints, and the invariants that must hold before runtime/MCP
 * code should trust a surface as source of truth.
 *
 * This is intentionally built on top of existing canonical helpers rather than
 * introducing another parallel governance API.
 *
 * @module shared/compiler/compiler-contract-layer
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

function buildCanonicalGovernanceMetrics(policySummary = {}, standardization = null) {
  const byRule = policySummary?.byRule || {};
  const byArea = policySummary?.byPolicyArea || {};
  const missingCanonicalApiCount = normalizeCount(standardization?.summary?.missingCanonicalApiCount);
  const missingCanonicalSurfaceCount = normalizeCount(standardization?.summary?.missingCanonicalSurfaceCount);

  const canonicalWrapperFindings = normalizeCount(byRule.local_canonical_wrapper);
  const canonicalBypassFindings =
    normalizeCount(byRule.canonical_diagnostics_bypass) +
    normalizeCount(byArea.canonical_bypass);
  const parallelCanonicalSurfaceFindings =
    normalizeCount(byRule.local_canonical_helper_without_barrel) +
    normalizeCount(byRule.private_compiler_helper_import) +
    missingCanonicalApiCount +
    missingCanonicalSurfaceCount;

  const totalFindings =
    canonicalWrapperFindings +
    canonicalBypassFindings +
    parallelCanonicalSurfaceFindings;

  return {
    totalFindings,
    canonicalWrapperFindings,
    canonicalBypassFindings,
    parallelCanonicalSurfaceFindings,
    missingCanonicalApiCount,
    missingCanonicalSurfaceCount,
    healthy: totalFindings === 0,
    nextAction: totalFindings > 0
      ? 'Consolidate the active canonical drift findings before adding new wrappers or policy surfaces.'
      : 'No active canonical drift findings; keep extending the existing canonical surfaces.'
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
      trustworthy: metadataSurfaceParity?.healthy !== false,
      healthy: metadataSurfaceParity?.healthy !== false,
      summary: 'Mirrored support surface; never treat as substitute for the primary files table without parity checks.',
      evidence: metadataSurfaceParity || {}
    }),
    buildSurface({
      id: 'file_dependencies',
      kind: 'table',
      status: 'mirrored_support',
      sourceOfTruth: false,
      scope: 'mirrored dependency support',
      surface: 'file_dependencies',
      backingSurface: 'files + atom_relations',
      trustworthy: systemMapPersistenceCoverage?.healthy !== false,
      healthy: systemMapPersistenceCoverage?.healthy !== false,
      summary: 'Support dependency table used by legacy/system-map queries; must stay aligned with canonical persistence coverage.',
      evidence: systemMapPersistenceCoverage || {}
    }),
    buildSurface({
      id: 'risk_assessments',
      kind: 'table',
      status: riskCount > 0 ? 'advisory' : 'advisory_only',
      sourceOfTruth: false,
      scope: 'derived risk telemetry',
      surface: 'risk_assessments',
      backingSurface: 'atoms + relations + metrics',
      trustworthy: riskCount > 0,
      healthy: true,
      summary: riskCount > 0
        ? `Derived risk telemetry is populated (${riskCount} rows) but remains advisory.`
        : 'Risk telemetry is empty; keep treating it as advisory until persistence resumes.',
      evidence: { rows: riskCount }
    })
  ];
}

function buildInvariants({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  semanticCanonicality = null,
  semanticSurfaceGranularity = null,
  systemMapPersistenceCoverage = null,
  tableCounts = {}
} = {}) {
  return [
    buildInvariant({
      id: 'primary_file_metadata_surface',
      status: normalizeCount(tableCounts.files) > 0 ? 'pass' : 'fail',
      severity: 'high',
      message: 'The `files` table is the primary file-level metadata surface.',
      recommendedAction: 'Do not promote mirrored support tables to primary truth; repopulate `files` first if it is empty.',
      evidence: { rows: normalizeCount(tableCounts.files) }
    }),
    buildInvariant({
      id: 'scanner_manifest_alignment',
      status: fileUniverseGranularity?.healthy === false || persistedFileCoverage?.synchronized === false ? 'fail' : 'pass',
      severity: 'high',
      message: 'Discovered files, persisted scanner manifest, and live index must stay aligned through the scanned-file manifest contract.',
      recommendedAction: 'Run scanner discovery through syncPersistedScannedFileManifest before reporting file-universe counts.',
      evidence: {
        persistedFileCoverage,
        fileUniverseGranularity
      }
    }),
    buildInvariant({
      id: 'semantic_summary_is_not_detail',
      status: semanticSurfaceGranularity?.materiallyDrifting === true ? 'fail' : 'pass',
      severity: 'high',
      message: 'File-level semantic summaries must never be treated as equivalent to atom-level semantic relations.',
      recommendedAction: 'Use atom_relations as source of truth and pass semantic_connections through getSemanticSurfaceGranularity.',
      evidence: {
        semanticCanonicality,
        semanticSurfaceGranularity
      }
    }),
    buildInvariant({
      id: 'mirrored_metadata_requires_parity',
      status: metadataSurfaceParity?.healthy === false ? 'fail' : 'pass',
      severity: 'medium',
      message: 'Mirrored metadata support tables must preserve enough richness to back file-level queries safely.',
      recommendedAction: 'Check getMetadataSurfaceParity before serving mirrored metadata as if it were primary.',
      evidence: metadataSurfaceParity || {}
    }),
    buildInvariant({
      id: 'system_map_support_alignment',
      status: systemMapPersistenceCoverage?.healthy === false ? 'fail' : 'pass',
      severity: 'medium',
      message: 'system_files/file_dependencies must stay aligned with canonical persistence and graph output.',
      recommendedAction: 'Repair or validate system-map persistence coverage before legacy queries rely on support tables.',
      evidence: systemMapPersistenceCoverage || {}
    })
  ];
}

function buildApiGovernance(standardization = null, invariants = [], policySummary = {}) {
  const missingCanonicalApis = standardization?.missingCanonicalApis || [];
  const missingCanonicalSurfaces = standardization?.missingCanonicalSurfaces || [];
  const failedInvariantCount = invariants.filter((item) => item.status === 'fail').length;
  const governanceMetrics = buildCanonicalGovernanceMetrics(policySummary, standardization);

  const shouldCreateCanonicalApi =
    missingCanonicalApis.length > 0 ||
    missingCanonicalSurfaces.length > 0 ||
    governanceMetrics.parallelCanonicalSurfaceFindings > 0;

  const shouldBlockNewWrappers =
    failedInvariantCount > 0 ||
    shouldCreateCanonicalApi ||
    governanceMetrics.canonicalWrapperFindings > 0 ||
    governanceMetrics.canonicalBypassFindings > 0;

  return {
    shouldCreateCanonicalApi,
    shouldBlockNewWrappers,
    contractTaxonomy: standardization?.contractTaxonomy || null,
    currentCreationCandidates: missingCanonicalApis,
    missingCanonicalSurfaces,
    governanceMetrics,
    creationRules: [
      'Create a new canonical API only when two or more runtime/MCP surfaces are recomputing the same contract or when standardization reports a missing canonical API.',
      'Do not create a wrapper if an existing canonical entrypoint already exposes the needed truth surface.',
      'If a new API is introduced, deprecate or migrate the parallel wrapper in the same workstream.',
      'Never expose advisory or mirrored support tables without also exposing their contract and backing source of truth.'
    ],
    antiWrapperRules: [
      'No new wrapper without deprecating the old wrapper.',
      'No direct reads from advisory/legacy tables when a canonical contract helper already exists.',
      'No totals comparison across surfaces with different granularity unless the contract explicitly says they are equivalent.'
    ],
    nextAction: governanceMetrics.totalFindings > 0
      ? governanceMetrics.nextAction
      : (standardization?.summary?.nextAction || 'Adopt existing canonical families before creating a new one.')
  };
}

export function buildCompilerContractLayer({
  persistedFileCoverage = null,
  fileUniverseGranularity = null,
  metadataSurfaceParity = null,
  semanticSurfaceGranularity = null,
  semanticCanonicality = null,
  systemMapPersistenceCoverage = null,
  standardization = null,
  policySummary = {},
  tableCounts = {}
} = {}) {
  const surfaces = buildSurfaceInventory({
    persistedFileCoverage,
    fileUniverseGranularity,
    metadataSurfaceParity,
    semanticSurfaceGranularity,
    semanticCanonicality,
    systemMapPersistenceCoverage,
    tableCounts
  });

  const invariants = buildInvariants({
    persistedFileCoverage,
    fileUniverseGranularity,
    metadataSurfaceParity,
    semanticCanonicality,
    semanticSurfaceGranularity,
    systemMapPersistenceCoverage,
    tableCounts
  });

  const apiGovernance = buildApiGovernance(standardization, invariants, policySummary);
  const canonicalEntrypoints = buildCanonicalEntrypoints();
  const failedInvariantCount = invariants.filter((item) => item.status === 'fail').length;
  const advisorySurfaceCount = surfaces.filter((item) => item.status === 'advisory' || item.status === 'advisory_only').length;
  const supportSurfaceCount = surfaces.filter((item) => item.status === 'mirrored_support').length;

  return {
    version: 1,
    summary: {
      canonicalSurfaceCount: surfaces.filter((item) => item.sourceOfTruth).length,
      advisorySurfaceCount,
      supportSurfaceCount,
      failedInvariantCount,
      canonicalWrapperFindings: apiGovernance.governanceMetrics.canonicalWrapperFindings,
      canonicalBypassFindings: apiGovernance.governanceMetrics.canonicalBypassFindings,
      parallelCanonicalSurfaceFindings: apiGovernance.governanceMetrics.parallelCanonicalSurfaceFindings,
      contractTaxonomyCoverage: standardization?.contractTaxonomy?.coverage?.coverageRatio ?? 0,
      healthy: failedInvariantCount === 0,
      mode: failedInvariantCount === 0 ? 'explicit_contract' : 'contract_violation',
      nextAction: apiGovernance.nextAction
    },
    surfaces,
    canonicalEntrypoints,
    invariants,
    apiGovernance
  };
}
