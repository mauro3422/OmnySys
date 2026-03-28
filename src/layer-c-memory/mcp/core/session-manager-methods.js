import { createLogger } from '#utils/logger.js';
import { connectionManager } from '../../storage/database/connection.js';
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

function isSqliteBusyError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'SQLITE_BUSY' ||
    error?.code === 'SQLITE_LOCKED' ||
    message.includes('database is locked') ||
    message.includes('database is busy')
  );
}

function isTransientSqliteAvailabilityError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'SQLITE_BUSY' ||
    error?.code === 'SQLITE_LOCKED' ||
    message.includes('database connection is not open') ||
    message.includes('database is locked') ||
    message.includes('database is busy')
  );
}

function sleepSync(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

function runWithBusyRetry(operation, label, attempts = 5, baseDelayMs = 25) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      if (!isSqliteBusyError(error) || attempt === attempts - 1) {
        throw error;
      }

      const delay = baseDelayMs * (attempt + 1);
      logger.debug(`[DEDUP] Retrying ${label} after SQLite busy lock (${attempt + 1}/${attempts}) in ${delay}ms`);
      sleepSync(delay);
    }
  }

  throw lastError;
}

function canUseSessionDb(manager) {
  return connectionManager.isInitialized()
    && Boolean(connectionManager.db && connectionManager.db.open !== false)
    && Boolean(manager?.statements);
}

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
  if (!clientId) return null;

  try {
    const cached = this.activeSessions.get(clientId);
    if (cached && isDedupFresh(cached.updated_at)) {
      logger.debug(`[DEDUP] Reusing in-memory session for ${clientId}: ${cached.id}`);
      return cached;
    }

    if (!canUseSessionDb(this)) {
      return null;
    }

    const row = runWithBusyRetry(
      () => this.statements.getByClientId.get(clientId),
      `findSessionByClientId(${clientId})`
    );
    if (!row) return null;

    const session = hydrateSessionRow(row);
    if (isDedupFresh(session.updated_at)) {
      this.activeSessions.set(clientId, session);
      logger.debug(`[DEDUP] Reusing existing session for ${clientId}: ${session.id}`);
      return session;
    }

    return null;
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to find session by client_id ${clientId}: ${err.message}`);
    }
    return null;
  }
}

export function deduplicateSessions(clientId, keepSessionId) {
  if (!clientId || !canUseSessionDb(this)) return 0;

  try {
    const info = runWithBusyRetry(
      () => this.statements.deleteByClientId.run(clientId, keepSessionId),
      `deduplicateSessions(${clientId})`
    );
    if (info.changes > 0) {
      logger.info(`[DEDUP] Removed ${info.changes} duplicate sessions for ${clientId}, keeping ${keepSessionId}`);
    }
    return info.changes;
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to deduplicate sessions for ${clientId}: ${err.message}`);
    }
    return 0;
  }
}

export function saveSession(sessionId, clientInfo = {}, metadata = {}) {
  try {
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

    if (canUseSessionDb(this)) {
      runWithBusyRetry(
        () => this.statements.upsert.run(
          sessionId,
          clientId,
          JSON.stringify(clientInfo),
          JSON.stringify(metadata),
          createdAt,
          now,
          1
        ),
        `saveSession(${sessionId})`
      );
    }

    upsertActiveSessionCache(
      this.activeSessions,
      createActiveSessionRecord(sessionId, clientId, clientInfo, metadata, createdAt, now)
    );

    if (!canUseSessionDb(this)) {
      logger.debug(`[DEDUP] Saved in-memory session ${sessionId} for ${clientId} (DB unavailable)`);
      return sessionId;
    }

    logger.debug(`[DEDUP] Saved session ${sessionId} for ${clientId}`);
    return sessionId;
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to save session ${sessionId}: ${err.message}`);
    }
    return sessionId;
  }
}

export function getSession(sessionId) {
  if (!canUseSessionDb(this)) return null;

  try {
    return hydrateSessionRow(
      runWithBusyRetry(
        () => this.statements.get.get(sessionId),
        `getSession(${sessionId})`
      )
    );
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to get session ${sessionId}: ${err.message}`);
    }
    return null;
  }
}

export function updateActivity(sessionId) {
  try {
    const now = new Date().toISOString();
    if (canUseSessionDb(this)) {
      runWithBusyRetry(
        () => this.statements.updateActivity.run(now, sessionId),
        `updateActivity(${sessionId})`
      );
    }
    updateCachedSessionActivity(this.activeSessions, sessionId, now);
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to update activity for session ${sessionId}: ${err.message}`);
    }
  }
}

export function deleteSession(sessionId) {
  try {
    this.releasePendingSession(sessionId);
    removeSessionFromCache(this.activeSessions, sessionId);
    if (canUseSessionDb(this)) {
      runWithBusyRetry(
        () => this.statements.markInactive.run(new Date().toISOString(), sessionId),
        `deleteSession(${sessionId})`
      );
    }
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to delete session ${sessionId}: ${err.message}`);
    }
  }
}

export function cleanup(maxAgeHours = 24) {
  if (!canUseSessionDb(this)) return;

  try {
    const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000)).toISOString();
    const info = runWithBusyRetry(
      () => this.statements.cleanup.run(cutoff),
      'cleanupSessions'
    );
    if (info.changes > 0) {
      logger.info(`[DEDUP] Cleaned up ${info.changes} expired MCP sessions`);
    }
  } catch (err) {
    logger.error(`Failed to cleanup sessions: ${err.message}`);
  }
}

export function getAllSessions(activeOnly = false) {
  if (!canUseSessionDb(this)) {
    const sessions = Array.from(this.activeSessions.values());
    return activeOnly ? sessions.filter((session) => session?.is_active === 1) : sessions;
  }
  try {
    return activeOnly ? this.statements.getAllActive.all() : this.statements.getAll.all();
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to get all sessions: ${err.message}`);
    }
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
