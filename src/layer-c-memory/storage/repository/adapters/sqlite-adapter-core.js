/**
 * @fileoverview sqlite-adapter-core.js
 * 
 * Core del SQLite Adapter - inicialización y configuración.
 * Separado para mantener el código organizado sin romper la API.
 * 
 * @module storage/repository/adapters/sqlite-adapter-core
 */

import { AtomRepository } from '../atom-repository.js';
import { connectionManager } from '../../database/connection.js';
import { createLogger } from '#utils/logger.js';
import { atomToRow, rowToAtom } from './helpers/converters.js';
import { persistSystemMapToDb, retrieveSystemMapFromDb } from './helpers/system-map.js';
import { normalizePath } from '#shared/utils/path-utils.js';
import { TABLE_DEFINITIONS } from '../../database/schema-registry.js';

const logger = createLogger('OmnySys:Storage:SQLiteAdapter');

/**
 * Core base del SQLite Adapter
 * Mantiene estado y configuración base
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
    this._prepareStatements();
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

  /**
   * Obtiene el predicado SQL standard para filtrar registros removidos.
   * @param {string} [tableAlias] - Alias de la tabla (ej: 'a')
   * @param {boolean} [includeRemoved=false] - Si es true, retorna '1=1'
   * @returns {string} Predicado SQL
   */
  getStandardPredicate(tableAlias = '', includeRemoved = false) {
    if (includeRemoved) return '1=1';
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `(${prefix}is_removed IS NULL OR ${prefix}is_removed = 0)`;
  }

  /**
   * Prepara statements frecuentes para mejor performance
   * @protected
   */
  _prepareStatements() {
    this.statements = {
      getById: this.db.prepare('SELECT * FROM atoms WHERE id = ? AND is_removed = 0'),
      getByFile: this.db.prepare('SELECT * FROM atoms WHERE file_path = ? AND is_removed = 0'),
      insertAtom: this.db.prepare(this._buildInsertSQL()),
      deleteById: this.db.prepare("UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE id = ?"),
      deleteByFile: this.db.prepare("UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE file_path = ?"),
      deleteFile: this.db.prepare("UPDATE files SET is_removed = 1, updated_at = datetime('now') WHERE path = ?"),
      query: this.db.prepare('SELECT * FROM files WHERE path = ? AND is_removed = 0'),
      getAll: this.db.prepare('SELECT * FROM atoms WHERE is_removed = 0 LIMIT ? OFFSET ?'),
      getCallers: this.db.prepare(`
        SELECT a.id, a.name, a.file_path, r.weight, r.line_number
        FROM atom_relations r
        JOIN atoms a ON r.source_id = a.id
        WHERE r.target_id = ? AND r.relation_type = 'calls' 
          AND r.is_removed = 0 AND a.is_removed = 0
      `),
      getCallees: this.db.prepare(`
        SELECT a.id, a.name, a.file_path, r.weight, r.line_number
        FROM atom_relations r
        JOIN atoms a ON r.target_id = a.id
        WHERE r.source_id = ? AND r.relation_type = 'calls'
          AND r.is_removed = 0 AND a.is_removed = 0
      `),
      exists: this.db.prepare('SELECT 1 FROM atoms WHERE id = ? AND is_removed = 0')
    };
  }

  _buildInsertSQL() {
    const columns = this._getAtomColumns();
    const placeholders = columns.map(() => '?').join(', ');
    return `INSERT OR REPLACE INTO atoms (${columns.join(', ')}) VALUES (${placeholders})`;
  }

  /**
   * Orden canonico de columnas para INSERT/UPSERT de atoms.
   * Derivado dinámicamente de schema-registry.js para evitar duplicidad de código.
   * @protected
   */
  _getAtomColumns() {
    return TABLE_DEFINITIONS.atoms.columns.map(c => c.name);
  }

  /**
   * Construye el array de valores iterando las columnas generadas en _getAtomColumns.
   * @param {object} row
   * @param {string} updatedAt ISO timestamp para updated_at
   * @returns {Array}
   * @protected
   */
  _buildAtomInsertValues(row, updatedAt) {
    const columns = this._getAtomColumns();
    return columns.map(col => {
      if (col === 'updated_at' && updatedAt) return updatedAt;
      return row[col] !== undefined ? row[col] : null;
    });
  }

  getStats() {
    return connectionManager.getStats();
  }

  close() {
    connectionManager.close();
    this.initialized = false;
    this.db = null;
    this.statements = {};
  }

  checkpoint() {
    connectionManager.checkpoint();
  }

  // System Map
  async saveSystemMap(systemMap) {
    await persistSystemMapToDb(this.db, connectionManager, systemMap, this._logger);
  }

  loadSystemMap() {
    return retrieveSystemMapFromDb(this.db);
  }
}

export { connectionManager, atomToRow, rowToAtom, logger };
