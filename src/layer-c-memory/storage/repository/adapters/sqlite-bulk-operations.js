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

// Handlers especializados
import { AtomBulkHandler } from './handlers/atom-bulk-handler.js';
import { RelationBulkHandler } from './handlers/relation-bulk-handler.js';
import { EventBulkHandler } from './handlers/event-bulk-handler.js';

/**
 * Clase para operaciones bulk
 * Extiende Relations con operaciones de alto volumen
 * 
 * Orquestador que delega en handlers especializados para reducir complejidad
 * manteniendo una transacción atómica única para performance.
 */
export class SQLiteBulkOperations extends SQLiteRelationOperations {
  constructor(db, logger) {
    super();
    if (db) this.db = db;
    if (logger) this._logger = logger;

    // Inicializar handlers (pueden ser re-inicializados en initialize() si db cambia)
    this._initHandlers();
  }

  _initHandlers() {
    this.atomHandler = new AtomBulkHandler(this.db, this._logger);
    this.relationHandler = new RelationBulkHandler(this.db, this._logger);
    this.eventHandler = new EventBulkHandler(this.db, this._logger);
  }

  initialize(projectPath) {
    super.initialize(projectPath);
    this._initHandlers();
  }

  /**
   * Guarda múltiples átomos + relaciones en una sola transacción
   * 
   * @param {Array} atoms - Array de átomos a guardar
   * @param {string} fileHash - Hash del archivo para control de cambios
   * @returns {Array} - Átomos guardados
   */
  saveMany(atoms, fileHash = null) {
    if (!atoms || atoms.length === 0) return atoms;

    const firstAtom = atoms[0];
    const rawFilePath = firstAtom.file_path || firstAtom.file || firstAtom.filePath || 'unknown';
    const filePath = this._normalize(rawFilePath);
    const now = new Date().toISOString();

    // Pre-check IDs existentes para detección de eventos (fuera de la transacción de escritura)
    const existingIds = new Set(
      this.db.prepare(
        `SELECT id FROM atoms WHERE file_path = ?`
      ).all(filePath).map(r => r.id)
    );

    // UNA SOLA TRANSACCIÓN para átomos, relaciones y metadatos de archivo
    connectionManager.transaction(() => {
      // Fase 1: Guardar todos los atomos
      this.atomHandler.handle(atoms, now, (p) => this._normalize(p));

      // Fase 2: Collect y Guardar todas las relaciones
      const relationsToSave = [];
      for (const atom of atoms) {
        if (atom.calls?.length > 0) {
          for (const call of atom.calls) {
            relationsToSave.push({ atomId: atom.id, call });
          }
        }
      }

      if (relationsToSave.length > 0) {
        this.relationHandler.handle(relationsToSave, now, (id) => this._normalizeId(id));
      }

      // Fase 3: Actualizar metadatos del archivo
      this._updateFileMetadata(filePath, atoms, fileHash, now);
    });

    // Fase 4: Registrar eventos y versiones (usando otra transacción interna del handler)
    this.eventHandler.handle(atoms, existingIds, now, Date.now(), (p) => this._normalize(p));

    this._logger.debug(`[BulkOrchestrator] Processed ${atoms.length} atoms for ${filePath}`);
    return atoms;
  }

  /**
   * @private - Actualiza tabla 'files'
   */
  _updateFileMetadata(filePath, atoms, fileHash, now) {
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
  }

  // Métodos antiguos mantenidos por compatibilidad pero delegando a handlers
  saveManyBulk(atoms) {
    return connectionManager.transaction(() =>
      this.atomHandler.handle(atoms, new Date().toISOString(), (p) => this._normalize(p))
    );
  }

  saveRelationsBulk(relations) {
    return connectionManager.transaction(() =>
      this.relationHandler.handle(relations, new Date().toISOString(), (id) => this._normalizeId(id))
    );
  }
}
