/**
 * @fileoverview session-manager.js
 * 
 * Manages MCP session persistence in SQLite.
 * Allows sessions to survive daemon restarts by storing metadata
 * and re-adopting session IDs when a client reconnects.
 * 
 * DEDUPLICATION FEATURE (v3.0.1):
 * - Prevents multiple sessions per client_id
 * - Kimi extension opens 11 connections simultaneously - now deduplicated
 * - Session reused if same client_id connects within 5 minutes
 * 
 * @module mcp/core/session-manager
 */

import { getDatabase } from '../../storage/database/connection.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:mcp:session-manager');

/**
 * Extracts client_id from clientInfo object
 * Uses clientInfo.name as client_id (e.g., "Kimi", "Cline", "Claude Code")
 */
function extractClientId(clientInfo) {
  if (!clientInfo) return 'unknown';
  if (typeof clientInfo === 'string') return clientInfo;
  return clientInfo.name || clientInfo.client_id || 'unknown';
}

export class SessionManager {
    constructor() {
        this.db = null;
        this.statements = null;
        // In-memory cache of active sessions by client_id (for fast dedup)
        this.activeSessions = new Map();
        // In-flight initialize reservations by client_id to avoid races
        this.pendingSessions = new Map();
    }

    /**
     * Initializes the manager and prepares SQL statements
     */
    initialize() {
        if (this.statements) return true;
        try {
            this.db = getDatabase();
            this.statements = {
                upsert: this.db.prepare(`
          INSERT OR REPLACE INTO mcp_sessions (
            id, client_id, client_info_json, session_metadata_json, created_at, updated_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `),
                get: this.db.prepare('SELECT * FROM mcp_sessions WHERE id = ?'),
                getByClientId: this.db.prepare('SELECT * FROM mcp_sessions WHERE client_id = ? ORDER BY updated_at DESC LIMIT 1'),
                getActiveByClientId: this.db.prepare('SELECT * FROM mcp_sessions WHERE client_id = ? AND is_active = 1 ORDER BY updated_at DESC'),
                updateActivity: this.db.prepare('UPDATE mcp_sessions SET updated_at = ?, is_active = 1 WHERE id = ?'),
                markInactive: this.db.prepare('UPDATE mcp_sessions SET updated_at = ?, is_active = 0 WHERE id = ?'),
                markAllInactive: this.db.prepare('UPDATE mcp_sessions SET is_active = 0 WHERE is_active = 1'),
                delete: this.db.prepare('DELETE FROM mcp_sessions WHERE id = ?'),
                deleteByClientId: this.db.prepare('DELETE FROM mcp_sessions WHERE client_id = ? AND id != ?'),
                cleanup: this.db.prepare('DELETE FROM mcp_sessions WHERE updated_at < ?'),
                getAll: this.db.prepare('SELECT * FROM mcp_sessions'),
                getAllActive: this.db.prepare('SELECT * FROM mcp_sessions WHERE is_active = 1')
            };
            const reset = this.statements.markAllInactive.run();
            this.activeSessions.clear();
            if (reset.changes > 0) {
                logger.debug(`[DEDUP] Reset ${reset.changes} stale active sessions on startup`);
            }
            logger.debug('SessionManager initialized');
            return true;
        } catch (err) {
            logger.error(`Failed to initialize SessionManager: ${err.message}`);
            return false;
        }
    }

    /**
     * Best-effort initialization. Safe to call on every request.
     * @returns {boolean}
     */
    ensureInitialized() {
        return this.statements ? true : this.initialize();
    }

    /**
     * Reserves or reuses a session ID for a client before the MCP transport
     * finishes its initialize handshake. This closes the race where two
     * concurrent initialize requests from the same client both create a new id.
     * @param {Object|string} clientInfo
     * @param {string} proposedSessionId
     * @returns {{sessionId: string, reused: boolean, source: string}}
     */
    reserveSession(clientInfo = {}, proposedSessionId) {
        const clientId = extractClientId(clientInfo);
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        const pending = this.pendingSessions.get(clientId);
        if (pending && pending.updatedAt > fiveMinutesAgo) {
            return { sessionId: pending.id, reused: true, source: 'pending' };
        }

        const existingSession = this.findSessionByClientId(clientId);
        if (existingSession) {
            return { sessionId: existingSession.id, reused: true, source: 'active' };
        }

        const sessionId = proposedSessionId;
        this.pendingSessions.set(clientId, {
            id: sessionId,
            clientId,
            updatedAt: now
        });
        return { sessionId, reused: false, source: 'new' };
    }

