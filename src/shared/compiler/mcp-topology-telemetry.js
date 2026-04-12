/**
 * @fileoverview mcp-topology-telemetry.js
 *
 * Persistencia y construcción de eventos de topología MCP.
 * Cubre: session lineage, bridge state, proxy heartbeat, transport drift, alert lifecycle.
 *
 * @module shared/compiler/mcp-topology-telemetry
 */

/**
 * Persiste un evento de topología MCP en la tabla mcp_topology_events.
 *
 * @param {object} db - Database connection
 * @param {object} event - Topology event
 * @param {string} event.projectPath - Project path
 * @param {string} event.captureSource - Source: session.manager, bridge, proxy, transport, watcher
 * @param {string} event.snapshotKind - Type: session, bridge, proxy, transport, manual
 * @param {string} event.eventType - Event type: session_reused, session_reconciled, bridge_reconnect, proxy_heartbeat, transport_drift, alert_lifecycle, call_impact
 * @param {string} [event.component] - Component: session, bridge, proxy, transport, alert
 * @param {string} [event.state] - State: fresh, watchful, blocked, missing
 * @param {string} [event.severity] - Severity: low, medium, high
 * @param {string} [event.clientId] - Client ID
 * @param {string} [event.clientRouteId] - Client route ID
 * @param {string} [event.clientName] - Client name
 * @param {string} [event.sessionId] - Current session ID
 * @param {string} [event.previousSessionId] - Replaced session ID
 * @param {string} [event.transportOrigin] - Transport origin
 * @param {string} [event.transportOriginSource] - Transport origin source
 * @param {string} [event.transportRequestPhase] - Transport request phase
 * @param {string} [event.bridgeState] - Bridge state
 * @param {string} [event.proxyState] - Proxy state
 * @param {string} [event.daemonState] - Daemon state
 * @param {string} [event.requestDeliveryState] - Request delivery state
 * @param {string} [event.alertState] - Alert state
 * @param {string} [event.alertCode] - Alert code
 * @param {string} [event.alertLifecycle] - Alert lifecycle
 * @param {string} [event.callImpactState] - Call impact state
 * @param {string} [event.reason] - Reason
 * @param {string} [event.recommendation] - Recommendation
 * @param {string} [event.evidenceJson] - Evidence JSON string
 * @param {string} [event.metadataJson] - Metadata JSON string
 * @param {string} [event.capturedAt] - Captured at timestamp
 * @returns {number|null} Inserted row ID or null
 */
export function persistMcpTopologyTelemetry(db, event) {
  if (!db || !event) return null;

  try {
    const now = event.capturedAt || new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO mcp_topology_events (
        project_path, capture_source, snapshot_kind, event_type, component,
        state, severity, client_id, client_route_id, client_name,
        session_id, previous_session_id, transport_origin, transport_origin_source,
        transport_request_phase, bridge_state, proxy_state, daemon_state,
        request_delivery_state, alert_state, alert_code, alert_lifecycle,
        call_impact_state, reason, recommendation, evidence_json, metadata_json,
        captured_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event.projectPath || process.cwd(),
      event.captureSource || 'manual',
      event.snapshotKind || 'manual',
      event.eventType,
      event.component || null,
      event.state || null,
      event.severity || null,
      event.clientId || null,
      event.clientRouteId || null,
      event.clientName || null,
      event.sessionId || null,
      event.previousSessionId || null,
      event.transportOrigin || null,
      event.transportOriginSource || null,
      event.transportRequestPhase || null,
      event.bridgeState || null,
      event.proxyState || null,
      event.daemonState || null,
      event.requestDeliveryState || null,
      event.alertState || null,
      event.alertCode || null,
      event.alertLifecycle || null,
      event.callImpactState || null,
      event.reason || null,
      event.recommendation || null,
      event.evidenceJson || null,
      event.metadataJson || null,
      now,
      now
    );

    return result.lastInsertRowid;
  } catch (error) {
    // Silently fail - topology events are non-critical
    return null;
  }
}

/**
 * Construye un resumen de topología MCP desde un metrics snapshot.
 *
 * @param {object} metricsSnapshot - Metrics snapshot
 * @returns {object} Topology summary
 */
export function buildMcpTopologyTelemetry(metricsSnapshot) {
  const current = metricsSnapshot?.current || {};
  const transportProvenance = current.transportProvenance || {};
  const transportAlerts = current.transportAlerts || [];
  const sessionMetrics = current.sessionMetrics || {};

  const hasKnownProvenance = current.transportOriginTotal > 0;
  const originCounts = current.transportOriginCounts || {};
  const originMix = current.transportOriginMix || [];

  return {
    state: current.topologyState || (hasKnownProvenance ? 'watchful' : 'missing'),
    healthy: current.transportProvenanceHealthy === true,
    trustworthy: current.transportProvenanceTrustworthy === true,
    reason: current.transportProvenanceReason || 'Topology telemetry unavailable.',
    recommendation: current.transportProvenanceRecommendation || 'Attach explicit transport provenance.',
    summary: current.transportProvenanceSummary || 'topology unavailable',
    transportOriginCounts: originCounts,
    transportOriginTotal: current.transportOriginTotal || 0,
    transportOriginDistinctCount: current.transportOriginDistinctCount || 0,
    dominantTransportOrigin: current.dominantTransportOrigin || 'unknown',
    transportAlertState: current.transportAlertState || 'missing',
    transportAlertCount: transportAlerts.length || current.transportAlertCount || 0,
    transportAlerts,
    sessionMetrics: {
      runtimeSessions: sessionMetrics.runtimeSessions,
      totalPersistentActive: sessionMetrics.totalPersistentActive,
      uniqueClients: sessionMetrics.uniqueClients,
      clientsWithDuplicates: sessionMetrics.clientsWithDuplicates,
      sessionCountDrift: sessionMetrics.sessionCountDrift,
      multiClientChurn: sessionMetrics.multiClientChurn
    },
    event: hasKnownProvenance ? {
      eventType: 'topology_snapshot',
      component: 'topology',
      state: current.transportProvenanceState || 'watchful',
      severity: current.transportAlertState === 'blocked' ? 'high' : 'low',
      reason: current.transportProvenanceReason,
      recommendation: current.transportProvenanceRecommendation,
      evidenceJson: JSON.stringify({
        originCounts,
        originMix,
        alertState: current.transportAlertState,
        alertCount: current.transportAlertCount
      })
    } : null
  };
}

/**
 * Construye un resumen de topología para el status panel.
 *
 * @param {object} topologyResult - Result from buildMcpTopologyTelemetry
 * @returns {object} Topology summary for status
 */
export function buildMcpTopologySummary(topologyResult) {
  if (!topologyResult) {
    return {
      state: 'missing',
      healthy: false,
      trustworthy: false,
      reason: 'Topology telemetry not available.',
      recommendation: 'Enable transport provenance tracking.',
      summary: 'topology missing'
    };
  }

  return {
    state: topologyResult.state,
    healthy: topologyResult.healthy,
    trustworthy: topologyResult.trustworthy,
    reason: topologyResult.reason,
    recommendation: topologyResult.recommendation,
    summary: topologyResult.summary,
    transportOriginCounts: topologyResult.transportOriginCounts,
    transportAlertState: topologyResult.transportAlertState,
    transportAlertCount: topologyResult.transportAlertCount
  };
}
