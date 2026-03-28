/**
 * @fileoverview sqlite-crud-operations.js
 * 
 * Operaciones CRUD básicas para SQLite Adapter.
 * Extensión del core para mantener separación de responsabilidades.
 * 
 * @module storage/repository/adapters/sqlite-crud-operations
 */

import { SQLiteAdapterCore } from './sqlite-adapter-core.js';
import { getAllFileHashes } from './helpers/file-hash-lookup.js';
import { deleteAtomRecord, saveAtomRecord, softDeleteRelatedCallRelations } from './helpers/sqlite-crud-persistence.js';
import { rowToAtom } from './helpers/converters.js';

/**
 * Mixin/Clase base para operaciones CRUD
 * Diseñado para ser extendido por SQLiteAdapter
 */
export class SQLiteCrudOperations extends SQLiteAdapterCore {

  getById(id) {
    const normalizedId = this._normalizeId(id);
    const row = this._getAtomRowById(normalizedId);
    if (!row) return null;

    const atom = rowToAtom(row);
    atom.calls = this.getCallees(normalizedId);
    atom.calledBy = this.getCallers(normalizedId);

    return atom;
  }

  getByFileAndName(filePath, name) {
    return this.getById(this._composeAtomId(filePath, name));
  }

  getByFile(filePath) {
    return this._getAtomRowsByFile(filePath).map(rowToAtom);
  }

  getFile(filePath) {
    const row = this._getFileRow(filePath);
    return row || null;
  }

  /**
   * Carga TODOS los hashes de archivos en un Map (1 query batch).
   * Reemplaza el patrón N+1 de getFile() en el worker de análisis.
   * @returns {Map<string, string>} Map<relativePath, hash>
   */
  getAllFileHashes() {
    return getAllFileHashes(this.db);
  }

  save(atom) {
    return saveAtomRecord(this, atom);
  }

  delete(id) {
    return deleteAtomRecord(this, id);
  }

  deleteByFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    const relatedAtomIds = this._getAtomIdsByFile(filePath);
    const result = this.statements.deleteByFile.run(normalizedPath);
    softDeleteRelatedCallRelations(this, relatedAtomIds);
    return result.changes;
  }

  deleteFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    const result = this.statements.deleteFile.run(normalizedPath);
    return result.changes > 0;
  }

  exists(id) {
    return this._hasAtomById(id);
  }

  /**
   * Helper para normalizar un ID (que es path::name)
   * @protected
   */
  _normalizeId(id) {
    if (!id || !id.includes('::')) return id;
    const [pathPart, namePart] = id.split('::');
    return `${this._normalize(pathPart)}::${namePart}`;
  }

  _composeAtomId(filePath, name) {
    return `${this._normalize(filePath)}::${name}`;
  }

  _getAtomRowById(normalizedId) {
    return this.statements.getById.get(normalizedId);
  }

  _getAtomRowsByFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    return this.statements.getByFile.all(normalizedPath);
  }

  _getFileRow(filePath) {
    const normalizedPath = this._normalize(filePath);
    return this.statements.query.get(normalizedPath);
  }

  _getAtomIdsByFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    return this.db.prepare('SELECT id FROM atoms WHERE file_path = ?').all(normalizedPath).map((row) => row.id);
  }

  _hasAtomById(id) {
    const normalizedId = this._normalizeId(id);
    return !!this.statements.exists.get(normalizedId);
  }
}
