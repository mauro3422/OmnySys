import { query_graph } from './query-graph.js';
import { traverse_graph } from './traverse-graph.js';
import { impact_atomic } from './impact-atomic.js';
import { aggregate_metrics } from './aggregate-metrics.js';
import { technical_debt_report } from './technical-debt-report.js';
import { check_pipeline_integrity } from './check-pipeline-integrity.js';

export const queryToolHandlers = {
  mcp_omnysystem_query_graph: query_graph,
  mcp_omnysystem_traverse_graph: traverse_graph,
  mcp_omnysystem_impact_atomic: impact_atomic,
  mcp_omnysystem_aggregate_metrics: aggregate_metrics,
  mcp_omnysystem_get_technical_debt_report: technical_debt_report,
  mcp_omnysystem_check_pipeline_integrity: check_pipeline_integrity
};
