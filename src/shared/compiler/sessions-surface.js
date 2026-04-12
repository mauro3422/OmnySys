/**
 * @fileoverview sessions-surface.js
 * Canonical surface for MCP session lifecycle and lineage.
 *
 * Source of truth: mcp_sessions table (3+ rows)
 * Control plane field: Sessions
 *
 * Exposes active sessions, client synchronization state,
 * session lineage, and transport provenance.
 */

/**
 * Loads session telemetry summary.
 * @param {object} db - SQLite database connection
 * @returns {object} Session summary
 */
export function loadSessions(db) {
  // All sessions
  const allSessions = db.prepare(`
    SELECT id, client_id, client_name, client_route_id, session_kind,
           is_active, created_at, updated_at, last_tool_call_at,
           transport_origin, transport_origin_source,
           replaced_by_session_id, replaced_session_id
    FROM mcp_sessions
    ORDER BY created_at DESC
  `).all();

  // Active sessions
  const activeSessions = allSessions.filter(s => s.is_active === 1 || s.is_active === true);

  // Stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN is_active = 1 OR is_active = 1 THEN 1 END) as active_sessions,
      COUNT(DISTINCT client_id) as unique_clients,
      COUNT(DISTINCT client_name) as unique_client_names,
      COUNT(DISTINCT session_kind) as session_kinds,
      MIN(created_at) as first_session,
      MAX(updated_at) as last_activity
    FROM mcp_sessions
  `).get();

  // By client
  const byClient = db.prepare(`
    SELECT client_id, client_name,
           COUNT(*) as session_count,
           COUNT(CASE WHEN is_active = 1 OR is_active = 1 THEN 1 END) as active_count,
           MAX(updated_at) as last_seen
    FROM mcp_sessions
    GROUP BY client_id
    ORDER BY last_seen DESC
  `).all();

  return {
    state: 'canonical',
    sourceTable: 'mcp_sessions',
    rowCount: stats?.total_sessions || 0,
    stats: stats || {},
    activeSessions,
    byClient: byClient || [],
    summary: buildSessionsSummary(stats, activeSessions)
  };
}

function buildSessionsSummary(stats, activeSessions) {
  if (!stats || stats.total_sessions === 0) return 'sessions=none';
  return `sessions=${stats.total_sessions}total/${activeSessions?.length || 0}active | ${stats.unique_clients || 0}clients`;
}

/**
 * Gets sessions control plane status.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane sessions status
 */
export function getSessionsControlPlaneStatus(db) {
  const sessions = loadSessions(db);

  if (sessions.rowCount === 0) {
    return {
      state: 'missing',
      reason: 'No MCP sessions recorded',
      recommendation: 'Sessions are created during MCP client connections.'
    };
  }

  const hasActiveSessions = (sessions.activeSessions || []).length > 0;

  return {
    state: hasActiveSessions ? 'ready' : 'watching',
    totalSessions: sessions.rowCount,
    activeSessionCount: (sessions.activeSessions || []).length,
    uniqueClientCount: sessions.stats?.unique_clients || 0,
    lastActivityAt: sessions.stats?.last_activity || null,
    byClient: sessions.byClient || [],
    summary: sessions.summary
  };
}

export default { loadSessions, getSessionsControlPlaneStatus };
