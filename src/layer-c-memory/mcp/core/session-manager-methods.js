import { createLogger } from '#utils/logger.js';
import {
  isDedupFresh,
  extractClientId,
  hydrateSessionRow,
  createActiveSessionRecord,
  removeSessionFromCache,
  updateCachedSessionActivity,
  upsertActiveSessionCache
} from './session-manager-helpers.js';

const logger = createLogger('OmnySys:mcp:session-manager');

export function reserveSession(clientInfo = {}, proposedSessionId) {
  const clientId = extractClientId(clientInfo);
  const now = Date.now();

  const existingSession = this.findSessionByClientId(clientId);
  if (existingSession) {
    return { sessionId: existingSession.id, reused: true, source: 'active' };
  }

  const pending = this.pendingSessions.get(clientId);
  if (pending && isDedupFresh(pending.updatedAt, now)) {
    return { sessionId: pending.id, reused: true, source: 'pending' };
  }

  const sessionId = proposedSessionId;
  this.pendingSessions.set(clientId, {
    id: sessionId,
    clientId,
    updatedAt: now
  });
  return { sessionId, reused: false, source: 'new' };
}

export function releasePendingSession(sessionId, clientInfo = {}) {
  const clientId = extractClientId(clientInfo);
  const pending = this.pendingSessions.get(clientId);
  if (pending && (!sessionId || pending.id === sessionId)) {
    this.pendingSessions.delete(clientId);
    return;
  }

  if (!sessionId) return;
  for (const [pendingClientId, reservation] of this.pendingSessions.entries()) {
    if (reservation.id === sessionId) {
      this.pendingSessions.delete(pendingClientId);
      break;
    }
  }
}

export function findSessionByClientId(clientId) {
  if (!this.statements || !clientId) return null;

  try {
    if (this.activeSessions.has(clientId)) {
      const cached = this.activeSessions.get(clientId);
      if (isDedupFresh(cached.updated_at)) {
        logger.debug(`[DEDUP] Reusing in-memory session for ${clientId}: ${cached.id}`);
        return cached;
      }
    }

    const row = this.statements.getByClientId.get(clientId);
    if (!row) return null;

    const session = hydrateSessionRow(row);
    if (isDedupFresh(session.updated_at)) {
      this.activeSessions.set(clientId, session);
      logger.debug(`[DEDUP] Reusing existing session for ${clientId}: ${session.id}`);
      return session;
    }

    return null;
  } catch (err) {
    logger.error(`Failed to find session by client_id ${clientId}: ${err.message}`);
    return null;
  }
}

export function deduplicateSessions(clientId, keepSessionId) {
  if (!this.statements || !clientId) return 0;

  try {
    const info = this.statements.deleteByClientId.run(clientId, keepSessionId);
    if (info.changes > 0) {
      logger.info(`[DEDUP] Removed ${info.changes} duplicate sessions for ${clientId}, keeping ${keepSessionId}`);
    }
    return info.changes;
  } catch (err) {
    logger.error(`Failed to deduplicate sessions for ${clientId}: ${err.message}`);
    return 0;
  }
}

export function saveSession(sessionId, clientInfo = {}, metadata = {}) {
  try {
    this.ensureInitialized();
    const clientId = extractClientId(clientInfo);
    this.releasePendingSession(sessionId, clientInfo);

    const existingSession = this.findSessionByClientId(clientId);
    if (existingSession && existingSession.id !== sessionId) {
      logger.debug(`[DEDUP] Client ${clientId} already has session ${existingSession.id}, reusing instead of ${sessionId}`);

      this.updateActivity(existingSession.id);
      this.deleteSession(sessionId);
      this.deduplicateSessions(clientId, existingSession.id);

      return existingSession.id;
    }

    const now = new Date().toISOString();
    const existing = this.getSession(sessionId);
    const createdAt = existing ? existing.created_at : now;

    if (this.statements) {
      this.statements.upsert.run(
        sessionId,
        clientId,
        JSON.stringify(clientInfo),
        JSON.stringify(metadata),
        createdAt,
        now,
        1
      );
    }

    upsertActiveSessionCache(
      this.activeSessions,
      createActiveSessionRecord(sessionId, clientId, clientInfo, metadata, createdAt, now)
    );

    logger.debug(`[DEDUP] Saved session ${sessionId} for ${clientId}`);
    return sessionId;
  } catch (err) {
    logger.error(`Failed to save session ${sessionId}: ${err.message}`);
    return sessionId;
  }
}

export function getSession(sessionId) {
  this.ensureInitialized();
  if (!this.statements) return null;

  try {
    return hydrateSessionRow(this.statements.get.get(sessionId));
  } catch (err) {
    logger.error(`Failed to get session ${sessionId}: ${err.message}`);
    return null;
  }
}

export function updateActivity(sessionId) {
  try {
    this.ensureInitialized();
    const now = new Date().toISOString();
    if (this.statements) {
      this.statements.updateActivity.run(now, sessionId);
    }
    updateCachedSessionActivity(this.activeSessions, sessionId, now);
  } catch (err) {
    logger.error(`Failed to update activity for session ${sessionId}: ${err.message}`);
  }
}

export function deleteSession(sessionId) {
  try {
    this.ensureInitialized();
    this.releasePendingSession(sessionId);
    removeSessionFromCache(this.activeSessions, sessionId);
    if (this.statements) {
      this.statements.markInactive.run(new Date().toISOString(), sessionId);
    }
  } catch (err) {
    logger.error(`Failed to delete session ${sessionId}: ${err.message}`);
  }
}

export function cleanup(maxAgeHours = 24) {
  if (!this.statements) return;

  try {
    const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000)).toISOString();
    const info = this.statements.cleanup.run(cutoff);
    if (info.changes > 0) {
      logger.info(`[DEDUP] Cleaned up ${info.changes} expired MCP sessions`);
    }
  } catch (err) {
    logger.error(`Failed to cleanup sessions: ${err.message}`);
  }
}

export function getAllSessions(activeOnly = false) {
  if (!this.statements) return [];
  try {
    return activeOnly ? this.statements.getAllActive.all() : this.statements.getAll.all();
  } catch (err) {
    logger.error(`Failed to get all sessions: ${err.message}`);
    return [];
  }
}

export function getDedupStats() {
  try {
    const all = this.getAllSessions(false);
    const active = this.getAllSessions(true);
    const activeByClient = new Map();

    for (const session of active) {
      const cid = session.client_id || 'unknown';
      if (!activeByClient.has(cid)) activeByClient.set(cid, []);
      activeByClient.get(cid).push(session);
    }

    const duplicates = [];
    for (const [clientId, sessions] of activeByClient.entries()) {
      if (sessions.length > 1) {
        duplicates.push({ clientId, count: sessions.length });
      }
    }

    return {
      totalSessions: all.length,
      activeSessions: active.length,
      uniqueClients: activeByClient.size,
      clientsWithDuplicates: duplicates.length,
      duplicateDetails: duplicates
    };
  } catch (err) {
    return { error: err.message };
  }
}
