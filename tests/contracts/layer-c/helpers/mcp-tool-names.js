/**
 * @fileoverview MCP Tool Names
 * 
 * Lista de nombres de herramientas MCP para tests de contrato.
 * 
 * @module tests/contracts/layer-c/helpers/mcp-tool-names
 */

export const TOOL_NAMES = [
  'get_impact_map',
  'analyze_change',
  'explain_connection',
  'get_risk_assessment',
  'search_files',
  'get_server_status',
  'get_call_graph',
  'analyze_signature_change',
  'explain_value_flow',
  'get_function_details',
  'restart_server',
  'atomic_edit',
  'atomic_write'
];

export const REQUIRED_TOOL_DEFINITION_FIELDS = ['name', 'description', 'inputSchema'];
