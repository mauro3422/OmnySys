/**
 * @fileoverview standardization-report.js
 *
 * Reporte canónico para decidir qué familias del compilador ya están
 * estandarizadas, cuáles siguen con deriva en sus consumers y qué nuevas
 * APIs conviene crear según la telemetría viva del sistema.
 *
 * @module shared/compiler/standardization-report
 */

const CANONICAL_COMPILER_FAMILIES = [
  { id: 'duplicates', label: 'Duplicate policy', status: 'canonical' },
  { id: 'impact', label: 'Impact/topology', status: 'canonical' },
  { id: 'file_discovery', label: 'File discovery', status: 'canonical' },
  { id: 'signal_coverage', label: 'Signal coverage', status: 'canonical' },
  { id: 'file_import_evidence', label: 'File import evidence coverage', status: 'canonical' },
  { id: 'system_map_persistence', label: 'System-map persistence coverage', status: 'canonical' },
  { id: 'metadata_surface_parity', label: 'Metadata surface parity', status: 'canonical' },
  { id: 'metadata_propagation', label: 'Metadata propagation drift', status: 'canonical' },
  { id: 'semantic_surface_granularity', label: 'Semantic surface granularity', status: 'canonical' },
  { id: 'file_universe_granularity', label: 'File-universe granularity', status: 'canonical' },
  { id: 'live_row_drift', label: 'Live/stale row drift', status: 'canonical' },
  { id: 'pipeline_orphans', label: 'Pipeline orphan classification', status: 'canonical' },
  { id: 'dead_code', label: 'Dead code reporting/remediation', status: 'canonical' },
  { id: 'watcher_diagnostics', label: 'Watcher diagnostics contract', status: 'canonical' },
  { id: 'watcher_lifecycle', label: 'Watcher diagnostics lifecycle', status: 'canonical' },
  { id: 'runtime_ownership', label: 'Runtime ownership/daemon lock', status: 'canonical' },
  { id: 'state_ownership', label: 'State ownership/singleton policy', status: 'canonical' },
  { id: 'service_boundary', label: 'Service boundary policy', status: 'canonical' },
  { id: 'canonical_extension', label: 'Canonical extension policy', status: 'canonical' },
  { id: 'async_error', label: 'Async error/recovery policy', status: 'canonical' },
  { id: 'shared_state_hotspots', label: 'Shared-state hotspot policy', status: 'canonical' },
  { id: 'centrality_coverage', label: 'Centrality coverage policy', status: 'canonical' },
  { id: 'testability', label: 'Testability policy', status: 'canonical' },
  { id: 'semantic_purity', label: 'Semantic purity policy', status: 'canonical' },
  { id: 'compiler_diagnostics', label: 'Compiler diagnostics', status: 'canonical' },
  { id: 'session_lifecycle', label: 'Session/restart lifecycle', status: 'canonical' },
  { id: 'remediation', label: 'Compiler remediation backlog', status: 'canonical' }
];

function normalizeDriftArea(area, count = 0) {
  return {
    area,
    count,
    status: count > 0 ? 'adoption_gap' : 'stable'
  };
}

function hasRuntimeRestartPressure(watcherAlerts = []) {
  return watcherAlerts.some((alert) =>
    ['src/layer-c-memory/mcp-http-proxy.js', 'src/layer-c-memory/mcp-stdio-bridge.js'].includes(alert?.filePath) &&
    ['arch_circular_high', 'code_complexity_high'].includes(alert?.issueType)
  );
}

function hasSharedStateHotspot(sharedState = {}) {
  const hottest = sharedState?.topContentionKeys?.[0];
  return hottest && Number(hottest.count || 0) >= 100;
}

function hasGuardNoise(watcherAlerts = []) {
  return watcherAlerts.some((alert) =>
    String(alert?.filePath || '').startsWith('src/shared/compiler/') &&
    String(alert?.issueType || '').startsWith('sem_data_flow_')
  );
}

function buildSuggestedTarget(id, priority, rationale, recommendation) {
  return {
    id,
    priority,
    rationale,
    recommendation
  };
}

function hasCanonicalCentralityCoverageAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.centralityCoverage === true;
}

function hasCanonicalSharedStateContentionAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.sharedStateContention === true;
}

function hasCanonicalScannedFileManifestAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.scannedFileManifest === true;
}

