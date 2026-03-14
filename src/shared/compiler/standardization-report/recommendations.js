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

function hasCanonicalRuntimeBoundarySurfacesAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.runtimeBoundarySurfaces === true;
}

function hasCanonicalScannedFileManifestAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.scannedFileManifest === true;
}

export function buildMissingCanonicalSurfaceReport(adoptionGaps = []) {
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

export function buildMissingCanonicalApis({
  driftAreas = [],
  watcherAlerts = [],
  sharedState = {},
  canonicalAdoptions = {},
  persistedFileCoverage = null,
  fileImportEvidenceCoverage = null,
  systemMapPersistenceCoverage = null,
  metadataSurfaceParity = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null
} = {}) {
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

  return missingCanonicalApis;
}
