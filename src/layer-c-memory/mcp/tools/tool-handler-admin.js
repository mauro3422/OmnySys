import { get_schema } from './get-schema.js';
import { get_server_status, get_recent_errors } from './status.js';
import { restart_server } from './restart-server.js';
import { detect_performance_hotspots } from './detect-performance-hotspots.js';
import { execute_sql } from './execute-sql.js';
import { get_atom_history } from './get-atom-history.js';

export const adminToolHandlers = {
  mcp_omnysystem_get_schema: get_schema,
  mcp_omnysystem_get_server_status: get_server_status,
  mcp_omnysystem_get_recent_errors: get_recent_errors,
  mcp_omnysystem_restart_server: restart_server,
  mcp_omnysystem_detect_performance_hotspots: detect_performance_hotspots,
  mcp_omnysystem_execute_sql: execute_sql,
  mcp_omnysystem_get_atom_history: get_atom_history
};
