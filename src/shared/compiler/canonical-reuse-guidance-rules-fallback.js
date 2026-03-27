import { RULE_GUIDANCE } from './canonical-reuse-guidance-rules-catalog.js';

export const AREA_FALLBACK_GUIDANCE = {
  impact: RULE_GUIDANCE.manual_topology_scan,
  duplicates: RULE_GUIDANCE.manual_duplicate_sql,
  file_discovery: RULE_GUIDANCE.manual_file_discovery_scan,
  signal_coverage: RULE_GUIDANCE.manual_signal_coverage_scan,
  live_row_drift: RULE_GUIDANCE.manual_live_row_drift_scan,
  pipeline_orphans: RULE_GUIDANCE.manual_pipeline_orphan_scan,
  runtime_ownership: RULE_GUIDANCE.manual_runtime_ownership,
  shared_state_hotspots: RULE_GUIDANCE.manual_shared_state_hotspot_scan,
  metadata_surface_parity: RULE_GUIDANCE.metadata_surface_parity,
  metadata_extraction_coverage: RULE_GUIDANCE.metadata_extraction_coverage,
  metadata_propagation: RULE_GUIDANCE.metadata_propagation,
  semantic_surface_granularity: RULE_GUIDANCE.semantic_surface_granularity,
  async_error: {
    existingCanonicalEntryPoint: 'BaseMCPTool.runRoutedAction',
    recommendedImport: {
      from: '../../../layer-c-memory/mcp/core/shared/base-tools/base-tool.js',
      symbols: ['BaseMCPTool']
    },
    recommendedReplacement: 'Delegate async tool routing through BaseMCPTool.runRoutedAction or another canonical runtime boundary before adding local try/catch wrappers.'
  },
  service_boundary: {
    existingCanonicalEntryPoint: 'BaseMCPTool.runRoutedAction',
    recommendedImport: {
      from: '../../../layer-c-memory/mcp/core/shared/base-tools/base-tool.js',
      symbols: ['BaseMCPTool']
    },
    recommendedReplacement: 'Keep MCP runtime orchestration inside canonical tool boundaries instead of mixing ad hoc async, repository and routing logic inline.'
  },
  canonical_bypass: RULE_GUIDANCE.canonical_diagnostics_bypass,
  file_universe_granularity: RULE_GUIDANCE.file_universe_granularity
};
