/**
 * @fileoverview missing-surface-audit-guard.js
 * Detects DB tables that have data but no canonical surface/API to read them.
 *
 * Pattern: If a table has rows but no file in src/shared/compiler/ or MCP tools
 * provides a canonical read API, the control plane will show "unknown"/"missing"
 * for that component (Proxy, Bridge, Topology, etc.).
 *
 * This guard closes the loop: it tells the system "you have data but nobody reads it."
 */

import { safeJson } from '#shared/compiler/index.js';

// Canonical table registry: each table maps to its expected surface files
const CANONICAL_SURFACE_REGISTRY = [
  // Core graph surfaces — HAVE surfaces ✅
  { table: 'atoms', component: 'atom_graph', requiredFiles: ['query_graph', 'get-schema'], hasSurface: true },
  { table: 'files', component: 'file_metadata', requiredFiles: ['data_gateway_contract'], hasSurface: true },
  { table: 'atom_relations', component: 'dependency_graph', requiredFiles: ['traverse_graph', 'impact_atomic'], hasSurface: true },
  { table: 'semantic_connections', component: 'semantic_layer', requiredFiles: ['semantic-handler'], hasSurface: true },
  { table: 'system_files', component: 'system_manifest', requiredFiles: ['data_gateway_contract'], hasSurface: true },
  { table: 'compiler_metrics_snapshots', component: 'metrics_history', requiredFiles: ['get_metrics_snapshot', 'get_health_panel'], hasSurface: true },
  { table: 'atom_versions', component: 'atom_history', requiredFiles: ['get_atom_history'], hasSurface: true },
  { table: 'cache_entries', component: 'cache_layer', requiredFiles: ['cache-manager'], hasSurface: true },

  // Runtime telemetry surfaces — MISSING surfaces ❌
  { table: 'mcp_topology_events', component: 'topology', requiredFiles: ['mcp-topology-surface'], hasSurface: false,
    description: 'MCP topology events (connect/disconnect, client routing)',
    controlPlaneField: 'Topology' },
  { table: 'mcp_request_delivery_events', component: 'bridge', requiredFiles: ['bridge-telemetry-surface'], hasSurface: false,
    description: 'MCP request delivery telemetry (latency, errors, routing)',
    controlPlaneField: 'Bridge' },
  { table: 'mcp_tool_runs', component: 'tool_telemetry', requiredFiles: ['tool-runs-surface'], hasSurface: false,
    description: 'MCP tool execution telemetry (success rates, duration)',
    controlPlaneField: 'Tools' },
  { table: 'mcp_sessions', component: 'sessions', requiredFiles: ['sessions-surface'], hasSurface: false,
    description: 'MCP session lifecycle and lineage',
    controlPlaneField: 'Sessions' },

  // Analysis surfaces — MISSING or PARTIAL
  { table: 'atom_events', component: 'atom_events', requiredFiles: ['atom-events-surface'], hasSurface: false,
    description: 'Atom-level event tracking (emitters, listeners lifecycle)' },
  { table: 'societies', component: 'societies', requiredFiles: ['societies-surface'], hasSurface: false,
    description: 'Functional cohesion clusters (society clustering results)' },
  { table: 'file_dependencies', component: 'file_dependencies', requiredFiles: ['file-deps-surface'], hasSurface: false,
    description: 'File-level dependency graph' },
  { table: 'risk_assessments', component: 'risk', requiredFiles: ['aggregate_metrics'], hasSurface: 'partial',
    description: 'Risk assessments per atom/file' },
];

const MIN_ROWS_TO_REPORT = 1; // Only report if table has data

/**
 * Detects tables with data but no canonical read surface.
 * @param {object} ctx - Guard context with db
 * @returns {Promise<Array>} Array of findings
 */
export async function detectMissingSurfaceAudit(ctx) {
  const db = ctx?.db;
  if (!db) return [];

  const findings = [];

  try {
    for (const entry of CANONICAL_SURFACE_REGISTRY) {
      if (entry.hasSurface === true) continue; // Skip tables that already have surfaces

      // Check if table has data
      let rowCount = 0;
      try {
        const result = db.prepare(`SELECT COUNT(*) as cnt FROM ${entry.table}`).get();
        rowCount = result?.cnt || 0;
      } catch {
        continue; // Table might not exist yet
      }

      if (rowCount < MIN_ROWS_TO_REPORT) continue;

      const severity = entry.hasSurface === 'partial' ? 'medium' : 'high';
      const isCritical = ['mcp_topology_events', 'mcp_request_delivery_events', 'mcp_tool_runs'].includes(entry.table);
      const finalSeverity = isCritical ? 'critical' : severity;

      findings.push({
        type: 'missing_surface',
        severity: finalSeverity,
        description: `Table "${entry.table}" has ${rowCount} rows but no canonical read surface in compiler/MCP tools. ` +
          `Control plane will show "${entry.controlPlaneField || entry.component}=unknown/missing". ` +
          `Missing surface file: src/shared/compiler/${entry.requiredFiles[0]}.js`,
        filePath: `src/shared/compiler/${entry.requiredFiles[0]}.js`,
        symbol: `load${capitalize(entry.component)}`,
        context_json: safeJson({
          table: entry.table,
          rowCount,
          component: entry.component,
          requiredSurfaceFile: `src/shared/compiler/${entry.requiredFiles[0]}.js`,
          description: entry.description || '',
          controlPlaneField: entry.controlPlaneField || null,
          checkType: 'missing_canonical_surface',
          suggestedFix: `Create canonical surface: export function load${capitalize(entry.component)}(db) { ... } in src/shared/compiler/${entry.requiredFiles[0]}.js`
        }),
        suggestion: `Create src/shared/compiler/${entry.requiredFiles[0]}.js with a canonical load${capitalize(entry.component)}(db) function that reads from ${entry.table}. Register in data_gateway_contract.surfaces.`
      });
    }
  } catch (err) {
    // Guard should never throw
  }

  return findings;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default detectMissingSurfaceAudit;
