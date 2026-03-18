/**
 * @fileoverview sqlite-relation-operations.js
 * 
 * Operaciones de relaciones para SQLite Adapter.
 * CRÍTICO: Mantiene transacciones atómicas para integridad referencial.
 * 
 * @module storage/repository/adapters/sqlite-relation-operations
 */

import { SQLiteQueryOperations } from './sqlite-query-operations.js';

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
      INSERT OR REPLACE INTO atom_relations 
      (source_id, target_id, relation_type, weight, line_number, context_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      sourceId,
      targetId,
      relationType,
      metadata.weight || 1.0,
      metadata.line || null,
      JSON.stringify(metadata.context || {}),
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
    
    // Fallback simple path utils
    const pathDirname = (p) => {
      const p2 = p.replace(/\\/g, '/');
      const idx = p2.lastIndexOf('/');
      return idx >= 0 ? p2.substring(0, idx) : '';
    };
    const pathJoin = (d, p) => {
      let b = d.replace(/\\/g, '/');
      let t = p.replace(/\\/g, '/');
      if (t.startsWith('./')) t = t.substring(2);
      while (t.startsWith('../')) {
        t = t.substring(3);
        const idx = b.lastIndexOf('/');
        b = idx >= 0 ? b.substring(0, idx) : '';
      }
      return b ? b + '/' + t : t;
    };

    const now = new Date().toISOString();
    let savedCount = 0;
    
    // Preparar statement para verificar existencia del target
    const checkStmt = this.db.prepare('SELECT 1 FROM atoms WHERE id = ?');
    
    // Preparar statement para insertar
    const insertStmt = this.db.prepare(`
      INSERT INTO atom_relations 
      (source_id, target_id, relation_type, weight, line_number, context_json, created_at)
      VALUES (?, ?, 'calls', ?, ?, ?, ?)
    `);
    
    const filePath = atomId.split('::')[0];
    let importsCache = null;

    const resolveTargetId = (calleeName) => {
      const localId = `${filePath}::${calleeName}`;
      if (checkStmt.get(localId)) return localId;
      if (calleeName.includes('.')) {
         const localMethodId = `${filePath}::${calleeName.split('.').pop()}`;
         if (checkStmt.get(localMethodId)) return localMethodId;
      }
      
      if (!importsCache) {
        try {
          const fileRow = this.db.prepare('SELECT imports_json FROM system_files WHERE path = ?').get(filePath);
          importsCache = fileRow && fileRow.imports_json && fileRow.imports_json !== 'null' ? JSON.parse(fileRow.imports_json) : [];
        } catch(e) { importsCache = []; }
      }
      
      const baseName = calleeName.split('.')[0];
      for (const imp of importsCache) {
        let matched = false;
        if (imp.specifiers && Array.isArray(imp.specifiers)) {
          matched = imp.specifiers.some(s => s.local === baseName || s.imported === baseName || s.local === calleeName);
        }
        if (!matched && imp.source && imp.source.includes(baseName)) {
          matched = true;
        }
        
        if (matched) {
          let targetPath = pathJoin(pathDirname(filePath), imp.source);
          if (!targetPath.endsWith('.js') && !targetPath.endsWith('.ts')) targetPath += '.js';
          
          const possibleIds = [
            `${targetPath}::${calleeName}`,
            `${targetPath}::${calleeName.split('.').pop()}`,
            `${targetPath}::${baseName}`
          ];
          for (const tid of possibleIds) {
            if (checkStmt.get(tid)) return tid;
          }
        }
      }
      return null;
    };

    for (const call of calls) {
      let calleeName;
      if (typeof call === 'string') {
        calleeName = call;
      } else if (call && typeof call === 'object') {
        calleeName = call.callee || call.name || call.id || 'unknown';
      } else {
        calleeName = 'unknown';
      }
      
      const targetId = resolveTargetId(calleeName);
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
        insertStmt.run(atomId, targetId, weight, lineNumber, contextJson, now);
        savedCount++;
      } catch (err) {
        // Ignorar errores de duplicados u otros
      }
    }
    
    return savedCount;
  }
}
