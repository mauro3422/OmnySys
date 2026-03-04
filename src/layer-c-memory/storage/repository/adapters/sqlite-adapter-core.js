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
    const columns = this._getAtomColumns();
    const placeholders = columns.map(() => '?').join(', ');
    return `INSERT OR REPLACE INTO atoms (${columns.join(', ')}) VALUES (${placeholders})`;
  }

  /**
   * Orden canonico de columnas para INSERT/UPSERT de atoms.
   * Mantener sincronizado con atomToRow.
   * @protected
   */
  _getAtomColumns() {
    return [
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
      'has_error_handling', 'has_network_calls', 'is_phase2_complete'
    ];
  }

  /**
   * Construye el array de valores en el mismo orden que _getAtomColumns.
   * @param {object} row
   * @param {string} updatedAt ISO timestamp para updated_at
   * @returns {Array}
   * @protected
   */
  _buildAtomInsertValues(row, updatedAt) {
    return [
      row.id, row.name, row.atom_type, row.file_path,
      row.line_start, row.line_end, row.lines_of_code, row.complexity, row.parameter_count,
      row.is_exported, row.is_async, row.is_test_callback, row.test_callback_type,
      row.archetype_type, row.archetype_severity, row.archetype_confidence,
      row.purpose_type, row.purpose_confidence, row.is_dead_code,
      row.importance_score, row.coupling_score, row.cohesion_score, row.stability_score,
      row.propagation_score, row.fragility_score, row.testability_score,
      row.callers_count, row.callees_count, row.dependency_depth, row.external_call_count,
      row.in_degree, row.out_degree, row.centrality_score, row.centrality_classification, row.risk_level, row.risk_prediction,
      row.extracted_at, updatedAt, row.change_frequency, row.age_days, row.generation,
      row.signature_json, row.data_flow_json, row.calls_json, row.temporal_json,
      row.error_flow_json, row.performance_json, row.dna_json, row.derived_json, row._meta_json,
      row.shared_state_json, row.event_emitters_json, row.event_listeners_json, row.scope_type,
      row.called_by_json, row.function_type,
      row.has_error_handling, row.has_network_calls, row.is_phase2_complete
    ];
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
