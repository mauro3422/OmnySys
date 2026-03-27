export function extractClientId(clientInfo) {
  if (!clientInfo) return 'unknown';
  if (typeof clientInfo === 'string') return clientInfo;
  return clientInfo.name || clientInfo.client_id || 'unknown';
}

export function isDedupFresh(updatedAt, now = Date.now()) {
  if (!updatedAt) return false;
  const updatedMs = typeof updatedAt === 'number' ? updatedAt : new Date(updatedAt).getTime();
  return updatedMs > now - 5 * 60 * 1000;
}

export function createSessionStatements(db) {
  return {
    upsert: db.prepare(`
      INSERT OR REPLACE INTO mcp_sessions (
        id, client_id, client_info_json, session_metadata_json, created_at, updated_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    get: db.prepare('SELECT * FROM mcp_sessions WHERE id = ?'),
    getByClientId: db.prepare('SELECT * FROM mcp_sessions WHERE client_id = ? ORDER BY updated_at DESC LIMIT 1'),
    getActiveByClientId: db.prepare('SELECT * FROM mcp_sessions WHERE client_id = ? AND is_active = 1 ORDER BY updated_at DESC'),
    updateActivity: db.prepare('UPDATE mcp_sessions SET updated_at = ?, is_active = 1 WHERE id = ?'),
    markInactive: db.prepare('UPDATE mcp_sessions SET updated_at = ?, is_active = 0 WHERE id = ?'),
    markAllInactive: db.prepare('UPDATE mcp_sessions SET is_active = 0 WHERE is_active = 1'),
    delete: db.prepare('DELETE FROM mcp_sessions WHERE id = ?'),
    deleteByClientId: db.prepare('DELETE FROM mcp_sessions WHERE client_id = ? AND id != ?'),
    cleanup: db.prepare('DELETE FROM mcp_sessions WHERE updated_at < ?'),
    getAll: db.prepare('SELECT * FROM mcp_sessions'),
    getAllActive: db.prepare('SELECT * FROM mcp_sessions WHERE is_active = 1')
  };
}

export function hydrateSessionRow(row) {
  if (!row) return null;

  return {
    ...row,
    client_info: row.client_info_json ? JSON.parse(row.client_info_json) : {},
    session_metadata: row.session_metadata_json ? JSON.parse(row.session_metadata_json) : {}
  };
}

export function createActiveSessionRecord(sessionId, clientId, clientInfo, metadata, createdAt, updatedAt) {
  return {
    id: sessionId,
    client_id: clientId,
    client_info: clientInfo,
    session_metadata: metadata,
    created_at: createdAt,
    updated_at: updatedAt,
    is_active: 1
  };
}

export function upsertActiveSessionCache(activeSessions, session) {
  activeSessions.set(session.client_id, session);
}

export function removeSessionFromCache(activeSessions, sessionId) {
  for (const [clientId, session] of activeSessions.entries()) {
    if (session.id === sessionId) {
      activeSessions.delete(clientId);
      return true;
    }
  }

  return false;
}

export function updateCachedSessionActivity(activeSessions, sessionId, updatedAt) {
  for (const session of activeSessions.values()) {
    if (session.id === sessionId) {
      session.updated_at = updatedAt;
      session.is_active = 1;
      return true;
    }
  }

  return false;
}
