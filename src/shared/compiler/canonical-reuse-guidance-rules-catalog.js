function createImportHint(from, ...symbols) {
  return {
    from,
    symbols: symbols.flat().filter(Boolean)
  };
}

export const RULE_GUIDANCE = {
  manual_topology_scan: {
    existingCanonicalEntryPoint: 'getFileImpactSummary',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getFileImpactSummary'),
    recommendedReplacement: 'Replace local topology walking with getFileImpactSummary / dependency-query helpers.'
  },
  manual_duplicate_sql: {
    existingCanonicalEntryPoint: 'getDuplicateKeySqlForMode',
    recommendedImport: createImportHint('../../../layer-c-memory/storage/repository/utils/index.js', 'getDuplicateKeySqlForMode'),
    recommendedReplacement: 'Build duplicate grouping through duplicate-dna/repository utils instead of embedding dna_json SQL.'
  },
  manual_file_discovery_scan: {
    existingCanonicalEntryPoint: 'discoverProjectSourceFiles',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'discoverProjectSourceFiles'),
    recommendedReplacement: 'Use the canonical file discovery API instead of walking the filesystem inline.'
  },
  manual_signal_coverage_scan: {
    existingCanonicalEntryPoint: 'summarizeDerivedScoreCoverage',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'summarizeDerivedScoreCoverage'),
    recommendedReplacement: 'Read derived score coverage through summarizeDerivedScoreCoverage / classifyFieldCoverage.'
  },
  manual_semantic_coverage_scan: {
    existingCanonicalEntryPoint: 'summarizeSemanticCoverage',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'summarizeSemanticCoverage'),
    recommendedReplacement: 'Reuse summarizeSemanticCoverage instead of rebuilding semantic coverage heuristics.'
  },
  manual_live_row_drift_scan: {
    existingCanonicalEntryPoint: 'getLiveRowDriftSummary',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getLiveRowDriftSummary'),
    recommendedReplacement: 'Reuse getLiveRowDriftSummary / reconciliation helpers instead of hand-rolled stale row SQL.'
  },
  live_row_sync_missing: {
    existingCanonicalEntryPoint: 'ensureLiveRowSync',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'ensureLiveRowSync'),
    recommendedReplacement: 'Use ensureLiveRowSync as the canonical runtime entrypoint so drift is reconciled before reporting support-table counts.'
  },
  manual_pipeline_orphan_scan: {
    existingCanonicalEntryPoint: 'classifyPipelineOrphans',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'classifyPipelineOrphans'),
    recommendedReplacement: 'Use classifyPipelineOrphans / pipeline orphan reporting helpers.'
  },
  manual_runtime_ownership: {
    existingCanonicalEntryPoint: 'readDaemonOwnerLock',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'readDaemonOwnerLock', 'waitForDaemonOwner'),
    recommendedReplacement: 'Reuse runtime ownership APIs instead of open-coding daemon lock lifecycle.'
  },
  manual_shared_state_hotspot_key: {
    existingCanonicalEntryPoint: 'buildCompilerStandardizationReport',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'buildCompilerStandardizationReport'),
    recommendedReplacement: 'Read shared-state contention from canonical compiler/shared-state reporting instead of hardcoding hotspot keys inline.'
  },
  manual_shared_state_hotspot_scan: {
    existingCanonicalEntryPoint: 'buildCompilerStandardizationReport',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'buildCompilerStandardizationReport'),
    recommendedReplacement: 'Promote shared-state hotspot analysis to the canonical compiler reporting layer.'
  },
  overloaded_service_boundary: {
    existingCanonicalEntryPoint: 'canonical service helper',
    recommendedImport: null,
    recommendedReplacement: 'Split the module so each boundary delegates to the canonical service/helper for that concern.'
  },
  missing_compiler_service_bridge: {
    existingCanonicalEntryPoint: 'compiler-persistence helpers',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', [
      'hasPersistedCompilerAnalysis',
      'getPersistedIndexedFilePaths',
      'cleanupOrphanedCompilerArtifacts'
    ]),
    recommendedReplacement: 'Route filesystem + persistence coupling through shared/compiler compiler-persistence helpers instead of opening fs + repository logic inline.'
  },
  scanned_file_manifest: {
    existingCanonicalEntryPoint: 'syncPersistedScannedFileManifest',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'syncPersistedScannedFileManifest', 'getPersistedKnownFilePaths'),
    recommendedReplacement: 'Persist the scanned-file manifest before comparing scanner/hash/index universes so zero-atom files stay visible without forcing duplicate recovery.'
  },
  file_import_evidence: {
    existingCanonicalEntryPoint: 'getFileImportEvidenceCoverage',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getFileImportEvidenceCoverage'),
    recommendedReplacement: 'Measure file-level import evidence coverage before trusting reachability/orphan signals derived from imports_json or dependency tables.'
  },
  system_map_persistence: {
    existingCanonicalEntryPoint: 'getSystemMapPersistenceCoverage',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getSystemMapPersistenceCoverage'),
    recommendedReplacement: 'Validate `system_files` / `file_dependencies` persistence through the canonical coverage API before relying on legacy system-map tables in queries or guards.'
  },
  metadata_surface_parity: {
    existingCanonicalEntryPoint: 'getMetadataSurfaceParity',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getMetadataSurfaceParity'),
    recommendedReplacement: 'Check mirrored surface parity before assuming `system_files` is a faithful substitute for primary file metadata.'
  },
  metadata_extraction_coverage: {
    existingCanonicalEntryPoint: 'getMetadataExtractionCoverage',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getMetadataExtractionCoverage'),
    recommendedReplacement: 'Read metadata extraction coverage through the canonical DB-backed coverage API before hand-building completeness heuristics.'
  },
  metadata_propagation: {
    existingCanonicalEntryPoint: 'getSystemMapPersistenceCoverage',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getSystemMapPersistenceCoverage'),
    recommendedReplacement: 'Before mixing `files`, `system_files`, `file_dependencies`, or file-level coverage signals, read propagation coverage from a canonical API so producers/consumers stay aligned.'
  },
  semantic_surface_granularity: {
    existingCanonicalEntryPoint: 'getSemanticSurfaceGranularity',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getSemanticSurfaceGranularity'),
    recommendedReplacement: 'Read semantic summary/detail contracts through the canonical granularity API before mixing `semantic_connections` with atom semantic metadata.'
  },
  canonical_diagnostics_bypass: {
    existingCanonicalEntryPoint: 'loadCompilerDiagnosticsSnapshot',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'loadCompilerDiagnosticsSnapshot'),
    recommendedReplacement: 'Reuse the canonical compiler diagnostics snapshot instead of recomposing persisted coverage, semantic canonicality, standardization, and contract-layer fields inline.'
  },
  local_canonical_wrapper: {
    existingCanonicalEntryPoint: 'shared/compiler canonical barrel',
    recommendedImport: createImportHint('../../../shared/compiler/index.js'),
    recommendedReplacement: 'Call the canonical shared/compiler entrypoint directly. Only introduce a new wrapper if you are simultaneously promoting it into the canonical layer and migrating parallel call sites.'
  },
  local_barrel_with_logic: {
    existingCanonicalEntryPoint: 'pure barrel / gatekeeper split',
    recommendedImport: createImportHint('../../../shared/compiler/index.js'),
    recommendedReplacement: 'Keep the barrel pure: move local behavior into a dedicated implementation module and leave re-exports in the entrypoint only.'
  },
  file_universe_granularity: {
    existingCanonicalEntryPoint: 'getFileUniverseGranularity',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'getFileUniverseGranularity'),
    recommendedReplacement: 'Explain scanner/manifest/live-index differences through the canonical file-universe contract before treating zero-atom files as missing index coverage.'
  },
  data_gateway_contract: {
    existingCanonicalEntryPoint: 'buildDataGatewayContract',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'buildDataGatewayContract'),
    recommendedReplacement: 'Route freshness, coverage and drift checks through the canonical data gateway contract before letting tools interpret DB projections or support tables independently.'
  },
  manual_summary_recomposition: {
    existingCanonicalEntryPoint: 'buildStatusSummaryPayload',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'buildStatusSummaryPayload', 'loadCompilerDiagnosticsSnapshot'),
    recommendedReplacement: 'Use buildStatusSummaryPayload / loadCompilerDiagnosticsSnapshot instead of rebuilding compilerExplainability, surfaceAudit, databaseHealth, telemetryProvenance, recentErrors, or nodeVitals inline.'
  },
  legacy_helper_contract: {
    existingCanonicalEntryPoint: 'buildCompilerObservabilityContract',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'buildCompilerObservabilityContract', 'buildCompilerSystemInventoryReport', 'buildPropagationLedger', 'buildStatusSummaryPayload'),
    recommendedReplacement: 'Reuse the canonical observability contract so metadata, inventory, and propagation stay aligned instead of rebuilding helper contracts manually.'
  },
  stale_propagation_anchor: {
    existingCanonicalEntryPoint: 'buildPropagationLedger',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'buildPropagationLedger', 'buildStatusSummaryPayload'),
    recommendedReplacement: 'Remove the no-op summarizePropagationPlan anchor; if the helper needs propagation, pass the canonical propagation ledger into the payload contract instead of keeping a dead import for side effects.'
  },
  folderization_contract_drift: {
    existingCanonicalEntryPoint: 'folderize_family / rename_folderized_family / settleMutationFiles',
    recommendedImport: createImportHint('../../../layer-c-memory/mcp/tools/folderize-family.js', 'folderize_family'),
    recommendedReplacement: 'Route folderization plan, execution, settlement and rollback through the canonical folderization transaction pipeline instead of duplicating workflow helpers in legacy modules.'
  },
  runtime_boundary_surfaces: {
    existingCanonicalEntryPoint: 'runAsyncBoundary',
    recommendedImport: createImportHint('../../../shared/compiler/index.js', 'runAsyncBoundary'),
    recommendedReplacement: 'Use the canonical async boundary helper instead of inline try/catch with manual retry logic. For envelope-style results, use executeWithBoundary.'
  },
  mirror_atom_detected: {
    existingCanonicalEntryPoint: 'canonical-concept-reuse-guard',
    recommendedImport: null,
    recommendedReplacement: 'This file duplicates a canonical concept. Delete it and use the canonical API instead. Check the guard output for specific guidance.'
  }
};
