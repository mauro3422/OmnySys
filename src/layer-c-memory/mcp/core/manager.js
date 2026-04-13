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
import { createLogger } from '../../../utils/logger.js';
import {
  isDedupFresh,
  createSessionStatements
} from './helpers.js';
import * as sessionManagerMethods from './session-manager-methods.js';
import { connectionManager } from '../../storage/database/connection.js';

const logger = createLogger('OmnySys:mcp:session-manager');

export { isDedupFresh };

export class SessionManager {
  constructor() {
    this.db = null;
    this.statements = null;
    this.activeSessions = new Map();
    this.pendingSessions = new Map();
  }

  initialize() {
    if (this.statements) return true;
    if (!connectionManager.isInitialized()) {
      return false;
    }
    try {
      this.db = getDatabase();
      this.statements = createSessionStatements(this.db);
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

  ensureInitialized() {
    if (!connectionManager.isInitialized()) {
      return false;
    }

    return this.statements ? true : this.initialize();
  }
}

Object.assign(SessionManager.prototype, sessionManagerMethods);

export const sessionManager = new SessionManager();
export default sessionManager;
