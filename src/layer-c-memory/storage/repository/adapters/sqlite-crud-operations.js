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
    const row = this.statements.getById.get(id);
    if (!row) return null;
    
    const atom = rowToAtom(row);
    atom.calls = this.getCallees(id);
    atom.calledBy = this.getCallers(id);
    
    return atom;
  }

  getByFileAndName(filePath, name) {
    const id = `${filePath}::${name}`;
    return this.getById(id);
  }

  getByFile(filePath) {
    const rows = this.statements.getByFile.all(filePath);
    return rows.map(rowToAtom);
  }

  save(atom) {
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
    
    return atom;
  }

  delete(id) {
    const now = new Date().toISOString();
    
    // 1. Obtener estado actual antes de borrar (para historia)
    const atomBefore = this.statements.getById.get(id);
    
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
    const result = this.statements.deleteById.run(id);
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
    const result = this.statements.deleteByFile.run(filePath);
    return result.changes;
  }

  exists(id) {
    const row = this.statements.exists.get(id);
    return !!row;
  }
}
