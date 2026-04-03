/**
 * @fileoverview sqlite-adapter-core.js
 *
 * Core del SQLite Adapter - inicializacion y configuracion.
 * Separado para mantener el codigo organizado sin romper la API.
 *
 * @module storage/repository/adapters/sqlite-adapter-core
 */

import { AtomRepository } from '../atom-repository.js';
import { connectionManager } from '../../database/connection.js';
import { createLogger } from '../../../../utils/logger.js';
import { statsPool } from '../../../../shared/utils/stats-pool.js';
import { normalizePath } from '../../../../shared/utils/path-utils.js';
import { atomToRow, rowToAtom } from './helpers/converters.js';
import {
  buildSQLiteAdapterStatements
} from './core-helpers.js';

const logger = createLogger('OmnySys:Storage:SQLiteAdapter');

/**
 * Core base del SQLite Adapter
 * Mantiene estado y configuracion base
 */
export class SQLiteAdapterCore extends AtomRepository {
  constructor() {
    super();
    this.db = null;
    this.initialized = false;
    this.statements = {};
    this.projectPath = null;
    this._logger = logger;
  }

  initialize(projectPath) {
    this._logger.debug('[SQLiteAdapter] Initializing...');
    this.projectPath = projectPath;
    connectionManager.initialize(projectPath);
    this.db = connectionManager.getDatabase();
    this.statements = buildSQLiteAdapterStatements(this.db);
    this.initialized = true;
    this._logger.debug('[SQLiteAdapter] Initialized successfully');
  }

  /**
   * Normaliza una ruta para la base de datos
   * @protected
   */
  _normalize(filePath) {
    return normalizePath(filePath, this.projectPath);
  }

  close() {
    connectionManager.shutdown();
    this.initialized = false;
    this.db = null;
    this.statements = {};
    this.projectPath = null;
  }

  isReady() {
    return !!(this.initialized && this.db && this.db.open !== false);
  }

  getSQLiteAdapterCoreStats() {
    return statsPool.getModuleStats('sqlite-adapter-core');
  }

}

export { connectionManager, atomToRow, rowToAtom, logger };