function buildCanonicalAdoptionCoverage(canonicalFamilies = [], adoptionGaps = []) {
  const totalFamilies = canonicalFamilies.length;
  const adoptedFamilies = canonicalFamilies.filter((family) =>
    !adoptionGaps.some((gap) => gap.area === family.id)
  ).length;

  return {
    totalFamilies,
    adoptedFamilies,
    adoptionRatio: totalFamilies > 0 ? Number((adoptedFamilies / totalFamilies).toFixed(3)) : 0,
    gapFamilies: adoptionGaps.length
  };
}

function buildMissingCanonicalSurfaceReport(adoptionGaps = []) {
  const byArea = Object.fromEntries(adoptionGaps.map((gap) => [gap.area, gap.count]));
  const surfaces = [];

  if ((byArea.testability || 0) > 0 && (byArea.semantic_purity || 0) > 0) {
    surfaces.push(buildSuggestedTarget(
      'refactoring_signal_surfaces',
      'high',
      'Testability and semantic-purity still surface together across multiple MCP consumers.',
      'Prefer shared evaluation + summary/reporting APIs before adding more per-tool heuristics.'
    ));
  }

  if ((byArea.async_error || 0) > 0 || (byArea.service_boundary || 0) > 0) {
    surfaces.push(buildSuggestedTarget(
      'runtime_boundary_surfaces',
      'medium',
      'Async recovery and service-boundary drift often appear together in runtime-facing modules.',
      'Promote runtime boundary checks through shared compiler APIs before handlers/tools reclassify network and error boundaries inline.'
    ));
  }

  if ((byArea.live_row_drift || 0) > 0 || (byArea.pipeline_orphans || 0) > 0) {
    surfaces.push(buildSuggestedTarget(
      'sync_and_health_surfaces',
      'medium',
      'Health/pipeline reporting still has residual sync-style adoption gaps.',
      'Use canonical synchronization/reporting entrypoints before exposing support-table or orphan metrics in MCP.'
    ));
  }

  if ((byArea.metadata_propagation || 0) > 0) {
    surfaces.push(buildSuggestedTarget(
      'metadata_propagation_surfaces',
      'high',
      'Producer/consumer metadata contracts are drifting across persistence surfaces.',
      'Introduce or adopt a canonical propagation coverage API before mixing legacy and primary metadata tables in runtime code.'
    ));
  }

  if ((byArea.semantic_surface_granularity || 0) > 0) {
    surfaces.push(buildSuggestedTarget(
      'semantic_surface_contracts',
      'medium',
      'Semantic summaries and atom-level semantic relations are being mixed without an explicit granularity contract.',
      'Expose semantic summary/detail comparisons through a canonical granularity API before MCP/query tools compare file-level semantic_connections with atom_relations.'
    ));
  }

  if ((byArea.file_universe_granularity || 0) > 0) {
    surfaces.push(buildSuggestedTarget(
      'file_universe_contracts',
      'medium',
      'Scanner, manifest, and live indexed file counts are being treated as equivalent without an explicit contract.',
      'Expose file-universe granularity through a canonical API before tools treat scanned, manifest, and live indexed counts as the same thing.'
    ));
  }

  return surfaces;
}

