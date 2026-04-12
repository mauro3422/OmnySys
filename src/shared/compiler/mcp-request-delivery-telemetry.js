/**
 * @fileoverview mcp-request-delivery-telemetry.js
 *
 * Telemetría de entrega de requests MCP: mide si la tool se ejecutó,
 * si el resultado quedó listo, y si el response realmente salió por el transporte.
 *
 * @module shared/compiler/mcp-request-delivery-telemetry
 */

/**
 * Construye un evento de telemetría de entrega para persistir en mcp_request_delivery_events.
 *
 * @param {object} params - Parámetros del evento
 * @returns {object} Evento listo para persistir
 */
export function buildMcpRequestDeliveryTelemetry(params = {}) {
  return {
    projectPath: params.projectPath || process.cwd(),
    sessionId: params.sessionId || null,
    clientId: params.clientId || null,
    clientRouteId: params.clientRouteId || null,
    clientName: params.clientName || null,
    transportOrigin: params.transportOrigin || 'unknown',
    transportOriginSource: params.transportOriginSource || 'unknown',
    transportRequestPhase: params.transportRequestPhase || 'unknown',
    transportSessionId: params.transportSessionId || null,
    transportSessionHeaderPresent: params.transportSessionHeaderPresent === true,
    transportHandshakeSignature: params.transportHandshakeSignature || 'unknown',
    requestMethod: params.requestMethod || null,
    requestKind: params.requestKind || null,
    requestId: params.requestId !== undefined ? params.requestId : null,
    toolName: params.toolName || null,
    captureSource: params.captureSource || 'mcp.http',
    requestStartedAt: params.requestStartedAt,
    requestFinishedAt: params.requestFinishedAt || null,
    requestDurationMs: params.requestDurationMs || 0,
    toolOutcomeReadyAt: params.toolOutcomeReadyAt || null,
    responseFinishedAt: params.responseFinishedAt || null,
    responseClosedAt: params.responseClosedAt || null,
    responseStatusCode: params.responseStatusCode || null,
    deliveryState: params.deliveryState || 'unknown',
    deliveryReason: params.deliveryReason || null,
    deliveryLatencyMs: params.deliveryLatencyMs || 0,
    toolOutcomeGapMs: params.toolOutcomeGapMs || 0,
    errorMessage: params.errorMessage || null,
    argsJson: params.argsJson || null,
    createdAt: params.createdAt || new Date().toISOString()
  };
}

/**
 * Persiste un evento de entrega en la tabla mcp_request_delivery_events.
 *
 * @param {object} db - Database connection
 * @param {object} event - Evento de entrega
 * @returns {number|null} Inserted row ID or null
 */
export function persistMcpRequestDeliveryTelemetry(db, event) {
  if (!db || !event) return null;

  try {
    const stmt = db.prepare(`
      INSERT INTO mcp_request_delivery_events (
        project_path, session_id, client_id, client_route_id, client_name,
        transport_origin, transport_origin_source, transport_request_phase,
        transport_session_id, transport_session_header_present,
        transport_handshake_signature, request_method, request_kind, request_id,
        tool_name, capture_source, request_started_at, request_finished_at,
        request_duration_ms, tool_outcome_ready_at, response_finished_at,
        response_closed_at, response_status_code, delivery_state, delivery_reason,
        delivery_latency_ms, tool_outcome_gap_ms, error_message, args_json, created_at
      ) VALUES (
        @project_path, @session_id, @client_id, @client_route_id, @client_name,
        @transport_origin, @transport_origin_source, @transport_request_phase,
        @transport_session_id, @transport_session_header_present,
        @transport_handshake_signature, @request_method, @request_kind, @request_id,
        @tool_name, @capture_source, @request_started_at, @request_finished_at,
        @request_duration_ms, @tool_outcome_ready_at, @response_finished_at,
        @response_closed_at, @response_status_code, @delivery_state, @delivery_reason,
        @delivery_latency_ms, @tool_outcome_gap_ms, @error_message, @args_json, @created_at
      )
    `);

    return stmt.run({
      project_path: event.projectPath || process.cwd(),
      session_id: event.sessionId || null,
      client_id: event.clientId || null,
      client_route_id: event.clientRouteId || null,
      client_name: event.clientName || null,
      transport_origin: event.transportOrigin || null,
      transport_origin_source: event.transportOriginSource || null,
      transport_request_phase: event.transportRequestPhase || null,
      transport_session_id: event.transportSessionId || null,
      transport_session_header_present: event.transportSessionHeaderPresent ? 1 : 0,
      transport_handshake_signature: event.transportHandshakeSignature || null,
      request_method: event.requestMethod || null,
      request_kind: event.requestKind || null,
      request_id: event.requestId !== undefined ? String(event.requestId) : null,
      tool_name: event.toolName || null,
      capture_source: event.captureSource || null,
      request_started_at: event.requestStartedAt,
      request_finished_at: event.requestFinishedAt || null,
      request_duration_ms: event.requestDurationMs || 0,
      tool_outcome_ready_at: event.toolOutcomeReadyAt || null,
      response_finished_at: event.responseFinishedAt || null,
      response_closed_at: event.responseClosedAt || null,
      response_status_code: event.responseStatusCode || null,
      delivery_state: event.deliveryState || null,
      delivery_reason: event.deliveryReason || null,
      delivery_latency_ms: event.deliveryLatencyMs || 0,
      tool_outcome_gap_ms: event.toolOutcomeGapMs || 0,
      error_message: event.errorMessage || null,
      args_json: event.argsJson || null,
      created_at: event.createdAt || new Date().toISOString()
    });
  } catch {
    return null;
  }
}

