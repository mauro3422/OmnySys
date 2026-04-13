/**
 * @fileoverview sqlite-relation-operations.js
 * 
 * Operaciones de relaciones para SQLite Adapter.
 * CRÍTICO: Mantiene transacciones atómicas para integridad referencial.
 * 
 * @module storage/repository/adapters/sqlite-relation-operations
 */

import { SQLiteQueryOperations } from './sqlite-query-operations.js';
import { saveCalls } from './helpers/relations.js';

/**
 * Clase para operaciones de relaciones
 * Extiende Query con capacidades de grafo
 */
export class SQLiteRelationOperations extends SQLiteQueryOperations {
  
  getCallers(id) {
    const rows = this.statements.getCallers.all(id);
    
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      file: r.file_path,
      weight: r.weight,
      line: r.line_number
    }));
  }

  getCallees(id) {
    const rows = this.statements.getCallees.all(id);
    
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      file: r.file_path,
      weight: r.weight,
      line: r.line_number
    }));
  }

  getCallGraph(id, options = {}) {
    const depth = options.depth || 1;
    const visited = new Set();
    const nodes = [];
    const edges = [];

    const traverse = (currentId, currentDepth) => {
      if (currentDepth > depth || visited.has(currentId)) return;
      visited.add(currentId);

      const atom = this.getById(currentId);
      if (!atom) return;

      nodes.push(atom);

      if (atom.calls) {
        for (const call of atom.calls) {
          const calleeId = typeof call === 'string' ? call : call.id || call.callee;
          edges.push({ from: currentId, to: calleeId, type: 'calls' });
          traverse(calleeId, currentDepth + 1);
        }
      }
    };

    traverse(id, 0);
    
    return { rootId: id, nodes, edges, depth };
  }

  saveRelation(sourceId, targetId, relationType, metadata = {}) {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO atom_relations 
      (source_id, target_id, relation_type, weight, line_number, context_json, created_at, is_removed, lifecycle_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)
      ON CONFLICT(source_id, target_id, relation_type, line_number) DO UPDATE SET
        weight = excluded.weight,
        line_number = excluded.line_number,
        context_json = excluded.context_json,
        is_removed = 0,
        lifecycle_status = 'active',
        updated_at = excluded.created_at
    `);
    
    stmt.run(
      sourceId,
      targetId,
      relationType,
      metadata.weight || 1.0,
      metadata.line || null,
      JSON.stringify(metadata.context || {}),
      now,
      now
    );
  }

  /**
   * Guarda las llamadas (calls) de un átomo
   * Solo guarda relaciones donde el target existe en la base de datos
   * @param {string} atomId - ID del átomo
   * @param {Array} calls - Array de llamadas
   * @returns {number} - Cantidad de relaciones guardadas
   */
  saveCalls(atomId, calls) {
    return saveCalls(this.db, atomId, calls, this._logger);
  }
}