    /**
     * Clears a pending reservation by session or client identifier.
     * @param {string} sessionId
     * @param {Object|string} clientInfo
     */
    releasePendingSession(sessionId, clientInfo = {}) {
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

    /**
     * Finds an existing session by client_id
     * Used for deduplication - if client reconnects within 5 min, reuse session
     * @param {string} clientId 
     * @returns {Object|null}
     */
    findSessionByClientId(clientId) {
        if (!this.statements || !clientId) return null;

        try {
            // Check in-memory cache first (fastest)
            if (this.activeSessions.has(clientId)) {
                const cached = this.activeSessions.get(clientId);
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                if (new Date(cached.updated_at).getTime() > fiveMinutesAgo) {
                    logger.debug(`[DEDUP] Reusing in-memory session for ${clientId}: ${cached.id}`);
                    return cached;
                }
            }

            // Check database
            const row = this.statements.getByClientId.get(clientId);
            if (!row) return null;

            const session = {
                ...row,
                client_info: row.client_info_json ? JSON.parse(row.client_info_json) : {},
                session_metadata: row.session_metadata_json ? JSON.parse(row.session_metadata_json) : {}
            };

            // Only reuse if session is recent (5 minutes)
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            if (new Date(session.updated_at).getTime() > fiveMinutesAgo) {
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

    /**
     * Removes duplicate sessions for a client_id, keeping only the most recent
     * @param {string} clientId 
     * @param {string} keepSessionId - Session ID to keep
     */
    deduplicateSessions(clientId, keepSessionId) {
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

    /**
     * Saves or updates a session
     * DEDUPLICATION: If client_id already has an active session, returns existing sessionId
     * @param {string} sessionId 
     * @param {Object} clientInfo 
     * @param {Object} metadata 
     * @returns {string} - The sessionId to use (may be existing if deduped)
     */
    saveSession(sessionId, clientInfo = {}, metadata = {}) {
        try {
            this.ensureInitialized();
            const clientId = extractClientId(clientInfo);
            this.releasePendingSession(sessionId, clientInfo);
            
            // DEDUPLICATION CHECK: See if this client already has an active session
            const existingSession = this.findSessionByClientId(clientId);
            if (existingSession && existingSession.id !== sessionId) {
                logger.debug(`[DEDUP] Client ${clientId} already has session ${existingSession.id}, reusing instead of ${sessionId}`);
                
                // Update activity on existing session
                this.updateActivity(existingSession.id);
                
                // Remove the duplicate we just created (if any)
                this.deleteSession(sessionId);
                
                // Clean up any other duplicates
                this.deduplicateSessions(clientId, existingSession.id);
                
                return existingSession.id; // Return the existing sessionId
            }

            const now = new Date().toISOString();
            // Check if it already exists to preserve created_at
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

            // Update in-memory cache
            this.activeSessions.set(clientId, {
                id: sessionId,
                client_id: clientId,
                client_info: clientInfo,
                session_metadata: metadata,
                created_at: createdAt,
                updated_at: now,
                is_active: 1
            });

            logger.debug(`[DEDUP] Saved session ${sessionId} for ${clientId}`);
            return sessionId;
        } catch (err) {
            logger.error(`Failed to save session ${sessionId}: ${err.message}`);
            return sessionId;
        }
    }

    /**
     * Retrieves a session from the database
     * @param {string} sessionId 
     * @returns {Object|null}
     */
    getSession(sessionId) {
        this.ensureInitialized();
        if (!this.statements) return null;

        try {
            const row = this.statements.get.get(sessionId);
            if (!row) return null;

            return {
                ...row,
                client_info: row.client_info_json ? JSON.parse(row.client_info_json) : {},
                session_metadata: row.session_metadata_json ? JSON.parse(row.session_metadata_json) : {}
            };
        } catch (err) {
            logger.error(`Failed to get session ${sessionId}: ${err.message}`);
            return null;
        }
    }

    /**
     * Updates the last activity timestamp for a session
     * @param {string} sessionId 
     */
    updateActivity(sessionId) {
        try {
            this.ensureInitialized();
            const now = new Date().toISOString();
            if (this.statements) {
                this.statements.updateActivity.run(now, sessionId);
            }
            for (const session of this.activeSessions.values()) {
                if (session.id === sessionId) {
                    session.updated_at = now;
                    session.is_active = 1;
                    break;
                }
            }
        } catch (err) {
            logger.error(`Failed to update activity for session ${sessionId}: ${err.message}`);
        }
    }

    /**
     * Deletes a session (logout or close)
     * @param {string} sessionId 
     */
    deleteSession(sessionId) {
        try {
            this.ensureInitialized();
            this.releasePendingSession(sessionId);
            // Remove from in-memory cache
            for (const [clientId, session] of this.activeSessions.entries()) {
                if (session.id === sessionId) {
                    this.activeSessions.delete(clientId);
                    break;
                }
            }
            if (this.statements) {
                this.statements.markInactive.run(new Date().toISOString(), sessionId);
            }
        } catch (err) {
            logger.error(`Failed to delete session ${sessionId}: ${err.message}`);
        }
    }

    /**
     * Removes sessions older than a certain age
     * @param {number} maxAgeHours 
     */
    cleanup(maxAgeHours = 24) {
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

    /**
     * Retrieves all active sessions from the database
     * @returns {Array<Object>}
     */
    getAllSessions(activeOnly = false) {
        if (!this.statements) return [];
        try {
            return activeOnly ? this.statements.getAllActive.all() : this.statements.getAll.all();
        } catch (err) {
            logger.error(`Failed to get all sessions: ${err.message}`);
            return [];
        }
    }

    /**
     * Gets deduplication statistics
     * @returns {Object}
     */
    getDedupStats() {
        try {
            const all = this.getAllSessions(false);
            const active = this.getAllSessions(true);
            const byClient = new Map();
            const activeByClient = new Map();
            
            for (const s of all) {
                const cid = s.client_id || 'unknown';
                if (!byClient.has(cid)) byClient.set(cid, []);
                byClient.get(cid).push(s);
            }

            for (const s of active) {
                const cid = s.client_id || 'unknown';
                if (!activeByClient.has(cid)) activeByClient.set(cid, []);
                activeByClient.get(cid).push(s);
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
}

// Export singleton
export const sessionManager = new SessionManager();
export default sessionManager;
