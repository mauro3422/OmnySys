/**
 * @fileoverview bridge-telemetry-surface.js
 * Canonical surface for MCP request delivery events.
 *
 * Source of truth: mcp_request_delivery_events table (119+ rows)
 * Control plane field: Bridge
 *
 * Exposes bridge latency, delivery success rates, error patterns,
 * and routing decisions as canonical read APIs.
 */

/**
 * Loads bridge telemetry summary from canonical events.
 * @param {object} db - SQLite database connection
 * @param {object} [options] - Query options
 * @param {number} [options.lastN=100] - Number of recent events
 * @returns {object} Bridge telemetry summary
 */
export function loadBridgeTelemetry(db, options = {}) {
  const { lastN = 100 } = options;

  // Overall stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_events,
      COUNT(CASE WHEN delivery_status = 'success' THEN 1 END) as success_count,
      COUNT(CASE WHEN delivery_status = 'error' THEN 1 END) as error_count,
      COUNT(CASE WHEN delivery_status = 'timeout' THEN 1 END) as timeout_count,
      AVG(CASE WHEN delivery_latency_ms IS NOT NULL AND delivery_latency_ms > 0 THEN delivery_latency_ms END) as avg_latency_ms,
      MIN(CASE WHEN delivery_latency_ms IS NOT NULL AND delivery_latency_ms > 0 THEN delivery_latency_ms END) as min_latency_ms,
      MAX(delivery_latency_ms) as max_latency_ms,
      MIN(created_at) as first_event,
      MAX(created_at) as last_event
    FROM mcp_request_delivery_events
  `).get();

  // Recent events
  const recentEvents = db.prepare(`
    SELECT event_type, delivery_status, delivery_latency_ms, tool_name,
           client_id, error_message, created_at, request_id
    FROM mcp_request_delivery_events
    ORDER BY id DESC
    LIMIT ?
  `).all(lastN);

  // Latency percentiles
  const p95 = db.prepare(`
    SELECT delivery_latency_ms FROM mcp_request_delivery_events
    WHERE delivery_latency_ms IS NOT NULL AND delivery_latency_ms > 0
    ORDER BY delivery_latency_ms
    LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.95 AS INTEGER) FROM mcp_request_delivery_events WHERE delivery_latency_ms IS NOT NULL)
  `).get();

  // By tool
  const byTool = db.prepare(`
    SELECT tool_name, COUNT(*) as count,
           AVG(CASE WHEN delivery_latency_ms > 0 THEN delivery_latency_ms END) as avg_latency,
           COUNT(CASE WHEN delivery_status = 'error' THEN 1 END) as errors
    FROM mcp_request_delivery_events
    WHERE tool_name IS NOT NULL
    GROUP BY tool_name
    ORDER BY count DESC
    LIMIT 20
  `).all();

  const successRate = stats?.total_events > 0
    ? ((stats.success_count || 0) / stats.total_events * 100).toFixed(1)
    : 0;

  return {
    state: 'canonical',
    sourceTable: 'mcp_request_delivery_events',
    rowCount: stats?.total_events || 0,
    stats: stats || {},
    successRate: parseFloat(successRate),
    p95LatencyMs: p95?.delivery_latency_ms || null,
    recentEvents: (recentEvents || []).reverse(),
    byTool: byTool || [],
    summary: buildBridgeSummary(stats, successRate, p95)
  };
}

function buildBridgeSummary(stats, successRate, p95) {
  if (!stats || stats.total_events === 0) return 'bridge=no_events';
  return `bridge=${stats.total_events}events | ${successRate}%ok | avg=${Math.round(stats.avg_latency_ms || 0)}ms | p95=${p95?.delivery_latency_ms || '?'}ms`;
}

/**
 * Gets bridge control plane status.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane bridge status
 */
export function getBridgeControlPlaneStatus(db) {
  const telemetry = loadBridgeTelemetry(db, { lastN: 20 });

  if (telemetry.rowCount === 0) {
    return {
      state: 'missing',
      reason: 'No bridge delivery events recorded',
      recommendation: 'Bridge events are emitted during MCP request routing.'
    };
  }

  return {
    state: telemetry.successRate >= 90 ? 'ready' : telemetry.successRate >= 70 ? 'watching' : 'degraded',
    totalEvents: telemetry.rowCount,
    successRate: telemetry.successRate,
    avgLatencyMs: Math.round(telemetry.stats?.avg_latency_ms || 0),
    p95LatencyMs: telemetry.p95LatencyMs,
    errorCount: telemetry.stats?.error_count || 0,
    lastEventAt: telemetry.stats?.last_event || null,
    summary: telemetry.summary
  };
}

export default { loadBridgeTelemetry, getBridgeControlPlaneStatus };
