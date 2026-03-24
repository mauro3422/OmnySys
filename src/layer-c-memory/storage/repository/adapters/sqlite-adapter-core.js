import { statsPool } from '../../../../shared/utils/stats-pool.js';
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
import { createLogger } from '#utils/logger.js';
import { atomToRow, rowToAtom } from './helpers/converters.js';
import {
  initializeSQLiteAdapterCore,
  normalizeSQLiteAdapterPath,
  shutdownSQLiteAdapterCore,
  syncSQLiteAdapterSystemMap,
  loadSQLiteAdapterSystemMap
} from './sqlite-adapter-core-helpers.js';

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
    initializeSQLiteAdapterCore(this, projectPath, { connectionManager, logger: this._logger });
  }

  /**
   * Normaliza una ruta para la base de datos
   * @protected
   */
  _normalize(filePath) {
    return normalizeSQLiteAdapterPath(filePath, this.projectPath);
  }

  getSQLiteAdapterCoreStats() {
    return statsPool.getModuleStats('sqlite-adapter-core');
  }

  shutdown() {
    return shutdownSQLiteAdapterCore(this, connectionManager);
  }

  checkpoint() {
    connectionManager.checkpoint();
  }

  // System Map
  async saveSystemMap(systemMap) {
    await syncSQLiteAdapterSystemMap(this, connectionManager, systemMap, this._logger);
  }

  loadSystemMap() {
    return loadSQLiteAdapterSystemMap(this);
  }
}

export { connectionManager, atomToRow, rowToAtom, logger };

