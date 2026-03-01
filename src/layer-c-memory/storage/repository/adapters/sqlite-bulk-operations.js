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
    if (!atoms || atoms.length === 0) return atoms;

    const firstAtom = atoms[0];
    const rawFilePath = firstAtom.file_path || firstAtom.file || 'unknown';
    const filePath = this._normalize(rawFilePath);

    // UNA SOLA TRANSACCIÓN para átomos, relaciones y metadatos de archivo
    connectionManager.transaction(() => {
      // Fase 1: Guardar todos los atomos
      this.saveManyBulk(atoms);

      // Fase 2: Guardar todas las relaciones
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

      // Fase 3: Actualizar tabla 'files' para que fix_imports lo vea inmediatamente
      const now = new Date().toISOString();
      const totalLines = atoms.reduce((max, a) => Math.max(max, a.line_end || a.endLine || 0), 0);

      this.db.prepare(`
        INSERT INTO files (path, last_analyzed, total_lines)
        VALUES (?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET 
          last_analyzed = excluded.last_analyzed,
          total_lines = MAX(total_lines, excluded.total_lines)
      `).run(filePath, now, totalLines);
    });

    this._logger.info(`[SQLiteAdapter] Saved ${atoms.length} atoms and updated file metadata for ${filePath}`);

    return atoms;
  }

  /**
   * Guarda múltiples átomos usando multi-row INSERT para máxima performance
   */
  saveManyBulk(atoms, batchSize = 500) {
    if (!atoms || atoms.length === 0) return;

    const now = new Date().toISOString();
    const totalBatches = Math.ceil(atoms.length / batchSize);
    let totalSaved = 0;

    const columns = [
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
      'has_error_handling', 'has_network_calls'
    ];

    const columnStr = columns.join(', ');

    connectionManager.transaction(() => {
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const batch = atoms.slice(batchNum * batchSize, (batchNum + 1) * batchSize);

        const placeholders = batch.map(() =>
          `(${columns.map(() => '?').join(', ')})`
        ).join(', ');

        const sql = `INSERT OR REPLACE INTO atoms (${columnStr}) VALUES ${placeholders}`;

        const flatValues = batch.flatMap(atom => {
          // Asegurar normalización antes de convertir a row
          atom.filePath = this._normalize(atom.file || atom.filePath);
          atom.file = atom.filePath;
          atom.id = `${atom.filePath}::${atom.name}`;

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
            row.in_degree, row.out_degree, row.centrality_score, row.centrality_classification, row.risk_level, row.risk_prediction,
            row.extracted_at, now, row.change_frequency, row.age_days, row.generation,
            row.signature_json, row.data_flow_json, row.calls_json, row.temporal_json,
            row.error_flow_json, row.performance_json, row.dna_json, row.derived_json, row._meta_json,
            row.shared_state_json, row.event_emitters_json, row.event_listeners_json, row.scope_type,
            row.called_by_json, row.function_type,
            row.has_error_handling, row.has_network_calls
          ];
        });

        this.db.prepare(sql).run(...flatValues);
        totalSaved += batch.length;
      }
    });

    this._logger.info(`[SQLiteAdapter] Bulk saved ${totalSaved} atoms in ${totalBatches} batches`);
  }

  saveRelationsBulk(relations, batchSize = 500) {
    if (!relations || relations.length === 0) return;

    const now = new Date().toISOString();
    const totalBatches = Math.ceil(relations.length / batchSize);
    let totalSaved = 0;

    const checkStmt = this.db.prepare('SELECT 1 FROM atoms WHERE id = ?');

    connectionManager.transaction(() => {
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const batch = relations.slice(batchNum * batchSize, (batchNum + 1) * batchSize);
        const validRelations = [];

        for (const { atomId, call } of batch) {
          const normalizedSourceId = this._normalizeId(atomId);

          let calleeName;
          if (typeof call === 'string') {
            calleeName = call;
          } else if (call && typeof call === 'object') {
            calleeName = call.callee || call.name || call.id || 'unknown';
          } else {
            calleeName = 'unknown';
          }

          // Si el calleeName parece un ID completo, lo normalizamos como ID
          // Si no, asumimos que es un nombre en el mismo archivo
          let targetId;
          if (calleeName.includes('::')) {
            targetId = this._normalizeId(calleeName);
          } else {
            const filePath = normalizedSourceId.split('::')[0];
            targetId = `${filePath}::${calleeName}`;
          }

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
            atomId: normalizedSourceId, targetId, weight, lineNumber, contextJson, now
          });
        }

        if (validRelations.length === 0) continue;

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
      }
    });

    this._logger.info(`[SQLiteAdapter] Bulk saved ${totalSaved} relations in ${totalBatches} batches`);
  }
}
