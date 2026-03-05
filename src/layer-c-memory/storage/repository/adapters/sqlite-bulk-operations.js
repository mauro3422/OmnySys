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
import { calculateHash, calculateFieldHashes } from './helpers/hashing.js';

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
  saveMany(atoms, fileHash = null) {
    if (!atoms || atoms.length === 0) return atoms;

    const firstAtom = atoms[0];
    const rawFilePath = firstAtom.file_path || firstAtom.file || firstAtom.filePath || 'unknown';
    const filePath = this._normalize(rawFilePath);

    // Pre-check which atoms already exist (1 query for the whole file) for event type detection
    const existingIds = new Set(
      this.db.prepare(
        `SELECT id FROM atoms WHERE file_path = ?`
      ).all(filePath).map(r => r.id)
    );

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

      const sql = fileHash
        ? `INSERT INTO files (path, last_analyzed, total_lines, hash) VALUES (?, ?, ?, ?)
           ON CONFLICT(path) DO UPDATE SET 
             last_analyzed = excluded.last_analyzed,
             total_lines = MAX(total_lines, excluded.total_lines),
             hash = excluded.hash`
        : `INSERT INTO files (path, last_analyzed, total_lines) VALUES (?, ?, ?)
           ON CONFLICT(path) DO UPDATE SET 
             last_analyzed = excluded.last_analyzed,
             total_lines = MAX(total_lines, excluded.total_lines)`;

      const params = fileHash ? [filePath, now, totalLines, fileHash] : [filePath, now, totalLines];
      this.db.prepare(sql).run(...params);
    });

    // Fase 4: Registrar atom_events y atom_versions — fuera de la transacción crítica
    // delegándolo a un submétodo más limpio que reduce la complejidad.
    this._logAtomEventsAndVersions(atoms, existingIds);

    this._logger.debug(`[SQLiteAdapter] Saved ${atoms.length} atoms and updated file metadata for ${filePath} (Hash: ${fileHash || 'N/A'})`);

    return atoms;
  }

  /**
   * Registra eventos de átomos y control de versiones
   * @private
   */
  _logAtomEventsAndVersions(atoms, existingIds) {
    try {
      const now = new Date().toISOString();
      const msNow = Date.now();

      const eventStmt = this.db.prepare(`
        INSERT OR IGNORE INTO atom_events (atom_id, event_type, impact_score, timestamp, source)
        VALUES (?, ?, ?, ?, ?)
      `);

      const versionStmt = this.db.prepare(`
        INSERT INTO atom_versions (atom_id, hash, field_hashes_json, last_modified, file_path, atom_name)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(atom_id) DO UPDATE SET
          hash = excluded.hash,
          field_hashes_json = excluded.field_hashes_json,
          last_modified = excluded.last_modified
      `);

      const logPostTransaction = this.db.transaction((atomList) => {
        for (const atom of atomList) {
          const atomId = atom.id || `${this._normalize(atom.filePath || atom.file)}::${atom.name}`;

          // 4.1 Atom Events
          const eventType = existingIds.has(atomId) ? 'updated' : 'created';
          eventStmt.run(atomId, eventType, atom.derived?.changeRisk || 0, now, 'bulk_save');

          // 4.2 Atom Versions
          const fieldHashes = calculateFieldHashes(atom);
          const totalHash = calculateHash(atom);
          versionStmt.run(
            atomId,
            totalHash,
            JSON.stringify(fieldHashes),
            msNow,
            this._normalize(atom.filePath || atom.file),
            atom.name
          );
        }
      });
      logPostTransaction(atoms);
    } catch (postErr) {
      console.error("FATAL ERROR IN POST TRANSACTION:", postErr);
      this._logger.error(`[SQLiteAdapter] Post-transaction logging skipped: ${postErr.message}`);
    }
  }

  /**
   * Guarda múltiples átomos usando multi-row INSERT para máxima performance
   */
  saveManyBulk(atoms, batchSize = 500) {
    if (!atoms || atoms.length === 0) return;

    const now = new Date().toISOString();
    const totalBatches = Math.ceil(atoms.length / batchSize);
    let totalSaved = 0;

    const columns = this._getAtomColumns();

    const columnStr = columns.join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO atoms (${columnStr}) VALUES (${placeholders})`;
    const stmt = this.db.prepare(sql);

    connectionManager.transaction(() => {
      for (const atom of atoms) {
        // Asegurar normalización antes de convertir a row
        atom.filePath = this._normalize(atom.file || atom.filePath);
        atom.file = atom.filePath;

        // Mantener el ID consistente (si no tiene lNo, detectTypeAndName ya se encargó del resto)
        if (!atom.id || !atom.id.includes('::')) {
          atom.id = `${atom.filePath}::${atom.name}`;
        }

        const row = atomToRow(atom);
        const values = this._buildAtomInsertValues(row, now);

        stmt.run(...values);
        totalSaved++;
      }
    });

    this._logger.debug(`[SQLiteAdapter] Bulk saved ${totalSaved} atoms using single transaction`);
  }

  saveRelationsBulk(relations, batchSize = 500) {
    if (!relations || relations.length === 0) return;

    const now = new Date().toISOString();
    const totalBatches = Math.ceil(relations.length / batchSize);
    let totalSaved = 0;

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

          let targetId;
          if (calleeName.includes('::')) {
            targetId = this._normalizeId(calleeName);
          } else {
            const filePath = normalizedSourceId.split('::')[0];
            targetId = `${filePath}::${calleeName}`;
          }

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

    this._logger.debug(`[SQLiteAdapter] Bulk saved ${totalSaved} relations in ${totalBatches} batches (without per-row check)`);
  }
}
