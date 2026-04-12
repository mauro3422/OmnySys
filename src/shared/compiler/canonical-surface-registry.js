/**
 * @fileoverview canonical-surface-registry.js
 * Central registry of all canonical surfaces in OmnySystem.
 *
 * Each surface maps a DB table (source of truth) to:
 *  - A canonical read API function
 *  - The file that exports it
 *  - The control plane field it populates
 *  - Its propagation state
 *
 * This registry is the source of truth for:
 *  - missing-surface-audit-guard (detects gaps)
 *  - data_gateway_contract (validates freshness)
 *  - control_plane_dashboard (shows component state)
 *  - propagation_engine (tracks adoption)
 */

export const CANONICAL_SURFACE_REGISTRY = {
  // ─── Graph Core (complete) ───
  atom_graph: {
    table: 'atoms',
    rowCount: 14827,
    loadFn: 'query_graph',
    file: 'src/layer-c-memory/mcp/tools/query-graph.js',
    controlPlaneField: 'Database',
    state: 'canonical',
    description: 'Primary atom graph with centrality, DNA, data flow'
  },
  file_metadata: {
    table: 'files',
    loadFn: 'data_gateway_contract',
    file: 'src/shared/compiler/data-gateway-contract.js',
    controlPlaneField: 'Database',
    state: 'canonical',
    description: 'File-level metadata and freshness tracking'
  },
  dependency_graph: {
    table: 'atom_relations',
    loadFn: 'traverse_graph',
    file: 'src/layer-c-memory/mcp/tools/traverse-graph.js',
    controlPlaneField: 'Database',
    state: 'canonical',
    description: 'Call graph and dependency edges'
  },
  semantic_layer: {
    table: 'semantic_connections',
    loadFn: 'loadSemanticConnections',
    file: 'src/layer-c-memory/storage/repository/adapters/helpers/system-map/handlers/semantic-handler.js',
    controlPlaneField: 'Database',
    state: 'canonical',
    description: 'High-level semantic connections (events, shared state, env vars)'
  },
  atom_history: {
    table: 'atom_versions',
    loadFn: 'get_atom_history',
    file: 'src/layer-c-memory/mcp/tools/get-atom-history.js',
    controlPlaneField: 'History',
    state: 'canonical',
    description: 'Version history of atoms across Git commits'
  },
  metrics_history: {
    table: 'compiler_metrics_snapshots',
    loadFn: 'get_metrics_snapshot',
    file: 'src/layer-c-memory/mcp/tools/get-metrics-snapshot.js',
    controlPlaneField: 'Snapshots',
    state: 'canonical',
    description: 'Health and metrics snapshots over time'
  },

  // ─── Runtime Telemetry (4/4 complete) ───
  topology: {
    table: 'mcp_topology_events',
    rowCount: 18,
    loadFn: 'loadTopology',
    file: 'src/shared/compiler/mcp-topology-surface.js',
    controlPlaneField: 'Topology',
    state: 'canonical',
    description: 'MCP topology events (client connect/disconnect, routing changes)'
  },
  bridge_telemetry: {
    table: 'mcp_request_delivery_events',
    rowCount: 119,
    loadFn: 'loadBridgeTelemetry',
    file: 'src/shared/compiler/bridge-telemetry-surface.js',
    controlPlaneField: 'Bridge',
    state: 'canonical',
    description: 'MCP request delivery telemetry (latency, errors, routing decisions)'
  },
  tool_telemetry: {
    table: 'mcp_tool_runs',
    rowCount: 55,
    loadFn: 'loadToolRuns',
    file: 'src/shared/compiler/tool-runs-surface.js',
    controlPlaneField: 'Tools',
    state: 'canonical',
    description: 'MCP tool execution telemetry (success rate, duration, repair outcomes)'
  },
  session_lifecycle: {
    table: 'mcp_sessions',
    rowCount: 3,
    loadFn: 'loadSessions',
    file: 'src/shared/compiler/sessions-surface.js',
    controlPlaneField: 'Sessions',
    state: 'canonical',
    description: 'MCP session lifecycle, lineage, and client synchronization'
  },

  // ─── Analysis Surfaces (3/3 now complete!) ───
  atom_events: {
    table: 'atom_events',
    rowCount: 29586,
    loadFn: 'loadAtomEvents',
    file: 'src/shared/compiler/atom-events-surface.js',
    controlPlaneField: 'Events',
    state: 'canonical',
    description: 'Atom-level events (emitters, listeners, lifecycle transitions) — LARGEST table now surfaced'
  },
  societies: {
    table: 'societies',
    rowCount: 1828,
    loadFn: 'loadSocieties',
    file: 'src/shared/compiler/societies-surface.js',
    controlPlaneField: 'Societies',
    state: 'canonical',
    description: 'Functional cohesion clusters (1,828 society clustering results)'
  },
  file_dependencies: {
    table: 'file_dependencies',
    rowCount: 4542,
    loadFn: 'loadFileDependencies',
    file: 'src/shared/compiler/file-deps-surface.js',
    controlPlaneField: 'FileDeps',
    state: 'canonical',
    description: 'File-level dependency graph (4,542 import/export edges)'
  },
  risk_assessments: {
    table: 'risk_assessments',
    loadFn: 'aggregate_metrics',
    file: 'src/layer-c-memory/mcp/tools/aggregate-metrics.js',
    controlPlaneField: 'Risk',
    state: 'partial',
    description: 'Risk assessments per atom/file (only accessible via aggregate_metrics)'
  },
  semantic_surface_contracts: {
    table: 'semantic_connections',
    loadFn: 'buildSemanticGranularityComparison',
    file: 'src/shared/compiler/semantic-granularity-api.js',
    controlPlaneField: 'SemanticGranularity',
    state: 'canonical',
    description: 'Semantic summary vs detail comparison contract (file-level vs atom-level granularity)'
  },

  // ─── Internal/Infrastructure (no surface needed) ───
  cache_entries: {
    table: 'cache_entries',
    loadFn: 'internal',
    file: 'src/core/cache/manager/',
    controlPlaneField: 'Cache',
    state: 'internal',
    description: 'In-memory/SQLite cache — managed internally, no public surface needed'
  },
  file_hashes: {
    table: 'file_hashes',
    loadFn: 'internal',
    file: 'src/layer-a-static/',
    controlPlaneField: null,
    state: 'internal',
    description: 'File hash tracking for incremental analysis — internal only'
  },
  system_files: {
    table: 'system_files',
    loadFn: 'data_gateway_contract',
    file: 'src/shared/compiler/data-gateway-contract.js',
    controlPlaneField: 'Aduana',
    state: 'canonical',
    description: 'System file manifest with semantic summaries'
  }
};

/**
 * Returns surfaces that are missing canonical APIs.
 * @returns {Array} List of surfaces needing implementation
 */
export function getMissingSurfaces() {
  return Object.entries(CANONICAL_SURFACE_REGISTRY)
    .filter(([_, surface]) => surface.state === 'missing_surface')
    .map(([key, surface]) => ({
      key,
      table: surface.table,
      controlPlaneField: surface.controlPlaneField,
      suggestedFile: surface.suggestedFile,
      description: surface.description
    }));
}

/**
 * Returns a summary of surface coverage.
 * @returns {object} Coverage summary
 */
export function getSurfaceCoverageSummary() {
  const all = Object.values(CANONICAL_SURFACE_REGISTRY);
  const canonical = all.filter(s => s.state === 'canonical').length;
  const missing = all.filter(s => s.state === 'missing_surface').length;
  const partial = all.filter(s => s.state === 'partial').length;
  const internal = all.filter(s => s.state === 'internal').length;

  return {
    total: all.length,
    canonical,
    missing,
    partial,
    internal,
    coveragePct: all.length > 0 ? Math.round(((canonical + partial) / (all.length - internal)) * 100) : 0
  };
}

export default CANONICAL_SURFACE_REGISTRY;
