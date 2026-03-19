/**
 * @fileoverview sqlite-relation-operations.js
 * 
 * Operaciones de relaciones para SQLite Adapter.
 * CRÍTICO: Mantiene transacciones atómicas para integridad referencial.
 * 
 * @module storage/repository/adapters/sqlite-relation-operations
 */

import path from 'path';

import { SQLiteQueryOperations } from './sqlite-query-operations.js';
import { primeActiveAtomCache, resolveCallTargetId } from './helpers/call-target-resolver.js';

function normalizeCanonicalAtomId(id, projectPath = '') {
  if (!id || !String(id).includes('::')) {
    return String(id || '').replace(/\\/g, '/');
  }

  const [pathPart, ...rest] = String(id).split('::');
  const canonicalPath = String(pathPart || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  return `${canonicalPath}::${rest.join('::')}`;
}

function buildCanonicalAtomIdVariants(id, projectPath = '') {
  const variants = new Set();
  const normalizedId = normalizeCanonicalAtomId(id, projectPath);
  if (!normalizedId) {
    return [];
  }

  variants.add(normalizedId);

  if (!String(normalizedId).startsWith('C:/') && normalizedId.includes('::') && projectPath) {
    const [pathPart, ...rest] = normalizedId.split('::');
    const absolutePath = path.resolve(projectPath, pathPart).replace(/\\/g, '/');
    variants.add(`${absolutePath}::${rest.join('::')}`);
  }

  return Array.from(variants);
}

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
    if (!calls || calls.length === 0) return 0;

    const now = new Date().toISOString();
    let savedCount = 0;
    
    // Preparar statement para insertar
    const insertStmt = this.db.prepare(`
      INSERT INTO atom_relations 
      (source_id, target_id, relation_type, weight, line_number, context_json, created_at, is_removed, lifecycle_status, updated_at)
      VALUES (?, ?, 'calls', ?, ?, ?, ?, 0, 'active', ?)
      ON CONFLICT(source_id, target_id, relation_type, line_number) DO UPDATE SET
        weight = excluded.weight,
        line_number = excluded.line_number,
        context_json = excluded.context_json,
        is_removed = 0,
        lifecycle_status = 'active',
        updated_at = excluded.created_at
    `);
    const normalizedSourceId = normalizeCanonicalAtomId(atomId, this.projectPath);
    const sourceIdVariants = buildCanonicalAtomIdVariants(atomId, this.projectPath);
    const resolverCache = {
      importsBySourcePath: new Map(),
      resolvedTargets: new Map()
    };
    primeActiveAtomCache(this.db, resolverCache);

    if (sourceIdVariants.length > 0) {
      const deleteStmt = this.db.prepare(`DELETE FROM atom_relations WHERE source_id = ? AND relation_type = 'calls'`);
      const deleteBatch = this.db.transaction((ids) => {
        for (const sourceId of ids) {
          deleteStmt.run(sourceId);
        }
      });
      deleteBatch(sourceIdVariants);
    }

    for (const call of calls) {
      const targetId = resolveCallTargetId(
        this.db,
        normalizedSourceId,
        call,
        (id) => normalizeCanonicalAtomId(id, this.projectPath),
        resolverCache
      );
      if (!targetId) continue;
      
      const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
      const lineNumber = typeof call?.line === 'number' ? call.line : null;
      
      let contextJson = '{}';
      try {
        contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
      } catch (e) {
        contextJson = '{}';
      }
      
      try {
        insertStmt.run(normalizedSourceId, targetId, weight, lineNumber, contextJson, now, now);
        savedCount++;
      } catch (err) {
        // Ignorar errores de duplicados u otros
      }
    }
    
    return savedCount;
  }
}
