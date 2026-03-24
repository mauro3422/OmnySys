import { statsPool } from '../../../shared/utils/stats-pool.js';
/**
 * @fileoverview connection.js
 *
 * SQLite Connection Manager para OmnySystem v2.0
 * Usa better-sqlite3 para mejor performance sincronico.
 *
 * @module storage/database/connection
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '#utils/logger.js';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import {
  ensureDataDirectory,
  refreshCanonicalViews,
  reportSchemaDrift,
  initializeConnection,
  applyConnectionConfig,
  initializeConnectionSchema,
  shutdownConnection,
  transactionConnection,
  getConnectionDatabase,
  checkpointConnection,
  isConnectionInitialized
} from './connection-helpers.js';
import {
  getRegisteredTables,
  getTableDefinition,
  detectMissingColumns,
  generateAddColumnSQL,
  generateCreateTableSQL,
  generateCreateIndexesSQL
} from './schema-registry.js';

const logger = createLogger('OmnySys:Storage:Connection');

// Schema SQL is read once at module load to avoid repeated disk I/O on hot-reloads.
// Note: better-sqlite3 is deliberately synchronous - it serialises all DB calls on the
// calling thread and achieves higher throughput than async SQLite drivers for the
// write-heavy indexing workload this project uses.
const __fileUrl = new URL(import.meta.url);
const __dirForSchema = dirname(fileURLToPath(__fileUrl));
const _schemaPath = resolve(__dirForSchema, 'schema.sql');
const _schemaSql = existsSync(_schemaPath) ? readFileSync(_schemaPath, 'utf8') : null;

class ConnectionManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.dbPath = null;
  }

  initialize(projectPath) {
    return initializeConnection(this, projectPath, {
      Database,
      logger,
      existsSync,
      mkdirSync,
      generateCreateTableSQL,
      generateCreateIndexesSQL,
      detectMissingColumns,
      generateAddColumnSQL,
      getRegisteredTables,
      getTableDefinition,
      readFileSync,
      schemaSql: _schemaSql
    });
  }

  applyConfig() {
    return applyConnectionConfig(this.db, logger);
  }

  initializeSchema() {
    return initializeConnectionSchema(this.db, {
      schemaSql: _schemaSql,
      logger,
      generateCreateTableSQL,
      generateCreateIndexesSQL,
      detectMissingColumns,
      generateAddColumnSQL,
      getRegisteredTables,
      getTableDefinition
    });
  }

  getDatabase() {
    return getConnectionDatabase(this);
  }

  transaction(callback) {
    return transactionConnection(this, callback);
  }

  shutdown() {
    return shutdownConnection(this, logger);
  }

  isInitialized() {
    return isConnectionInitialized(this);
  }

  getConnectionStats() {
    return statsPool.getModuleStats('connection');
  }

  checkpoint() {
    return checkpointConnection(this, logger);
  }
}

export const connectionManager = new ConnectionManager();

export function initializeStorage(projectPath) {
  return connectionManager.initialize(projectPath);
}

export function getDatabase() {
  return connectionManager.getDatabase();
}

export function shutdownStorage() {
  connectionManager.shutdown();
}

export default connectionManager;

