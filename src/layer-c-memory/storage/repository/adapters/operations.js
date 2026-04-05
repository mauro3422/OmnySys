/**
 * @fileoverview sqlite-bulk-operations.js
 *
 * Operaciones bulk para SQLite Adapter.
 * CRITICAL: Mantiene UNA SOLA TRANSACCION para todas las operaciones bulk
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
import { resolveCallTargetId } from './helpers/call-target-resolver.js';
import { normalizeCanonicalAtomId } from './helpers/canonical-atom-id.js';
import { chunkArray } from '../../../../shared/utils/array-utils.js';

function getAtomFilePath(atom) {
  return atom.file_path || atom.file || atom.filePath || 'unknown';
}

function groupAtomsByFilePath(atoms, normalizePath) {
  const groupedByFile = new Map();

  for (const atom of atoms) {
    const filePath = normalizePath(getAtomFilePath(atom));
    if (!groupedByFile.has(filePath)) {
      groupedByFile.set(filePath, []);
    }
    groupedByFile.get(filePath).push(atom);
  }

  return groupedByFile;
}

function collectExistingIdsForFile(db, filePath) {
  return new Set(
    db.prepare('SELECT id FROM atoms WHERE file_path = ?')
      .all(filePath)
      .map((row) => row.id)
  );
}

function collectExistingIdsForFiles(db, filePaths) {
  const existingIds = new Set();
  const selectExistingStmt = db.prepare('SELECT id FROM atoms WHERE file_path = ?');

  for (const filePath of filePaths) {
    const rows = selectExistingStmt.all(filePath);
    for (const row of rows) {
      existingIds.add(row.id);
    }
  }

  return existingIds;
}

function collectRelationsToSave(atoms) {
  const relationsToSave = [];

  for (const atom of atoms) {
    if (atom.calls?.length > 0) {
      for (const call of atom.calls) {
        relationsToSave.push({ atomId: atom.id, call });
      }
    }
  }

  return relationsToSave;
}

function persistFileMetadata(db, filePath, atoms, fileHash, now) {
  const totalLines = atoms.reduce((max, atom) => Math.max(max, atom.line_end || atom.endLine || 0), 0);

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
  db.prepare(sql).run(...params);
}

/**
 * Clase para operaciones bulk
 * Extiende Relations con operaciones de alto volumen
 *
 * Orquestador que delega en handlers especializados para reducir complejidad
 * manteniendo una transaccion atomica unica para performance.
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
    this.eventHandler = new EventBulkHandler(this.db, this._logger, this.projectPath);
  }

  initialize(projectPath) {
    super.initialize(projectPath);
    this._initHandlers();
  }

  /**
   * Guarda multiples atomos + relaciones en una sola transaccion
   *
   * @param {Array} atoms - Array de atomos a guardar
   * @param {string} fileHash - Hash del archivo para control de cambios
   * @returns {Array} - Atomos guardados
   */
  saveMany(atoms, fileHash = null) {
    return this._saveAtomsBatch(atoms, fileHash, true);
  }

  /**
   * @private - Actualiza tabla 'files'
   */
  _saveAtomsBatch(atoms, fileHash, trackSingleFileHash) {
    if (!atoms || atoms.length === 0) return atoms;

    const now = new Date().toISOString();
    const normalizePath = (value) => this._normalize(value);
    const groupedByFile = groupAtomsByFilePath(atoms, normalizePath);
    const firstFilePath = normalizePath(getAtomFilePath(atoms[0]));
    const existingIds = trackSingleFileHash
      ? collectExistingIdsForFile(this.db, firstFilePath)
      : collectExistingIdsForFiles(this.db, groupedByFile.keys());

    connectionManager.transaction(() => {
      this.atomHandler.handle(atoms, now, normalizePath);

      const relationsToSave = collectRelationsToSave(atoms);
      if (relationsToSave.length > 0) {
        this._saveRelationRows(relationsToSave, now);
      }

      this.eventHandler.handle(atoms, existingIds, now, Date.now(), normalizePath);

      if (trackSingleFileHash) {
        persistFileMetadata(this.db, firstFilePath, atoms, fileHash, now);
      } else {
        for (const [filePath, fileAtoms] of groupedByFile.entries()) {
          persistFileMetadata(this.db, filePath, fileAtoms, null, now);
        }
      }
    });

    this._logger.debug(`[BulkOrchestrator] Processed ${atoms.length} atoms`);
    return atoms;
  }

  // Metodos antiguos mantenidos por compatibilidad pero delegando a handlers
  saveManyBulk(atoms, batchSize = 500) {
    if (!Array.isArray(atoms) || atoms.length === 0) {
      return atoms;
    }

    const size = Math.max(1, Number(batchSize) || 500);
    if (atoms.length <= size) {
      return this._saveAtomsBatch(atoms, null, false);
    }

    const savedAtoms = [];
    for (const batch of chunkArray(atoms, size)) {
      const batchResult = this._saveAtomsBatch(batch, null, false);
      if (Array.isArray(batchResult) && batchResult.length > 0) {
        savedAtoms.push(...batchResult);
      }
    }

    return savedAtoms;
  }

  saveRelationsBulk(relations, batchSize = 500) {
    if (!Array.isArray(relations) || relations.length === 0) {
      return relations;
    }

    const size = Math.max(1, Number(batchSize) || 500);
    if (relations.length <= size) {
      return connectionManager.transaction(() => this._saveRelationRows(relations, new Date().toISOString()));
    }

    const results = [];
    for (const batch of chunkArray(relations, size)) {
      results.push(
        connectionManager.transaction(() => this._saveRelationRows(batch, new Date().toISOString()))
      );
    }

    return results;
  }

  _saveRelationRows(relations, now) {
    return this.relationHandler.handle(
      relations,
      now,
      (id) => normalizeCanonicalAtomId(id, this.projectPath),
      (sourceId, call, cache) => resolveCallTargetId(
        this.db,
        sourceId,
        call,
        (id) => normalizeCanonicalAtomId(id, this.projectPath),
        cache
      )
    );
  }
}
