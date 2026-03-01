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
    const row = this.statements.query.get(filePath);
    return row || null;
  }

  save(atom) {
    // Normalizar datos del atomo antes de guardar
    atom.filePath = this._normalize(atom.file || atom.filePath);
    atom.file = atom.filePath;
    atom.id = `${atom.filePath}::${atom.name}`;

    const row = atomToRow(atom);
    const now = new Date().toISOString();

    const values = [
      row.id, row.name, row.atom_type, row.file_path,
      row.line_start, row.line_end, row.lines_of_code, row.complexity, row.parameter_count,
      row.is_exported, row.is_async, row.is_test_callback, row.test_callback_type,
      row.archetype_type, row.archetype_severity, row.archetype_confidence,
      row.purpose_type, row.purpose_confidence, row.is_dead_code,
      row.importance_score, row.coupling_score, row.cohesion_score, row.stability_score,
      row.propagation_score, row.fragility_score, row.testability_score,
      row.callers_count, row.callees_count, row.dependency_depth, row.external_call_count,
      row.extracted_at, now, row.change_frequency, row.age_days, row.generation,
      row.signature_json, row.data_flow_json, row.calls_json, row.temporal_json,
      row.error_flow_json, row.performance_json, row.dna_json, row.derived_json, row._meta_json,
      row.called_by_json, row.function_type
    ];

    this.statements.insertAtom.run(values);
    this._logger.debug(`[SQLiteAdapter] Saved atom: ${atom.id}`);

    // FIX: Forzar checkpoint WAL para que los datos sean visibles inmediatamente
    // Esto previene el bug donde los datos no se ven después de escrituras individuales
    try {
      this.db.exec('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (e) {
      // Ignorar errores de checkpoint - los datos están guardados igual
      this._logger.debug(`[SQLiteAdapter] Checkpoint error (non-critical): ${e.message}`);
    }

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
      this._markRelatedTestAtoms(id, atomBefore.file_path);
    }

    // 4. Borrar el átomo (las FK con CASCADE borran relaciones automáticamente)
    const result = this.statements.deleteById.run(normalizedId);

    // FIX: Forzar checkpoint WAL para que los datos sean visibles inmediatamente
    try {
      this.db.exec('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (e) {
      // Ignorar errores de checkpoint - los datos están guardados igual
    }

    return result.changes > 0;
  }

  /**
   * Marca átomos de test relacionados como huérfanos cuando se borra el átomo fuente
   * @private
   */
  _markRelatedTestAtoms(sourceId, sourceFilePath) {
    try {
      // Buscar átomos de test que mencionen el átomo fuente en su nombre o calls
      const testAtoms = this.db.prepare(`
        SELECT id, calls_json FROM atoms 
        WHERE is_test_callback = 1 
        AND (id LIKE ? OR calls_json LIKE ?)
      `).all(`%${sourceFilePath}%`, `%${sourceId}%`);

      for (const testAtom of testAtoms) {
        // Marcar como huérfano actualizando derived_json
        const currentData = this.statements.getById.get(testAtom.id);
        if (currentData) {
          let derived = currentData.derived_json ? JSON.parse(currentData.derived_json) : {};
          derived.orphaned = true;
          derived.orphanedFrom = sourceId;
          derived.orphanedAt = new Date().toISOString();

          this.db.prepare(`
            UPDATE atoms SET derived_json = ? WHERE id = ?
          `).run(JSON.stringify(derived), testAtom.id);

          this._logger.debug(`[SQLiteAdapter] Marked test atom as orphaned: ${testAtom.id}`);
        }
      }
    } catch (e) {
      this._logger.warn(`[SQLiteAdapter] Failed to mark related tests: ${e.message}`);
    }
  }

  deleteByFile(filePath) {
    const normalizedPath = this._normalize(filePath);
    const result = this.statements.deleteByFile.run(normalizedPath);
    return result.changes;
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
