/**
 * @fileoverview mcp-topology-surface.js
 * Canonical surface for MCP topology events.
 *
 * Source of truth: mcp_topology_events table
 * Control plane field: Topology
 *
 * This surface exposes client connection lifecycle, routing changes,
 * and topology state transitions as a canonical read API.
 */

/**
 * Loads the current topology state from canonical events.
 * @param {object} db - SQLite database connection
 * @param {object} [options] - Query options
 * @param {number} [options.lastN=50] - Number of recent events to analyze
 * @returns {object} Topology summary
 */
export function loadTopology(db, options = {}) {
  const { lastN = 50 } = options;

  const recentEvents = db.prepare(`
    SELECT event_type, component, state, severity, client_id, client_route_id,
           created_at, project_path, snapshot_kind, capture_source
    FROM mcp_topology_events
    ORDER BY id DESC
    LIMIT ?
  `).all(lastN);

  // Current topology state (latest state per component+client)
  const currentState = db.prepare(`
    SELECT component, client_id, state, severity, MAX(created_at) as last_seen
    FROM mcp_topology_events
    WHERE state IS NOT NULL
    GROUP BY component, client_id
  `).all();

  // Aggregate stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT client_id) as unique_clients,
      COUNT(DISTINCT component) as unique_components,
      MIN(created_at) as first_event,
      MAX(created_at) as last_event
    FROM mcp_topology_events
  `).get();

  // Events by type
  const byEventType = db.prepare(`
    SELECT event_type, COUNT(*) as count
    FROM mcp_topology_events
    GROUP BY event_type
    ORDER BY count DESC
  `).all();

  return {
    state: 'canonical',
    sourceTable: 'mcp_topology_events',
    rowCount: stats?.total_events || 0,
    currentTopology: currentState || [],
    recentEvents: (recentEvents || []).reverse(), // Chronological order
    stats: stats || {},
    byEventType: byEventType || [],
    summary: buildTopologySummary(stats, currentState, byEventType)
  };
}

function buildTopologySummary(stats, currentState, byEventType) {
  if (!stats || stats.total_events === 0) {
    return 'topology=no_events';
  }

  const clientCount = stats.unique_clients || 0;
  const componentCount = stats.unique_components || 0;
  const eventTypes = (byEventType || []).map(e => `${e.event_type}=${e.count}`).join(', ');

  return `topology=${clientCount}clients/${componentCount}components | events=${stats.total_events} | types=[${eventTypes}]`;
}

/**
 * Gets topology health status for the control plane.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane topology status
 */
export function getTopologyControlPlaneStatus(db) {
  const topology = loadTopology(db, { lastN: 10 });

  if (topology.rowCount === 0) {
    return {
      state: 'missing',
      reason: 'No topology events recorded yet',
      recommendation: 'Topology events are emitted during MCP client connect/disconnect cycles.'
    };
  }

  const activeClients = (topology.currentTopology || [])
    .filter(c => c.state === 'active' || c.state === 'connected');

  return {
    state: activeClients.length > 0 ? 'ready' : 'watching',
    clientCount: topology.stats?.unique_clients || 0,
    activeClientCount: activeClients.length,
    eventCount: topology.rowCount,
    lastEventAt: topology.stats?.last_event || null,
    summary: topology.summary
  };
}

export default { loadTopology, getTopologyControlPlaneStatus };
