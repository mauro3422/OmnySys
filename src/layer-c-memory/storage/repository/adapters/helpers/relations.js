/**
 * @fileoverview relations.js
 * 
 * Gestión de relaciones entre átomos (calls, dependencies).
 * 
 * @module storage/repository/adapters/helpers/relations
 */

import { safeNumber, safeJson } from './converters.js';

/**
 * Guarda las llamadas (calls) de un átomo
 */
export function saveCalls(db, atomId, calls, logger) {
  const now = new Date().toISOString();
  
  // Primero borrar relaciones existentes
  const deleteStmt = db.prepare(
    "DELETE FROM atom_relations WHERE source_id = ? AND relation_type = 'calls'"
  );
  deleteStmt.run(atomId);
  
  if (!calls || calls.length === 0) return;
  
  // Insertar nuevas relaciones
  const insertStmt = db.prepare(`
    INSERT INTO atom_relations 
    (source_id, target_id, relation_type, weight, line_number, context_json, created_at)
    VALUES (?, ?, 'calls', ?, ?, ?, ?)
  `);
  
  for (const call of calls) {
    // Extraer el nombre del callee de forma segura
    let calleeName;
    if (typeof call === 'string') {
      calleeName = call;
    } else if (call && typeof call === 'object') {
      calleeName = call.callee || call.name || call.id || 'unknown';
    } else {
      calleeName = 'unknown';
    }
    
    // Construir targetId basado en el file_path del atom actual
    const filePath = atomId.split('::')[0];
    const targetId = `${filePath}::${calleeName}`;
    
    // Asegurar que los valores son del tipo correcto para SQLite
    const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
    const lineNumber = typeof call?.line === 'number' ? call.line : null;
    
    // Serializar el contexto de forma segura
    let contextJson = '{}';
    try {
      contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
    } catch (e) {
      logger.warn(`[SQLiteAdapter] Failed to stringify call context for ${atomId}: ${e.message}`);
      contextJson = '{}';
    }
    
    insertStmt.run(atomId, targetId, weight, lineNumber, contextJson, now);
  }
}

/**
 * Guarda un batch de relaciones de forma eficiente
 * Este método asume que todos los átomos ya existen en la BD
 */
export function saveRelationsBatch(db, connectionManager, relations, logger) {
  if (!relations || relations.length === 0) return;
  
  const now = new Date().toISOString();
  
  // Agrupar por atomId para hacer DELETE por batch
  const atomsWithCalls = new Map();
  for (const { atomId, call } of relations) {
    if (!atomsWithCalls.has(atomId)) {
      atomsWithCalls.set(atomId, []);
    }
    atomsWithCalls.get(atomId).push(call);
  }
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO atom_relations 
    (source_id, target_id, relation_type, weight, line_number, context_json, created_at)
    VALUES (?, ?, 'calls', ?, ?, ?, ?)
  `);
  
  // Usar transaccion para todo el batch
  connectionManager.transaction(() => {
    for (const [atomId, calls] of atomsWithCalls) {
      // Borrar relaciones existentes para este atom
      const deleteStmt = db.prepare(
        "DELETE FROM atom_relations WHERE source_id = ? AND relation_type = 'calls'"
      );
      deleteStmt.run(atomId);
      
      // Insertar nuevas relaciones
      for (const call of calls) {
        let calleeName;
        if (typeof call === 'string') {
          calleeName = call;
        } else if (call && typeof call === 'object') {
          calleeName = call.callee || call.name || call.id || 'unknown';
        } else {
          calleeName = 'unknown';
        }
        
        const filePath = atomId.split('::')[0];
        const targetId = `${filePath}::${calleeName}`;
        
        const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
        const lineNumber = typeof call?.line === 'number' ? call.line : null;
        
        let contextJson = '{}';
        try {
          contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
        } catch (e) {
          contextJson = '{}';
        }
        
        // OR IGNORE para evitar errores si la relacion ya existe
        insertStmt.run(atomId, targetId, weight, lineNumber, contextJson, now);
      }
    }
  });
  
  logger.debug(`[SQLiteAdapter] Batch saved ${relations.length} relations for ${atomsWithCalls.size} atoms`);
}
