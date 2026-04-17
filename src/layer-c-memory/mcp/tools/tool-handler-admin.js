import { getFreshModuleSpecifier } from '../tool-module-cache.js';

async function freshCall(specifier, exportName, args, ctx) {
  const mod = await import(getFreshModuleSpecifier(specifier));
  const handler = mod[exportName];
  if (typeof handler !== 'function') {
    throw new Error(`Missing export "${exportName}" in ${specifier}`);
  }
  return handler(args, ctx);
}

export const adminToolHandlers = {
  mcp_omnysystem_get_schema: (args, ctx) => freshCall('./get-schema/schema.js', 'get_schema', args, ctx),
  mcp_omnysystem_get_server_status: (args, ctx) => freshCall('./status.js', 'get_server_status', args, ctx),
  mcp_omnysystem_get_metrics_snapshot: (args, ctx) => freshCall('./get-metrics-snapshot.js', 'get_metrics_snapshot', args, ctx),
  mcp_omnysystem_get_health_snapshot: (args, ctx) => freshCall('./get-health-snapshot.js', 'get_health_snapshot', args, ctx),
  mcp_omnysystem_get_health_panel: (args, ctx) => freshCall('./get-health-panel.js', 'get_health_panel', args, ctx),
  mcp_omnysystem_get_folderization_snapshot: (args, ctx) => freshCall('./get-folderization-snapshot.js', 'get_folderization_snapshot', args, ctx),
  mcp_omnysystem_get_system_inventory_report: (args, ctx) => freshCall('./get-system-inventory.js', 'get_system_inventory_report', args, ctx),
  mcp_omnysystem_get_trust_investigation_report: (args, ctx) => freshCall('./get-trust-investigation-report.js', 'get_trust_investigation_report', args, ctx),
  mcp_omnysystem_get_canonical_promotion_report: (args, ctx) => freshCall('./get-canonical-promotion/index.js', 'get_canonical_promotion_report', args, ctx),
  mcp_omnysystem_get_tool_inventory_report: (args, ctx) => freshCall('./list-tools.js', 'get_tool_inventory_report', args, ctx),
  mcp_omnysystem_list_tools: (args, ctx) => freshCall('./list-tools.js', 'list_tools', args, ctx),
  mcp_omnysystem_get_recent_errors: (args, ctx) => freshCall('./status.js', 'get_recent_errors', args, ctx),
  mcp_omnysystem_restart_server: (args, ctx) => freshCall('./restart-server.js', 'restart_server', args, ctx),
  mcp_omnysystem_detect_performance_hotspots: (args, ctx) => freshCall('./detect-performance-hotspots.js', 'detect_performance_hotspots', args, ctx),
  mcp_omnysystem_execute_sql: (args, ctx) => freshCall('./execute-sql.js', 'execute_sql', args, ctx),
  mcp_omnysystem_get_atom_history: (args, ctx) => freshCall('./get-atom-history.js', 'get_atom_history', args, ctx),
  mcp_omnysystem_diagnose_tool_health: (args, ctx) => freshCall('./diagnose-tool-health/health.js', 'diagnose_tool_health', args, ctx),
  mcp_omnysystem_consolidate_policy_drifts: (args, ctx) => freshCall('./consolidate-policy-drifts.js', 'consolidate_policy_drifts', args, ctx)
};
