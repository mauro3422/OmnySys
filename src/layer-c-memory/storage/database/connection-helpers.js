/**
 * @fileoverview SQLite connection helpers
 *
 * Shared helper functions used by ConnectionManager to keep the class focused
 * on lifecycle orchestration instead of schema bootstrapping details.
 *
 * @module storage/database/connection-helpers
 */

import { resolve } from 'path';
import { probeDatabaseIntegrity } from './connection-integrity.js';

export { probeDatabaseIntegrity };

export function ensureDataDirectory(projectPath, { logger, existsSync, mkdirSync }) {
  const dataDir = resolve(projectPath, '.omnysysdata');
  if (!existsSync(dataDir)) {
    logger.debug(`[Connection] Creating data directory: ${dataDir}`);
    mkdirSync(dataDir, { recursive: true });
  }
}

export function applyMissingColumns({ db, tableName, detectMissingColumns, generateAddColumnSQL, logger }) {
  const existingColumns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const missingColumns = detectMissingColumns(tableName, existingColumns);

  if (missingColumns.length === 0) {
    return;
  }

  logger.info(
    `[Connection] Adding ${missingColumns.length} missing column(s) to '${tableName}': ${missingColumns.map(c => c.name).join(', ')}`
  );

  for (const column of missingColumns) {
    try {
      const addColumnSQL = generateAddColumnSQL(tableName, column.name);
      db.exec(addColumnSQL);
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        logger.warn(`[Connection] Failed to add column ${column.name} to ${tableName}: ${err.message}`);
      }
    }
  }
}

export function syncRegisteredTables({ db, getRegisteredTables, generateCreateTableSQL, generateCreateIndexesSQL, detectMissingColumns, generateAddColumnSQL, logger }) {
  const registeredTables = getRegisteredTables();

  for (const tableName of registeredTables) {
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tableName);

    if (!tableExists) {
      const createSQL = generateCreateTableSQL(tableName);
      db.exec(createSQL);
      logger.info(`[Connection] Created table '${tableName}' from registry`);
    }

    applyMissingColumns({ db, tableName, detectMissingColumns, generateAddColumnSQL, logger });

    const indexes = generateCreateIndexesSQL(tableName);
    for (const indexSQL of indexes) {
      db.exec(indexSQL);
    }
  }
}

export function reportSchemaDrift({ db, getRegisteredTables, getTableDefinition, logger }) {
  const registeredTables = getRegisteredTables();

  for (const tableName of registeredTables) {
    const existingColumns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const registeredColumns = getTableDefinition(tableName).columns;

    const existingNames = new Set(existingColumns.map(c => c.name));
    const registeredNames = new Set(registeredColumns.map(c => c.name));

    const driftColumns = [...existingNames].filter(name => !registeredNames.has(name));

    if (driftColumns.length > 0) {
      logger.warn(
        `[Connection] Schema drift detected in table '${tableName}': ${driftColumns.join(', ')}\n` +
        '   These columns exist in DB but not in schema-registry.js\n' +
        '   -> Consider adding them to registry or removing from DB'
      );
    }
  }
}

export function refreshCanonicalViews(db, logger) {
  try {
    db.exec('DROP VIEW IF EXISTS call_graph;');
    logger.debug('[Connection] Refreshed canonical call_graph view');
  } catch (error) {
    logger.warn(`[Connection] Failed to refresh canonical views: ${error.message}`);
  }
}

export function initializeConnection(manager, projectPath, deps) {
  const {
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
    schemaSql
  } = deps;

  if (manager.initialized && manager.db && manager.db.open !== false) {
    return manager.db;
  }

  if (manager.db && manager.db.open === false) {
    manager.db = null;
    manager.initialized = false;
  }

  manager.dbPath = resolve(projectPath, '.omnysysdata', 'omnysys.db');
  ensureDataDirectory(projectPath, { logger, existsSync, mkdirSync });
  logger.debug(`[Connection] Initializing SQLite at: ${manager.dbPath}`);

  try {
    manager.db = new Database(manager.dbPath);
    applyConnectionConfig(manager.db, logger);
    initializeConnectionSchema(manager.db, {
      schemaSql,
      logger,
      generateCreateTableSQL,
      generateCreateIndexesSQL,
      detectMissingColumns,
      generateAddColumnSQL,
      getRegisteredTables,
      getTableDefinition
    });
    manager.integrity = probeDatabaseIntegrity(manager.db, logger);
    manager.initialized = true;
    logger.debug('[Connection] SQLite initialized successfully');

    queueMicrotask(() => {
      import('../repository/repository-bridge.js')
        .then(({ flushRepositoryMutationJournal }) => flushRepositoryMutationJournal(projectPath))
        .catch((error) => logger.debug(`[Connection] Repository bridge flush skipped: ${error.message}`));
    });

    return manager.db;
  } catch (error) {
    logger.error(`[Connection] Failed to initialize SQLite: ${error.message}`);
    throw error;
  }
}

export function applyConnectionConfig(db, logger) {
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = 64000');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('page_size = 4096');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  logger.debug('[Connection] SQLite config applied');
}

export function initializeConnectionSchema(db, {
  schemaSql,
  logger,
  generateCreateTableSQL,
  generateCreateIndexesSQL,
  detectMissingColumns,
  generateAddColumnSQL,
  getRegisteredTables,
  getTableDefinition
}) {
  refreshCanonicalViews(db, logger);

  if (schemaSql) {
    db.exec(schemaSql);
    logger.debug('[Connection] Base schema.sql executed');
  }

  syncRegisteredTables({
    db,
    getRegisteredTables,
    generateCreateTableSQL,
    generateCreateIndexesSQL,
    detectMissingColumns,
    generateAddColumnSQL,
    logger
  });
  reportSchemaDrift({
    db,
    getRegisteredTables,
    getTableDefinition,
    logger
  });

  logger.debug('[Connection] Schema initialization complete (registry-based)');
}

export function shutdownConnection(manager, logger) {
  if (manager.db) {
    manager.db.close();
    manager.db = null;
    manager.initialized = false;
    manager.integrity = null;
    logger.info('[Connection] Database connection closed');
  }
}

export function transactionConnection(manager, callback) {
  if (!manager.db || manager.db.open === false) {
    throw new Error('Database not initialized');
  }

  const transaction = manager.db.transaction(callback);
  return transaction();
}

export function getConnectionDatabase(manager) {
  if (!manager.db || manager.db.open === false) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return manager.db;
}

export function checkpointConnection(manager, logger) {
  if (!manager.db || manager.db.open === false) return;

  try {
    manager.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    logger.debug('[Connection] WAL checkpoint executed');
  } catch (error) {
    logger.warn('[Connection] WAL checkpoint failed:', error.message);
  }
}

export function isConnectionInitialized(manager) {
  return manager.initialized && manager.db !== null && manager.db.open !== false;
}
