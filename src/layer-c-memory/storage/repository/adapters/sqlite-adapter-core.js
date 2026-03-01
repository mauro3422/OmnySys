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
    this._logger.info('[SQLiteAdapter] Initializing...');

    this.projectPath = projectPath;
    connectionManager.initialize(projectPath);
    this.db = connectionManager.getDatabase();
    this._prepareStatements();
    this.initialized = true;

    this._logger.info('[SQLiteAdapter] Initialized successfully');
  }

  /**
   * Normaliza una ruta para la base de datos
   * @protected
   */
  _normalize(filePath) {
    return normalizePath(filePath, this.projectPath);
  }

  /**
   * Prepara statements frecuentes para mejor performance
   * @protected
   */
  _prepareStatements() {
    this.statements = {
      getById: this.db.prepare('SELECT * FROM atoms WHERE id = ?'),
      getByFile: this.db.prepare('SELECT * FROM atoms WHERE file_path = ?'),
      insertAtom: this.db.prepare(this._buildInsertSQL()),
      deleteById: this.db.prepare('DELETE FROM atoms WHERE id = ?'),
      deleteByFile: this.db.prepare('DELETE FROM atoms WHERE file_path = ?'),
      query: this.db.prepare('SELECT * FROM files WHERE path = ?'),
      getAll: this.db.prepare('SELECT * FROM atoms LIMIT ? OFFSET ?'),
      getCallers: this.db.prepare(`
        SELECT a.id, a.name, a.file_path, r.weight, r.line_number
        FROM atom_relations r
        JOIN atoms a ON r.source_id = a.id
        WHERE r.target_id = ? AND r.relation_type = 'calls'
      `),
      getCallees: this.db.prepare(`
        SELECT a.id, a.name, a.file_path, r.weight, r.line_number
        FROM atom_relations r
        JOIN atoms a ON r.target_id = a.id
        WHERE r.source_id = ? AND r.relation_type = 'calls'
      `),
      exists: this.db.prepare('SELECT 1 FROM atoms WHERE id = ?')
    };
  }

  _buildInsertSQL() {
    const columns = [
      'id', 'name', 'atom_type', 'file_path',
      'line_start', 'line_end', 'lines_of_code', 'complexity', 'parameter_count',
      'is_exported', 'is_async', 'is_test_callback', 'test_callback_type',
      'archetype_type', 'archetype_severity', 'archetype_confidence',
      'purpose_type', 'purpose_confidence', 'is_dead_code',
      'importance_score', 'coupling_score', 'cohesion_score', 'stability_score',
      'propagation_score', 'fragility_score', 'testability_score',
      'callers_count', 'callees_count', 'dependency_depth', 'external_call_count',
      'in_degree', 'out_degree', 'centrality_score', 'centrality_classification', 'risk_level', 'risk_prediction',
      'extracted_at', 'updated_at', 'change_frequency', 'age_days', 'generation',
      'signature_json', 'data_flow_json', 'calls_json', 'temporal_json',
      'error_flow_json', 'performance_json', 'dna_json', 'derived_json', '_meta_json',
      'shared_state_json', 'event_emitters_json', 'event_listeners_json', 'scope_type',
      'called_by_json', 'function_type',
      'has_error_handling', 'has_network_calls'
    ];
    const placeholders = columns.map(() => '?').join(', ');
    return `INSERT OR REPLACE INTO atoms (${columns.join(', ')}) VALUES (${placeholders})`;
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
  saveSystemMap(systemMap) {
    persistSystemMapToDb(this.db, connectionManager, systemMap, this._logger);
  }

  loadSystemMap() {
    return retrieveSystemMapFromDb(this.db);
  }
}

export { connectionManager, atomToRow, rowToAtom, logger };