export function buildCompilerStandardizationReport({
  policySummary = {},
  watcherAlerts = [],
  sharedState = {},
  compilerRemediation = null,
  canonicalAdoptions = {},
  persistedFileCoverage = null,
  fileImportEvidenceCoverage = null,
  systemMapPersistenceCoverage = null
  ,
  metadataSurfaceParity = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null
} = {}) {
  const driftAreas = Object.entries(policySummary?.byPolicyArea || {})
    .map(([area, count]) => normalizeDriftArea(area, count))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));

  const missingCanonicalApis = [];

  if (hasRuntimeRestartPressure(watcherAlerts)) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'runtime_restart_recovery',
      'high',
      'Bridge/proxy still surface restart-related cycles and complexity hotspots.',
      'Extract restart/recovery flow into a dedicated canonical API so bridge/proxy stop owning lifecycle heuristics inline.'
    ));
  }

  if (
    hasSharedStateHotspot(sharedState) &&
    !driftAreas.some((item) => item.area === 'shared_state_hotspots') &&
    !hasCanonicalSharedStateContentionAdoption(canonicalAdoptions)
  ) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'shared_state_contention',
      'medium',
      'Shared state contention is dominated by a single hot key and lacks a canonical reporting/remediation API.',
      'Create a canonical shared-state contention/reporting API before more MCP tools start reading topContentionKeys ad hoc.'
    ));
  }

  if (hasGuardNoise(watcherAlerts)) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'guard_noise_normalization',
      'medium',
      'Compiler helper files are still generating low-signal integrity warnings.',
      'Create a canonical guard-noise normalization policy so compiler helpers are not treated like product code by default.'
    ));
  }

  if (
    !driftAreas.some((item) => item.area === 'centrality_coverage') &&
    !hasCanonicalCentralityCoverageAdoption(canonicalAdoptions)
  ) {
    const centralityCoverage = watcherAlerts.some((alert) =>
      String(alert?.filePath || '').includes('signal-coverage')
    );
    if (!centralityCoverage) {
      missingCanonicalApis.push(buildSuggestedTarget(
        'centrality_coverage_adoption',
        'low',
        'Centrality coverage is a known weak signal and should stay visible as a first-class compiler policy.',
        'Adopt the canonical centrality coverage policy in health/pipeline/watcher consumers before adding new ad hoc physics checks.'
      ));
    }
  }

  if (
    Number(persistedFileCoverage?.missingFileCount || 0) > 0 &&
    !hasCanonicalScannedFileManifestAdoption(canonicalAdoptions)
  ) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'scanned_file_manifest',
      'medium',
      'The scanner/hash cache sees more files than the persisted compiler manifest currently tracks.',
      'Persist the scanned-file manifest through a canonical compiler API so hash recovery, startup telemetry and file-level coverage read the same file universe.'
    ));
  }

  if (Number(fileImportEvidenceCoverage?.coverageRatio || 0) > 0 && Number(fileImportEvidenceCoverage?.coverageRatio || 0) < 0.5) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'file_import_evidence',
      'medium',
      'File-level import evidence coverage is too sparse to trust reachability warnings uniformly.',
      'Promote a canonical import-evidence coverage API and avoid treating file-level reachability as high-confidence until imports/dependencies telemetry is broadly populated.'
    ));
  }

  if (systemMapPersistenceCoverage?.healthy === false) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'system_map_persistence',
      'high',
      'Legacy system-map tables are expected by several queries/guards, but their persisted coverage is incomplete.',
      'Route system-map persistence checks through a canonical coverage API and keep `system_files` / `file_dependencies` aligned with the graph builder output.'
    ));
  }

  if (metadataSurfaceParity?.healthy === false) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'metadata_surface_parity',
      'high',
      'Primary and mirrored file-level metadata surfaces disagree on payload richness.',
      'Read surface parity from a canonical API before trusting mirrored support tables as a substitute for the primary files surface.'
    ));
  }

  if (semanticSurfaceGranularity?.healthy === false) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'semantic_surface_granularity',
      'medium',
      'Semantic telemetry mixes file-level summaries and atom-level relations without an explicit contract.',
      'Adopt the canonical semantic surface granularity API before consumers treat semantic_connections as equivalent to atom_relations.'
    ));
  }

  if (fileUniverseGranularity?.healthy === false) {
    missingCanonicalApis.push(buildSuggestedTarget(
      'file_universe_granularity',
      'medium',
      'Scanner, manifest, and live indexed file universes are no longer aligned.',
      'Read file-universe differences through a canonical contract before treating scanned files, persisted manifest rows, and live indexed files as interchangeable.'
    ));
  }

  const adoptionGaps = driftAreas.filter((item) => item.count > 0);
  const stableCanonicalFamilies = CANONICAL_COMPILER_FAMILIES.filter((family) =>
    !adoptionGaps.some((gap) => gap.area === family.id)
  );
  const adoptionCoverage = buildCanonicalAdoptionCoverage(CANONICAL_COMPILER_FAMILIES, adoptionGaps);
  const missingCanonicalSurfaces = buildMissingCanonicalSurfaceReport(adoptionGaps);

  const totalRemediationItems = compilerRemediation?.totalItems || 0;
  const nextAction = missingCanonicalApis[0]?.recommendation
    || missingCanonicalSurfaces[0]?.recommendation
    || (adoptionGaps.length > 0
      ? 'Reduce policy drift in existing canonical families before adding new ones.'
      : 'No missing canonical family detected right now; focus on adopting the existing ones consistently.');

  return {
    canonicalFamilies: CANONICAL_COMPILER_FAMILIES,
    stableCanonicalFamilies,
    adoptionGaps,
    adoptionCoverage,
    missingCanonicalApis,
    missingCanonicalSurfaces,
    summary: {
      canonicalFamilyCount: CANONICAL_COMPILER_FAMILIES.length,
      adoptionGapCount: adoptionGaps.length,
      missingCanonicalApiCount: missingCanonicalApis.length,
      missingCanonicalSurfaceCount: missingCanonicalSurfaces.length,
      totalRemediationItems,
      nextAction
    }
  };
}
