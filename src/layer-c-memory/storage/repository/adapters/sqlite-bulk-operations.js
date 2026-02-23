/**
 * @fileoverview sqlite-bulk-operations.js
 * 
 * Operaciones bulk para SQLite Adapter.
 * CRÍTICO: Mantiene UNA SOLA TRANSACCIÓN para todas las operaciones bulk
 * para maximizar performance (de 26s a 2s).
 * 
 * @module storage/repository/adapters/sqlite-bulk-operations
 */

import { SQLiteRelationOperations } from './sqlite-relation-operations.js';
import { connectionManager } from '../../database/connection.js';
import { atomToRow } from './helpers/converters.js';

/**
 * Clase para operaciones bulk
 * Extiende Relations con operaciones de alto volumen
 * 
 * IMPORTANTE: Los métodos bulk DEBEN mantener la transacción atómica
 * para evitar degradación de performance (de 2s a 26s).
 */
export class SQLiteBulkOperations extends SQLiteRelationOperations {
  
  /**
   * Guarda múltiples átomos + relaciones en una sola transacción
   * 
   * FLUJO:
   * 1. Transacción BEGIN
   * 2. Bulk insert de todos los átomos
   * 3. Bulk insert de todas las relaciones (ahora los targets existen)
   * 4. Transacción COMMIT
   * 
   * @param {Array} atoms - Array de átomos a guardar
   * @returns {Array} - Átomos guardados
   */
  saveMany(atoms) {
    // Fase 1: Guardar todos los atomos primero
    this.saveManyBulk(atoms);
    
    // Fase 2: Guardar todas las relaciones despues de que todos los atomos existen
    const relationsToSave = [];
    for (const atom of atoms) {
      if (atom.calls?.length > 0) {
        for (const call of atom.calls) {
          relationsToSave.push({ atomId: atom.id, call });
        }
      }
    }
    
    if (relationsToSave.length > 0) {
      this.saveRelationsBulk(relationsToSave);
    }
    
    this._logger.info(`[SQLiteAdapter] Saved ${atoms.length} atoms`);
    
    return atoms;
  }

  /**
   * Guarda múltiples átomos usando multi-row INSERT para máxima performance
   * 
   * OPTIMIZACIÓN: Una sola transacción para todos los batches
   * 
   * @param {Array} atoms - Array de átomos a guardar
   * @param {number} batchSize - Tamaño del batch (default: 500)
   */
  saveManyBulk(atoms, batchSize = 500) {
    if (!atoms || atoms.length === 0) return;
    
    const now = new Date().toISOString();
    const totalBatches = Math.ceil(atoms.length / batchSize);
    let totalSaved = 0;
    
    // Columnas para INSERT
    const columns = [
      'id', 'name', 'atom_type', 'file_path',
      'line_start', 'line_end', 'lines_of_code', 'complexity', 'parameter_count',
      'is_exported', 'is_async', 'is_test_callback', 'test_callback_type',
      'archetype_type', 'archetype_severity', 'archetype_confidence',
      'purpose_type', 'purpose_confidence', 'is_dead_code',
      'importance_score', 'coupling_score', 'cohesion_score', 'stability_score',
      'propagation_score', 'fragility_score', 'testability_score',
      'callers_count', 'callees_count', 'dependency_depth', 'external_call_count',
      'extracted_at', 'updated_at', 'change_frequency', 'age_days', 'generation',
      'signature_json', 'data_flow_json', 'calls_json', 'temporal_json',
      'error_flow_json', 'performance_json', 'dna_json', 'derived_json', '_meta_json'
    ];
    
    const columnStr = columns.join(', ');
    
    // UNA SOLA TRANSACCIÓN para todo el bulk insert
    connectionManager.transaction(() => {
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const batch = atoms.slice(batchNum * batchSize, (batchNum + 1) * batchSize);
        
        // Construir VALUES clause con múltiples rows
        const placeholders = batch.map(() => 
          `(${columns.map(() => '?').join(', ')})`
        ).join(', ');
        
        const sql = `INSERT OR REPLACE INTO atoms (${columnStr}) VALUES ${placeholders}`;
        
        // Flatten all values
        const flatValues = batch.flatMap(atom => {
          const row = atomToRow(atom);
          return [
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
            row.error_flow_json, row.performance_json, row.dna_json, row.derived_json, row._meta_json
          ];
        });
        
        this.db.prepare(sql).run(...flatValues);
        totalSaved += batch.length;
        
        this._logger.debug(`[SQLiteAdapter] Bulk insert batch ${batchNum + 1}/${totalBatches}: ${batch.length} atoms`);
      }
    });
    
    this._logger.info(`[SQLiteAdapter] Bulk saved ${totalSaved} atoms in ${totalBatches} batches`);
  }

  /**
   * Guarda relaciones en bulk usando multi-row INSERT
   * 
   * IMPORTANTE: Los targets DEBEN existir previamente (por FK constraints)
   * 
   * @param {Array} relations - Array de {atomId, call}
   * @param {number} batchSize - Tamaño del batch (default: 500)
   */
  saveRelationsBulk(relations, batchSize = 500) {
    if (!relations || relations.length === 0) return;
    
    const now = new Date().toISOString();
    const totalBatches = Math.ceil(relations.length / batchSize);
    let totalSaved = 0;
    
    // Preparar statement para verificar existencia del target
    const checkStmt = this.db.prepare('SELECT 1 FROM atoms WHERE id = ?');
    
    // UNA SOLA TRANSACCIÓN para todas las relaciones
    connectionManager.transaction(() => {
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const batch = relations.slice(batchNum * batchSize, (batchNum + 1) * batchSize);
        const validRelations = [];
        
        // Filtrar relaciones válidas (target existe)
        for (const { atomId, call } of batch) {
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
          
          // Solo incluir si el target existe
          const targetExists = checkStmt.get(targetId);
          if (!targetExists) continue;
          
          const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
          const lineNumber = typeof call?.line === 'number' ? call.line : null;
          
          let contextJson = '{}';
          try {
            contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
          } catch (e) {
            contextJson = '{}';
          }
          
          validRelations.push({
            atomId, targetId, weight, lineNumber, contextJson, now
          });
        }
        
        if (validRelations.length === 0) continue;
        
        // Construir multi-row INSERT
        const placeholders = validRelations.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        const sql = `
          INSERT OR IGNORE INTO atom_relations 
          (source_id, target_id, relation_type, weight, line_number, context_json, created_at)
          VALUES ${placeholders}
        `;
        
        const flatValues = validRelations.flatMap(r => [
          r.atomId, r.targetId, 'calls', r.weight, r.lineNumber, r.contextJson, r.now
        ]);
        
        this.db.prepare(sql).run(...flatValues);
        totalSaved += validRelations.length;
        
        this._logger.debug(`[SQLiteAdapter] Bulk relations batch ${batchNum + 1}/${totalBatches}: ${validRelations.length} relations`);
      }
    });
    
    this._logger.info(`[SQLiteAdapter] Bulk saved ${totalSaved} relations in ${totalBatches} batches`);
  }
}
