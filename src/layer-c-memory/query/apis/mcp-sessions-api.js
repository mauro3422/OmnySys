/**
 * @fileoverview MCP session query API.
 *
 * Canonical access layer for mcp_sessions summaries.
 *
 * @module query/apis/mcp-sessions-api
 * @version 1.0.0
 * @since 2026-04-02
 */

import { resolveSessionSyncGraceMs } from '#shared/compiler/index.js';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSessionDb(sessionDb) {
  return sessionDb && typeof sessionDb.prepare === 'function' ? sessionDb : null;
}

function getAgeMs(updatedAt, now = Date.now()) {
  if (!updatedAt) return null;

  const parsed = typeof updatedAt === 'number' ? updatedAt : new Date(updatedAt).getTime();
  return Number.isFinite(parsed) ? Math.max(0, now - parsed) : null;
}

function collectGroupedCountMap(rows, valueKey) {
  return Array.isArray(rows) ? rows.reduce((acc, row) => {
    const key = String(row?.[valueKey] || 'unknown').trim() || 'unknown';
    const count = asNumber(row?.count);
    if (count > 0) {
      acc[key] = count;
    }
    return acc;
  }, {}) : {};
}

/**
 * Collects a canonical snapshot of mcp_sessions without exposing raw SQL to callers.
 *
 * @param {object} sessionDb - Better-sqlite3 database handle for the MCP sessions store.
 * @returns {object|null}
 */
export function collectSessionDbSnapshot(sessionDb) {
  const db = normalizeSessionDb(sessionDb);
  if (!db) return null;

  try {
    const freshnessWindowMs = resolveSessionSyncGraceMs();
    const freshnessCutoff = new Date(Date.now() - freshnessWindowMs).toISOString();
    const totalPersistent = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions').get()?.count);
    const totalPersistentActive = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1').get()?.count);
    const uniqueClients = asNumber(db.prepare('SELECT COUNT(DISTINCT client_id) AS count FROM mcp_sessions WHERE is_active = 1').get()?.count);
    const recentSessionCount = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions WHERE updated_at >= ?').get(freshnessCutoff)?.count);
    const recentActiveCount = asNumber(db.prepare('SELECT COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1 AND updated_at >= ?').get(freshnessCutoff)?.count);
    const latestSessionRow = db.prepare(`
      SELECT updated_at
      FROM mcp_sessions
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    const latestActiveSessionRow = db.prepare(`
      SELECT updated_at
      FROM mcp_sessions
      WHERE is_active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    const duplicateDetails = db.prepare(`
      SELECT client_id, COUNT(*) AS count
      FROM mcp_sessions
      WHERE is_active = 1
      GROUP BY client_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC, client_id ASC
    `).all().map((row) => ({
      clientId: row.client_id,
      count: asNumber(row.count)
    }));
    const transportOriginCounts = collectGroupedCountMap(db.prepare(`
      SELECT COALESCE(transport_origin, 'unknown') AS transport_origin, COUNT(*) AS count
      FROM mcp_sessions
      GROUP BY COALESCE(transport_origin, 'unknown')
      ORDER BY count DESC, transport_origin ASC
    `).all(), 'transport_origin');
    const transportSessionStateCounts = collectGroupedCountMap(db.prepare(`
      SELECT COALESCE(json_extract(session_metadata_json, '$.transport_session_state'), 'unknown') AS transport_session_state, COUNT(*) AS count
      FROM mcp_sessions
      GROUP BY COALESCE(json_extract(session_metadata_json, '$.transport_session_state'), 'unknown')
      ORDER BY count DESC, transport_session_state ASC
    `).all(), 'transport_session_state');
    const transportRequestPhaseCounts = collectGroupedCountMap(db.prepare(`
      SELECT COALESCE(json_extract(session_metadata_json, '$.transport_request_phase'), 'unknown') AS transport_request_phase, COUNT(*) AS count
      FROM mcp_sessions
      GROUP BY COALESCE(json_extract(session_metadata_json, '$.transport_request_phase'), 'unknown')
      ORDER BY count DESC, transport_request_phase ASC
    `).all(), 'transport_request_phase');
    const transportClientRouteIdCounts = collectGroupedCountMap(db.prepare(`
      SELECT COALESCE(json_extract(session_metadata_json, '$.transport_client_route_id'), 'unknown') AS transport_client_route_id, COUNT(*) AS count
      FROM mcp_sessions
      GROUP BY COALESCE(json_extract(session_metadata_json, '$.transport_client_route_id'), 'unknown')
      ORDER BY count DESC, transport_client_route_id ASC
    `).all(), 'transport_client_route_id');
    const transportHandshakeSignatureCounts = collectGroupedCountMap(db.prepare(`
      SELECT COALESCE(json_extract(session_metadata_json, '$.transport_handshake_signature'), 'unknown') AS transport_handshake_signature, COUNT(*) AS count
      FROM mcp_sessions
      GROUP BY COALESCE(json_extract(session_metadata_json, '$.transport_handshake_signature'), 'unknown')
      ORDER BY count DESC, transport_handshake_signature ASC
    `).all(), 'transport_handshake_signature');
    const transportSessionHeaderPresentCount = asNumber(db.prepare(`
      SELECT COUNT(*) AS count
      FROM mcp_sessions
      WHERE COALESCE(json_extract(session_metadata_json, '$.transport_session_header_present'), 0) = 1
    `).get()?.count);
    const transportSessionHeaderMissingCount = asNumber(db.prepare(`
      SELECT COUNT(*) AS count
      FROM mcp_sessions
      WHERE COALESCE(json_extract(session_metadata_json, '$.transport_session_header_present'), 0) = 0
    `).get()?.count);

    return {
      available: true,
      totalPersistent,
      totalPersistentActive,
      uniqueClients,
      clientsWithDuplicates: duplicateDetails.length,
      duplicateDetails,
      freshnessWindowMs,
      recentSessionCount,
      recentActiveCount,
      latestUpdatedAt: latestSessionRow?.updated_at || null,
      latestUpdatedAtAgeMs: getAgeMs(latestSessionRow?.updated_at),
      latestActiveUpdatedAt: latestActiveSessionRow?.updated_at || null,
      latestActiveUpdatedAtAgeMs: getAgeMs(latestActiveSessionRow?.updated_at),
      transportOriginCounts,
      transportSessionStateCounts,
      transportRequestPhaseCounts,
      transportClientRouteIdCounts,
      transportHandshakeSignatureCounts,
      transportSessionHeaderPresentCount,
      transportSessionHeaderMissingCount
    };
  } catch {
    return null;
  }
}