/**
 * Construye un resumen de entrega de requests desde la DB.
 *
 * @param {object} db - Database connection
 * @param {object} options - Query options
 * @param {string} options.projectPath - Project path
 * @param {string} options.scopePath - Scope path
 * @param {string} options.focusPath - Focus path
 * @param {number} options.windowDays - Window in days
 * @returns {object} Delivery summary
 */
export function buildMcpRequestDeliverySummary(db, options = {}) {
  if (!db?.prepare) {
    return {
      state: 'missing',
      healthy: false,
      total: 0,
      delivered: 0,
      interrupted: 0,
      failed: 0,
      pending: 0,
      unknown: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      toolOutcomeGapMs: 0,
      summary: 'request delivery telemetry unavailable',
      reason: 'Database connection not available.',
      recommendation: 'Enable request delivery telemetry to track MCP response delivery gaps.'
    };
  }

  try {
    const projectPath = options.projectPath || process.cwd();
    const windowDays = options.windowDays || 7;

    const totalRow = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN delivery_state = 'delivered' THEN 1 ELSE 0 END) as delivered,
             SUM(CASE WHEN delivery_state = 'interrupted' THEN 1 ELSE 0 END) as interrupted,
             SUM(CASE WHEN delivery_state = 'failed' THEN 1 ELSE 0 END) as failed,
             SUM(CASE WHEN delivery_state = 'pending' THEN 1 ELSE 0 END) as pending,
             SUM(CASE WHEN delivery_state = 'unknown' THEN 1 ELSE 0 END) as unknown,
             AVG(delivery_latency_ms) as avg_latency_ms,
             AVG(tool_outcome_gap_ms) as avg_tool_outcome_gap_ms
      FROM mcp_request_delivery_events
      WHERE project_path = ?
        AND request_started_at >= datetime('now', ? || ' days')
    `).get(projectPath, `-${windowDays}`);

    const p95Row = db.prepare(`
      SELECT delivery_latency_ms FROM mcp_request_delivery_events
      WHERE project_path = ?
        AND delivery_latency_ms > 0
      ORDER BY delivery_latency_ms DESC
      LIMIT 1 OFFSET (
        SELECT CAST(COUNT(*) * 0.95 AS INTEGER) FROM mcp_request_delivery_events
        WHERE project_path = ? AND delivery_latency_ms > 0
      )
    `).get(projectPath, projectPath);

    const total = totalRow?.total || 0;
    const delivered = totalRow?.delivered || 0;
    const interrupted = totalRow?.interrupted || 0;
    const failed = totalRow?.failed || 0;
    const pending = totalRow?.pending || 0;
    const unknown = totalRow?.unknown || 0;
    const avgLatencyMs = totalRow?.avg_latency_ms ? Math.round(totalRow.avg_latency_ms) : 0;
    const p95LatencyMs = p95Row?.delivery_latency_ms ? Math.round(p95Row.delivery_latency_ms) : 0;
    const toolOutcomeGapMs = totalRow?.avg_tool_outcome_gap_ms ? Math.round(totalRow.avg_tool_outcome_gap_ms) : 0;

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const state = total === 0 ? 'missing' : deliveryRate >= 90 ? 'fresh' : deliveryRate >= 70 ? 'watchful' : 'blocked';

    return {
      state,
      healthy: state === 'fresh',
      total,
      delivered,
      interrupted,
      failed,
      pending,
      unknown,
      avgLatencyMs,
      p95LatencyMs,
      toolOutcomeGapMs,
      deliveryRate,
      summary: total === 0
        ? 'request delivery telemetry not yet populated'
        : `request delivery ${state}: ${deliveryRate}% delivered (${delivered}/${total})`,
      reason: total === 0
        ? 'No request delivery events have been captured yet.'
        : deliveryRate >= 90
          ? `${deliveryRate}% of requests delivered within expected latency.`
          : `${100 - deliveryRate}% of requests had delivery issues (interrupted=${interrupted}, failed=${failed}).`,
      recommendation: total === 0
        ? 'Request delivery telemetry will populate as MCP requests are processed.'
        : deliveryRate >= 90
          ? 'Keep request delivery telemetry active so transport gaps remain visible.'
          : 'Investigate interrupted and failed deliveries for transport or timeout issues.'
    };
  } catch {
    return {
      state: 'missing',
      healthy: false,
      total: 0,
      delivered: 0,
      interrupted: 0,
      failed: 0,
      pending: 0,
      unknown: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      toolOutcomeGapMs: 0,
      summary: 'request delivery telemetry query failed',
      reason: 'Failed to query request delivery events.',
      recommendation: 'Check database health and table schema for mcp_request_delivery_events.'
    };
  }
}
