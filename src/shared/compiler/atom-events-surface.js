/**
 * @fileoverview atom-events-surface.js
 * Canonical surface for atom-level events.
 *
 * Source of truth: atom_events table (29,586 rows)
 * Control plane field: Events
 *
 * This is the LARGEST unsurfaced table. It tracks all semantic events
 * detected by Layer B: shared state access, event emitters, listeners,
 * env var usage, and lifecycle transitions per atom.
 */

/**
 * Loads atom events summary from canonical data.
 * @param {object} db - SQLite database connection
 * @param {object} [options] - Query options
 * @param {number} [options.lastN=200] - Number of recent events
 * @returns {object} Atom events summary
 */
export function loadAtomEvents(db, options = {}) {
  const { lastN = 200 } = options;

  // Overall stats by event type
  const byType = db.prepare(`
    SELECT event_type, COUNT(*) as count, COUNT(DISTINCT atom_id) as unique_atoms
    FROM atom_events
    GROUP BY event_type
    ORDER BY count DESC
  `).all();

  // Recent events
  const recentEvents = db.prepare(`
    SELECT atom_id, event_type, event_key, event_data_json, created_at
    FROM atom_events
    ORDER BY id DESC
    LIMIT ?
  `).all(lastN);

  // Top atoms by event count
  const topAtoms = db.prepare(`
    SELECT atom_id, COUNT(*) as event_count,
           GROUP_CONCAT(DISTINCT event_type) as event_types
    FROM atom_events
    GROUP BY atom_id
    ORDER BY event_count DESC
    LIMIT 20
  `).all();

  // Total stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT atom_id) as unique_atoms,
      COUNT(DISTINCT event_type) as event_types,
      MIN(created_at) as first_event,
      MAX(created_at) as last_event
    FROM atom_events
  `).get();

  // Events by category (derived from event_type prefix)
  const byCategory = db.prepare(`
    SELECT
      CASE
        WHEN event_type LIKE 'shared_state%' THEN 'shared_state'
        WHEN event_type LIKE 'event_emit%' THEN 'event_emitters'
        WHEN event_type LIKE 'event_listen%' THEN 'event_listeners'
        WHEN event_type LIKE 'env%' THEN 'env_vars'
        WHEN event_type LIKE 'lifecycle%' THEN 'lifecycle'
        ELSE 'other'
      END as category,
      COUNT(*) as count
    FROM atom_events
    GROUP BY category
    ORDER BY count DESC
  `).all();

  return {
    state: 'canonical',
    sourceTable: 'atom_events',
    rowCount: stats?.total_events || 0,
    stats: stats || {},
    byType: byType || [],
    byCategory: byCategory || [],
    topAtoms: topAtoms || [],
    recentEvents: (recentEvents || []).reverse(),
    summary: buildEventsSummary(stats, byCategory)
  };
}

function buildEventsSummary(stats, byCategory) {
  if (!stats || stats.total_events === 0) return 'events=none';
  const catSummary = (byCategory || []).map(c => `${c.category}=${c.count}`).join(', ');
  return `events=${stats.total_events}total/${stats.unique_atoms}atoms/${stats.event_types}types | ${catSummary}`;
}

/**
 * Gets events control plane status.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane events status
 */
export function getEventsControlPlaneStatus(db) {
  const events = loadAtomEvents(db, { lastN: 50 });

  if (events.rowCount === 0) {
    return {
      state: 'missing',
      reason: 'No atom events recorded',
      recommendation: 'Events are generated during Layer B semantic enrichment.'
    };
  }

  return {
    state: events.rowCount > 1000 ? 'ready' : 'watching',
    totalEvents: events.rowCount,
    uniqueAtoms: events.stats?.unique_atoms || 0,
    eventTypes: events.stats?.event_types || 0,
    topCategory: events.byCategory?.[0]?.category || null,
    lastEventAt: events.stats?.last_event || null,
    summary: events.summary
  };
}

export default { loadAtomEvents, getEventsControlPlaneStatus };
