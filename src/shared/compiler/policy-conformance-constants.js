export const COMPILER_POLICY_SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium'
};

export const COMPILER_POLICY_AREA = {
  DUPLICATES: 'duplicates',
  IMPACT: 'impact',
  FILE_DISCOVERY: 'file_discovery',
  SIGNAL_COVERAGE: 'signal_coverage',
  LIVE_ROW_DRIFT: 'live_row_drift',
  PIPELINE_ORPHANS: 'pipeline_orphans',
  RUNTIME_OWNERSHIP: 'runtime_ownership',
  STATE_OWNERSHIP: 'state_ownership',
  SERVICE_BOUNDARY: 'service_boundary',
  CANONICAL_EXTENSION: 'canonical_extension',
  DATA_GATEWAY: 'data_gateway',
  ASYNC_ERROR: 'async_error',
  SHARED_STATE_HOTSPOTS: 'shared_state_hotspots',
  CENTRALITY_COVERAGE: 'centrality_coverage',
  TESTABILITY: 'testability',
  SEMANTIC_PURITY: 'semantic_purity',
  METADATA_PROPAGATION: 'metadata_propagation',
  SEMANTIC_SURFACE_GRANULARITY: 'semantic_surface_granularity',
  SUMMARY_PRESENTATION: 'summary_presentation',
  WATCHER_DIAGNOSTICS: 'watcher_diagnostics',
  WATCHER_LIFECYCLE: 'watcher_lifecycle',
  CANONICAL_BYPASS: 'canonical_bypass'
};
