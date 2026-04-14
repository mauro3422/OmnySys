import { get_schema } from './get-schema/schema.js';
import { get_server_status, get_recent_errors } from './status.js';
import { get_metrics_snapshot } from './get-metrics-snapshot.js';
import { get_health_snapshot } from './get-health-snapshot.js';
import { get_health_panel } from './get-health-panel.js';
import { get_folderization_snapshot } from './get-folderization-snapshot.js';
import { get_system_inventory_report } from './get-system-inventory.js';
import { get_trust_investigation_report } from './get-trust-investigation-report.js';
import { get_canonical_promotion_report } from './get-canonical-promotion/index.js';
import { restart_server } from './restart-server.js';
import { detect_performance_hotspots } from './detect-performance-hotspots.js';
import { execute_sql } from './execute-sql.js';
import { get_atom_history } from './get-atom-history.js';
import { get_tool_inventory_report, list_tools } from './list-tools.js';
import { diagnose_tool_health } from './diagnose-tool-health/health.js';
import { consolidate_policy_drifts } from './consolidate-policy-drifts.js';

export const adminToolHandlers = {
  mcp_omnysystem_get_schema: get_schema,
  mcp_omnysystem_get_server_status: get_server_status,
  mcp_omnysystem_get_metrics_snapshot: get_metrics_snapshot,
  mcp_omnysystem_get_health_snapshot: get_health_snapshot,
  mcp_omnysystem_get_health_panel: get_health_panel,
  mcp_omnysystem_get_folderization_snapshot: get_folderization_snapshot,
  mcp_omnysystem_get_system_inventory_report: get_system_inventory_report,
  mcp_omnysystem_get_trust_investigation_report: get_trust_investigation_report,
  mcp_omnysystem_get_canonical_promotion_report: get_canonical_promotion_report,
  mcp_omnysystem_get_tool_inventory_report: get_tool_inventory_report,
  mcp_omnysystem_list_tools: list_tools,
  mcp_omnysystem_get_recent_errors: get_recent_errors,
  mcp_omnysystem_restart_server: restart_server,
  mcp_omnysystem_detect_performance_hotspots: detect_performance_hotspots,
  mcp_omnysystem_execute_sql: execute_sql,
  mcp_omnysystem_get_atom_history: get_atom_history,
  mcp_omnysystem_diagnose_tool_health: diagnose_tool_health,
  mcp_omnysystem_consolidate_policy_drifts: consolidate_policy_drifts
};
