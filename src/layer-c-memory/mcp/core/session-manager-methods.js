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
  normalizeTransportOrigin,
  buildTransportHandshakeSignature
} from '../transport-provenance.js';
import { persistMcpTopologyTelemetry } from '#shared/compiler/mcp-topology-telemetry.js';

const logger = createLogger('OmnySys:mcp:session-manager');

/**
 * Detecta errores SQLite busy/locked para retry logic.
 */
function isSqliteBusyError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'SQLITE_BUSY' ||
    error?.code === 'SQLITE_LOCKED' ||
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

function normalizeSessionIdentityValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function persistTopologyEvent(event = null) {
  if (!connectionManager.db || !event) {
    return null;
  }

  try {
    return persistMcpTopologyTelemetry(connectionManager.db, event);
  } catch {
    return null;
  }
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
      () => this.statements.getActiveByClientId.get(clientId),
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

      for (const repairedClient of repairedClients) {
        persistTopologyEvent({
          projectPath: process.cwd(),
          captureSource: 'session.manager',
          snapshotKind: 'session',
          eventType: 'session_reconciled',
          component: 'session',
          state: 'watchful',
          severity: 'medium',
          clientId: repairedClient.clientId,
          sessionId: repairedClient.keepSessionId,
          previousSessionId: null,
          reason: `Reconciled ${repairedClient.totalSessions} session(s) for ${repairedClient.clientId}.`,
          recommendation: 'Keep the active bucket on one session per client route to reduce churn.',
          metadataJson: JSON.stringify(repairedClient)
        });
      }

      // Emit session churn event when multiple clients are affected
      if (repairedClients.length >= 2) {
        persistTopologyEvent({
          projectPath: process.cwd(),
          captureSource: 'session.manager',
          snapshotKind: 'session',
          eventType: 'session_churn_excessive',
          component: 'session',
          state: 'blocked',
          severity: 'high',
          clientId: repairedClients.map(c => c.clientId).join(', '),
          reason: `Session churn affected ${repairedClients.length} client(s) with ${removedSessions} duplicate(s) removed.`,
          recommendation: 'Reduce reconnect churn and keep one active session per client route whenever possible.',
          metadataJson: JSON.stringify({
            repairedClients: repairedClients.length,
            removedSessions,
            reason: options.reason || 'auto-heal'
          })
        });
      }
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
    const baseClientInfo = clientInfo && typeof clientInfo === 'object' ? clientInfo : {};
    const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const clientId = extractClientId(baseClientInfo);
    const forceFreshSession = isFreshSessionRequest(baseClientInfo);
    const transportOrigin = inferTransportOrigin({
      clientInfo: baseClientInfo,
      metadata: normalizedMetadata,
      requestContext: { defaultOrigin: 'native_mcp' }
    });
    const transportClientId = normalizeSessionIdentityValue(
      normalizedMetadata.transport_client_id
        || baseClientInfo.transport_client_id
        || baseClientInfo.client_id
        || baseClientInfo.original_client_id
        || baseClientInfo.name
        || baseClientInfo.original_name
        || clientId
    ) || clientId;
    const transportClientRouteId = normalizeSessionIdentityValue(
      normalizedMetadata.transport_client_route_id
        || baseClientInfo.transport_client_route_id
        || baseClientInfo.client_route_id
        || baseClientInfo.original_client_route_id
        || transportClientId
    ) || transportClientId;
    const transportClientName = normalizeSessionIdentityValue(
      normalizedMetadata.transport_client_name
        || baseClientInfo.transport_client_name
        || baseClientInfo.name
        || baseClientInfo.original_name
        || transportClientRouteId
        || transportClientId
    ) || transportClientId;
    const transportRequestPhase = normalizeSessionIdentityValue(
      normalizedMetadata.transport_request_phase
        || baseClientInfo.transport_request_phase
        || 'http-session'
    ) || 'http-session';
    const transportSessionHeaderPresent = normalizedMetadata.transport_session_header_present === true
      || baseClientInfo.transport_session_header_present === true;
    const transportRouteOriginHint = normalizeSessionIdentityValue(
      normalizedMetadata.transport_route_origin_hint
        || baseClientInfo.transport_route_origin_hint
    ) || '';
    const sessionMetadata = {
      ...normalizedMetadata,
      transport_origin: normalizeTransportOrigin(
        normalizedMetadata.transport_origin || transportOrigin,
        transportOrigin
      ),
      transport_origin_source: normalizedMetadata.transport_origin_source
        || baseClientInfo.transport_origin_source
        || (normalizedMetadata.transport_origin || baseClientInfo.transport_origin
          ? 'explicit'
          : 'inferred'),
      transport_client_id: transportClientId,
      transport_client_route_id: transportClientRouteId,
      transport_client_name: transportClientName,
      transport_request_phase: transportRequestPhase,
      transport_session_header_present: transportSessionHeaderPresent,
      transport_route_origin_hint: transportRouteOriginHint || undefined,
      transport_handshake_signature: normalizeSessionIdentityValue(
        normalizedMetadata.transport_handshake_signature
          || baseClientInfo.transport_handshake_signature
      ) || buildTransportHandshakeSignature({
        clientInfo: {
          ...baseClientInfo,
          transport_client_id: transportClientId,
          transport_client_route_id: transportClientRouteId,
          transport_client_name: transportClientName,
          transport_session_header_present: transportSessionHeaderPresent
        },
        metadata: {
          ...normalizedMetadata,
          transport_origin: normalizeTransportOrigin(
            normalizedMetadata.transport_origin || transportOrigin,
            transportOrigin
          ),
          transport_origin_source: normalizedMetadata.transport_origin_source
            || baseClientInfo.transport_origin_source
            || (normalizedMetadata.transport_origin || baseClientInfo.transport_origin
              ? 'explicit'
              : 'inferred'),
          transport_client_id: transportClientId,
          transport_client_route_id: transportClientRouteId,
          transport_client_name: transportClientName,
          transport_request_phase: transportRequestPhase,
          transport_session_header_present: transportSessionHeaderPresent,
          transport_route_origin_hint: transportRouteOriginHint || undefined
        },
        requestContext: {
          defaultOrigin: 'native_mcp',
          isHttpRequest: true,
          transportMode: transportOrigin === 'stdio_bridge' ? 'stdio' : 'http',
          transportRequestPhase,
          transportSessionHeaderPresent
        },
        sessionKind: 'http'
      })
    };
    const normalizedClientInfo = baseClientInfo && typeof baseClientInfo === 'object'
      ? {
          ...baseClientInfo,
          transport_origin: sessionMetadata.transport_origin,
          transport_origin_source: sessionMetadata.transport_origin_source,
          transport_client_id: sessionMetadata.transport_client_id,
          transport_client_route_id: sessionMetadata.transport_client_route_id,
          transport_client_name: sessionMetadata.transport_client_name,
          transport_request_phase: sessionMetadata.transport_request_phase,
          transport_session_header_present: sessionMetadata.transport_session_header_present,
          transport_route_origin_hint: sessionMetadata.transport_route_origin_hint,
          transport_handshake_signature: sessionMetadata.transport_handshake_signature
        }
      : baseClientInfo;
    this.releasePendingSession(sessionId, normalizedClientInfo);

    if (!forceFreshSession) {
      const existingSession = this.findLatestSessionByClientId(clientId);
      if (existingSession && existingSession.id !== sessionId) {
        logger.debug(`[DEDUP] Client ${clientId} already has session ${existingSession.id}, reusing instead of ${sessionId}`);

        // Session lineage: mark old session as replaced by new one
        if (canUseSessionDb(this)) {
          runWithBusyRetry(
            () => this.statements.updateLineage.run(existingSession.id, sessionId, now),
            `updateSessionLineage(${existingSession.id} -> ${sessionId})`
          );
        }

        this.updateActivity(existingSession.id);
        this.deleteSession(sessionId);
        this.deduplicateSessions(clientId, existingSession.id);

        persistTopologyEvent({
          projectPath: process.cwd(),
          captureSource: 'session.manager',
          snapshotKind: 'session',
          eventType: 'session_reused',
          component: 'session',
          state: 'fresh',
          severity: 'low',
          clientId,
          clientRouteId: transportClientRouteId,
          clientName: transportClientName,
          sessionId: existingSession.id,
          previousSessionId: sessionId,
          transportOrigin: sessionMetadata.transport_origin,
          transportOriginSource: sessionMetadata.transport_origin_source,
          transportRequestPhase,
          reason: `Reused existing session ${existingSession.id} instead of proposed ${sessionId}.`,
          recommendation: 'Keep the client route identity stable so bridge reconnects do not look like new sessions.',
          metadataJson: JSON.stringify({
            forceFreshSession,
            reusedSource: 'existing',
            proposedSessionId: sessionId,
            lineageUpdated: true
          })
        });

        return existingSession.id;
      }
    }

    const now = new Date().toISOString();
    const existing = this.getSession(sessionId);
    const createdAt = existing ? existing.created_at : now;

    // Detect session lineage: if updating existing session, track replaced_session_id
    const replacedSessionId = null; // New sessions don't replace anything yet

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
          1,
          null, // replaced_by_session_id (null for new sessions)
          replacedSessionId // replaced_session_id (null for new sessions)
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

    if (!existing || existing.id !== sessionId) {
      persistTopologyEvent({
        projectPath: process.cwd(),
        captureSource: 'session.manager',
        snapshotKind: 'session',
        eventType: 'session_created',
        component: 'session',
        state: forceFreshSession ? 'fresh' : 'watchful',
        severity: forceFreshSession ? 'low' : 'medium',
        clientId,
        clientRouteId: transportClientRouteId,
        clientName: transportClientName,
        sessionId,
        previousSessionId: null,
        transportOrigin: sessionMetadata.transport_origin,
        transportOriginSource: sessionMetadata.transport_origin_source,
        transportRequestPhase,
        reason: `Saved session ${sessionId} for ${clientId}.`,
        recommendation: forceFreshSession
          ? 'Keep the recovery session fresh and avoid reusing stale handshake state.'
          : 'Keep the active session warm and maintain a stable transport origin.',
        metadataJson: JSON.stringify({
          forceFreshSession,
          transportSessionHeaderPresent,
          transportHandshakeSignature: sessionMetadata.transport_handshake_signature,
          transportRouteOriginHint
        })
      });
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
