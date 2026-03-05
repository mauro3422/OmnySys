/**
 * @fileoverview session-manager.js
 * 
 * Manages MCP session persistence in SQLite.
 * Allows sessions to survive daemon restarts by storing metadata
 * and re-adopting session IDs when a client reconnects.
 * 
 * @module mcp/core/session-manager
 */

import { getDatabase } from '../../storage/database/connection.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:mcp:session-manager');

export class SessionManager {
    constructor() {
        this.db = null;
        this.statements = null;
    }

    /**
     * Initializes the manager and prepares SQL statements
     */
    initialize() {
        try {
            this.db = getDatabase();
            this.statements = {
                upsert: this.db.prepare(`
          INSERT OR REPLACE INTO mcp_sessions (
            id, client_info_json, session_metadata_json, created_at, updated_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?)
        `),
                get: this.db.prepare('SELECT * FROM mcp_sessions WHERE id = ?'),
                updateActivity: this.db.prepare('UPDATE mcp_sessions SET updated_at = ? WHERE id = ?'),
                delete: this.db.prepare('DELETE FROM mcp_sessions WHERE id = ?'),
                cleanup: this.db.prepare('DELETE FROM mcp_sessions WHERE updated_at < ?')
            };
            logger.debug('SessionManager initialized');
        } catch (err) {
            logger.error(`Failed to initialize SessionManager: ${err.message}`);
        }
    }

    /**
     * Saves or updates a session
     * @param {string} sessionId 
     * @param {Object} clientInfo 
     * @param {Object} metadata 
     */
    saveSession(sessionId, clientInfo = {}, metadata = {}) {
        if (!this.statements) return;

        try {
            const now = new Date().toISOString();
            // Check if it already exists to preserve created_at
            const existing = this.getSession(sessionId);
            const createdAt = existing ? existing.created_at : now;

            this.statements.upsert.run(
                sessionId,
                JSON.stringify(clientInfo),
                JSON.stringify(metadata),
                createdAt,
                now,
                1
            );
        } catch (err) {
            logger.error(`Failed to save session ${sessionId}: ${err.message}`);
        }
    }

    /**
     * Retrieves a session from the database
     * @param {string} sessionId 
     * @returns {Object|null}
     */
    getSession(sessionId) {
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
        if (!this.statements) return;

        try {
            this.statements.updateActivity.run(new Date().toISOString(), sessionId);
        } catch (err) {
            logger.error(`Failed to update activity for session ${sessionId}: ${err.message}`);
        }
    }

    /**
     * Deletes a session (logout or close)
     * @param {string} sessionId 
     */
    deleteSession(sessionId) {
        if (!this.statements) return;

        try {
            this.statements.delete.run(sessionId);
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
                logger.info(`Cleaned up ${info.changes} expired MCP sessions`);
            }
        } catch (err) {
            logger.error(`Failed to cleanup sessions: ${err.message}`);
        }
    }
}

// Export singleton
export const sessionManager = new SessionManager();
export default sessionManager;
