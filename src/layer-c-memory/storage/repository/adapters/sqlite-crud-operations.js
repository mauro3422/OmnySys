/**
 * @fileoverview sqlite-crud-operations.js
 * 
 * Operaciones CRUD básicas para SQLite Adapter.
 * Extensión del core para mantener separación de responsabilidades.
 * 
 * @module storage/repository/adapters/sqlite-crud-operations
 */

import { SQLiteAdapterCore } from './sqlite-adapter-core.js';
import { atomToRow, rowToAtom } from './helpers/converters.js';
import { buildAtomInsertValues } from './helpers/atom-schema.js';
import { getAllFileHashes } from './helpers/file-hash-lookup.js';
import { markRelatedTestAtoms } from './helpers/test-atom-orphaning.js';

/**
 * Mixin/Clase base para operaciones CRUD
 * Diseñado para ser extendido por SQLiteAdapter
 */
export class SQLiteCrudOperations extends SQLiteAdapterCore {

  getById(id) {
    const normalizedId = this._normalizeId(id);
    const row = this.statements.getById.get(normalizedId);
    if (!row) return null;

    const atom = rowToAtom(row);
    atom.calls = this.getCallees(normalizedId);
    atom.calledBy = this.getCallers(normalizedId);

    return atom;
  }

  getByFileAndName(filePath, name) {
    const normalizedPath = this._normalize(filePath);
    const id = `${normalizedPath}::${name}`;
    return this.getById(id);
  }

  getByFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    const rows = this.statements.getByFile.all(normalizedPath);
    return rows.map(rowToAtom);
  }

  getFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    const row = this.statements.query.get(normalizedPath);
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
    // Normalizar datos del atomo antes de guardar
    atom.filePath = this._normalize(atom.file || atom.filePath);
    atom.file = atom.filePath;
    atom.id = `${atom.filePath}::${atom.name}`;

    const normalizedId = atom.id;
    const now = new Date().toISOString();

    // 1. Snapshot del estado anterior (para diffing/historia)
    const atomBefore = this.statements.getById.get(normalizedId);

    const row = atomToRow(atom);
    const values = buildAtomInsertValues(row, now);

    // 2. Guardar/Actualizar átomo
    this.statements.insertAtom.run(...values);

    // 3. Registrar evento (Event Sourcing prototype)
    if (atomBefore) {
      // Si el DNA cambió, es un evento de actualización semántica
      const dnaBefore = atomBefore.dna_json;
      const dnaAfter = row.dna_json;

      if (dnaBefore !== dnaAfter) {
        try {
          this.db.prepare(`
            INSERT INTO atom_events (atom_id, event_type, before_state, after_state, timestamp, source)
            VALUES (?, 'updated', ?, ?, ?, 'extractor')
          `).run(normalizedId, dnaBefore, dnaAfter, now);
        } catch (e) {
          this._logger.warn(`[SQLiteAdapter] Failed to log update event: ${e.message}`);
        }
      }
    } else {
      // Evento de creación
      try {
        this.db.prepare(`
          INSERT INTO atom_events (atom_id, event_type, after_state, timestamp, source)
          VALUES (?, 'created', ?, ?, 'extractor')
        `).run(normalizedId, row.dna_json, now);
      } catch (e) {
        this._logger.warn(`[SQLiteAdapter] Failed to log creation event: ${e.message}`);
      }
    }

    this._logger.debug(`[SQLiteAdapter] Saved atom: ${atom.id}`);
    return atom;
  }

  delete(id) {
    const normalizedId = this._normalizeId(id);
    const now = new Date().toISOString();

    // 1. Obtener estado actual antes de borrar (para historia)
    const atomBefore = this.statements.getById.get(normalizedId);

    // 2. Registrar evento de borrado en atom_events (historia/evolución)
    if (atomBefore) {
      try {
        this.db.prepare(`
          INSERT INTO atom_events (atom_id, event_type, before_state, impact_score, timestamp, source)
          VALUES (?, 'deleted', ?, ?, ?, 'system_cleanup')
        `).run(id, JSON.stringify(atomBefore), 0.5, now);
      } catch (e) {
          this._logger.warn(`[SQLiteAdapter] Failed to log delete event: ${e.message}`);
        }

      // 3. Buscar y marcar átomos espejo (tests relacionados)
      markRelatedTestAtoms(this.db, normalizedId, atomBefore.file_path, this._logger);
    }

    // 4. Borrar el átomo (las FK con CASCADE borran relaciones automáticamente)
    const result = this.statements.deleteById.run(normalizedId);
    return result.changes > 0;
  }

  deleteByFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    const result = this.statements.deleteByFile.run(normalizedPath);
    return result.changes;
  }

  deleteFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    const result = this.statements.deleteFile.run(normalizedPath);
    return result.changes > 0;
  }

  exists(id) {
    const normalizedId = this._normalizeId(id);
    const row = this.statements.exists.get(normalizedId);
    return !!row;
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
}
