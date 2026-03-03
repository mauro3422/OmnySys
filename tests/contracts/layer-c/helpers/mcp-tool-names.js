/**
 * @fileoverview MCP Tool Names
 * 
 * Lista de nombres de herramientas MCP para tests de contrato.
 * 
 * @module tests/contracts/layer-c/helpers/mcp-tool-names
 */

export const TOOL_NAMES = [
  'mcp_omnysystem_query_graph',
  'mcp_omnysystem_traverse_graph',
  'mcp_omnysystem_aggregate_metrics',
  'mcp_omnysystem_atomic_edit',
  'mcp_omnysystem_atomic_write',
  'mcp_omnysystem_move_file',
  'mcp_omnysystem_fix_imports',
  'mcp_omnysystem_execute_solid_split',
  'mcp_omnysystem_suggest_refactoring',
  'mcp_omnysystem_validate_imports',
  'mcp_omnysystem_generate_tests',
  'mcp_omnysystem_generate_batch_tests',
  'mcp_omnysystem_get_schema',
  'mcp_omnysystem_get_server_status',
  'mcp_omnysystem_get_recent_errors',
  'mcp_omnysystem_restart_server',
  'mcp_omnysystem_detect_performance_hotspots'
];

export const REQUIRED_TOOL_DEFINITION_FIELDS = ['name', 'description', 'inputSchema'];
