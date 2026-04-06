import { createLogger } from '#utils/logger.js';
import { isTransientSqliteAvailabilityError } from '#shared/utils/normalize-helpers.js';
import { connectionManager } from '../../storage/database/connection.js';
import {
  isDedupFresh,
  isFreshSessionRequest,
  extractClientId,
  hydrateSessionRow,
  createActiveSessionRecord,
  removeSessionFromCache,
  updateCachedSessionActivity,
  upsertActiveSessionCache
} from './session-manager-helpers.js';
import {
  inferTransportOrigin,
  normalizeTransportOrigin
} from '../transport-provenance.js';

const logger = createLogger('OmnySys:mcp:session-manager');

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

export function getSessionPersistenceState() {
  const initialized = connectionManager.isInitialized();
  const dbOpen = Boolean(connectionManager.db && connectionManager.db.open !== false);
  const statementsReady = Boolean(this?.statements);
  const available = initialized && dbOpen && statementsReady;
  const reason = available
    ? null
    : (!initialized
      ? 'session connection not initialized'
      : !dbOpen
        ? 'database connection is not open'
        : 'session statements unavailable');

  return {
    initialized,
    dbOpen,
    statementsReady,
    available,
    mode: available ? 'sqlite' : 'memory-fallback',
    source: available ? 'sqlite' : 'memory',
    reason
  };
}

export function reserveSession(clientInfo = {}, proposedSessionId) {
  const clientId = extractClientId(clientInfo);
  const now = Date.now();
  const forceFreshSession = isFreshSessionRequest(clientInfo);

  if (forceFreshSession) {
    logger.debug(`[DEDUP] Fresh session requested for ${clientId}; bypassing active and pending reuse.`);
  }

  if (!forceFreshSession) {
    const existingSession = this.findSessionByClientId(clientId);
    if (existingSession) {
      return { sessionId: existingSession.id, reused: true, source: 'active' };
    }

    const pending = this.pendingSessions.get(clientId);
    if (pending && isDedupFresh(pending.updatedAt, now)) {
      return { sessionId: pending.id, reused: true, source: 'pending' };
    }
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

export function findLatestSessionByClientId(clientId) {
  if (!clientId) return null;

  try {
    if (!canUseSessionDb(this)) {
      return this.activeSessions.get(clientId) || null;
    }

    const row = runWithBusyRetry(
      () => this.statements.getByClientId.get(clientId),
      `findLatestSessionByClientId(${clientId})`
    );
    if (!row) return null;

    return hydrateSessionRow(row);
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to find latest session by client_id ${clientId}: ${err.message}`);
    }
    return null;
  }
}

export function findSessionByClientId(clientId) {
  if (!clientId) return null;

  try {
    const latest = this.findLatestSessionByClientId(clientId);
    if (!latest) return null;

    if (!canUseSessionDb(this)) {
      logger.debug(`[DEDUP] Reusing in-memory session for ${clientId}: ${latest.id}`);
      this.activeSessions.set(clientId, latest);
      return latest;
    }

    const freshness = isDedupFresh(latest.updated_at) ? 'fresh' : 'stale';
    logger.debug(`[DEDUP] Reusing ${freshness} session for ${clientId}: ${latest.id}`);
    this.activeSessions.set(clientId, latest);
    return latest;

  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to find session by client_id ${clientId}: ${err.message}`);
    }
    return null;
  }
}

export function reconcileActiveSessions(options = {}) {
  if (!canUseSessionDb(this)) return { repairedClients: 0, removedSessions: 0, clients: [] };

  try {
    const activeSessions = this.getAllSessions(true);
    if (!Array.isArray(activeSessions) || activeSessions.length <= 1) {
      return { repairedClients: 0, removedSessions: 0, clients: [] };
    }

    const buckets = new Map();
    for (const session of activeSessions) {
      const clientId = session?.client_id || 'unknown';
      if (!buckets.has(clientId)) buckets.set(clientId, []);
      buckets.get(clientId).push(session);
    }

    const repairedClients = [];
    let removedSessions = 0;

    for (const [clientId, sessions] of buckets.entries()) {
      if (sessions.length <= 1) continue;

      sessions.sort((a, b) => {
        const aUpdated = new Date(a?.updated_at || a?.created_at || 0).getTime();
        const bUpdated = new Date(b?.updated_at || b?.created_at || 0).getTime();
        return bUpdated - aUpdated;
      });

      const keep = sessions[0];
      const removed = this.deduplicateSessions(clientId, keep.id);
      removedSessions += removed;
      this.activeSessions.set(clientId, keep);
      repairedClients.push({
        clientId,
        keepSessionId: keep.id,
        removedSessions: removed,
        totalSessions: sessions.length,
        reason: options.reason || 'auto-heal'
      });
    }

    if (removedSessions > 0) {
      const reasonSuffix = options.reason ? ` (${options.reason})` : '';
      logger.info(`[DEDUP] Reconciled ${repairedClients.length} client bucket(s) and removed ${removedSessions} duplicate session row(s)${reasonSuffix}`);
    }

    return {
      repairedClients: repairedClients.length,
      removedSessions,
      clients: repairedClients
    };
  } catch (err) {
    if (!isTransientSqliteAvailabilityError(err)) {
      logger.error(`Failed to reconcile active sessions: ${err.message}`);
    }
    return { repairedClients: 0, removedSessions: 0, clients: [], error: err.message };
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
    const forceFreshSession = isFreshSessionRequest(clientInfo);
    const transportOrigin = inferTransportOrigin({
      clientInfo,
      metadata,
      requestContext: { defaultOrigin: 'native_mcp' }
    });
    const sessionMetadata = {
      ...metadata,
      transport_origin: normalizeTransportOrigin(
        metadata.transport_origin || transportOrigin,
        transportOrigin
      ),
      transport_origin_source: metadata.transport_origin_source
        || clientInfo?.transport_origin_source
        || (metadata.transport_origin || clientInfo?.transport_origin
          ? 'explicit'
          : 'inferred')
    };
    const normalizedClientInfo = clientInfo && typeof clientInfo === 'object'
      ? {
          ...clientInfo,
          transport_origin: sessionMetadata.transport_origin,
          transport_origin_source: sessionMetadata.transport_origin_source
        }
      : clientInfo;
    this.releasePendingSession(sessionId, clientInfo);

    if (!forceFreshSession) {
      const existingSession = this.findLatestSessionByClientId(clientId);
      if (existingSession && existingSession.id !== sessionId) {
        logger.debug(`[DEDUP] Client ${clientId} already has session ${existingSession.id}, reusing instead of ${sessionId}`);

        this.updateActivity(existingSession.id);
        this.deleteSession(sessionId);
        this.deduplicateSessions(clientId, existingSession.id);

        return existingSession.id;
      }
    }

    const now = new Date().toISOString();
    const existing = this.getSession(sessionId);
    const createdAt = existing ? existing.created_at : now;

    if (canUseSessionDb(this)) {
      runWithBusyRetry(
        () => this.statements.upsert.run(
          sessionId,
          clientId,
          sessionMetadata.transport_origin,
          JSON.stringify(normalizedClientInfo),
          JSON.stringify(sessionMetadata),
          createdAt,
          now,
          1
        ),
        `saveSession(${sessionId})`
      );
    }

    upsertActiveSessionCache(
      this.activeSessions,
      createActiveSessionRecord(sessionId, clientId, normalizedClientInfo, sessionMetadata, createdAt, now)
    );

    if (forceFreshSession && clientId !== 'unknown') {
      this.deduplicateSessions(clientId, sessionId);
      logger.debug(`[DEDUP] Fresh recovery session ${sessionId} registered for ${clientId}`);
    }

    const autoHealReport = this.reconcileActiveSessions({
      reason: forceFreshSession ? 'fresh-session' : 'save-session'
    });
    if (autoHealReport.removedSessions > 0) {
      logger.debug(`[DEDUP] Auto-heal reconciled ${autoHealReport.repairedClients} client bucket(s) after saving ${sessionId}`);
    }

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
