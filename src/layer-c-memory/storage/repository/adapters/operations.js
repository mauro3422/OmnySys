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
import { atomToRow } from './helpers/converters.js';
import { buildAtomInsertSql, buildAtomInsertValues } from './helpers/atom-schema.js';
import { chunkArray } from '../../../../shared/utils/array-utils.js';

// Phase 2 enriched fields that must be preserved when Phase 1 overwrites
const PHASE2_COLUMNS = [
  'dna_json', 'data_flow_json', 'error_flow_json', 'performance_json',
  'temporal_json', 'shared_state_json', 'event_emitters_json',
  'event_listeners_json', 'derived_json'
];

/**
 * Carga campos Phase 2 existentes por file_path para preservarlos en bulk saves.
 */
function loadExistingPhase2Bulk(db, filePaths) {
  const phase2Cols = PHASE2_COLUMNS.join(', ');
  const stmt = db.prepare(`SELECT id, file_path, ${phase2Cols} FROM atoms WHERE file_path = ?`);
  const byFile = new Map();

  for (const filePath of filePaths) {
    const rows = stmt.all(filePath);
    if (rows.length > 0) {
      const byId = new Map();
      for (const row of rows) {
        byId.set(row.id, row);
      }
      byFile.set(filePath, byId);
    }
  }

  return byFile;
}

/**
 * Fusiona campos Phase 2 existentes en un átomo si el nuevo no los tiene.
 */
function mergePhase2IntoAtomBulk(atom, existingPhase2ByFile) {
  const filePath = atom.filePath || atom.file_path;
  const fileData = existingPhase2ByFile.get(filePath);
  if (!fileData) return;

  const existing = fileData.get(atom.id);
  if (!existing) return;

  for (const col of PHASE2_COLUMNS) {
    const existingValue = existing[col];
    if (!existingValue || existingValue === 'null' || existingValue === null) continue;

    const atomProp = col.replace('_json', '').replace(/_([a-z])/g, g => g[1].toUpperCase());
    const currentValue = atom[atomProp];

    if (!currentValue || currentValue === 'null' || currentValue === null) {
      try {
        atom[atomProp] = JSON.parse(existingValue);
      } catch {
        // Ignorar JSON inválido
      }
    }
  }
}

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
  _saveAtomsBatch(atoms, fileHash, trackSingleFileHash, externalNormalizeFn = null) {
    if (!atoms || atoms.length === 0) return atoms;

    const now = new Date().toISOString();
    const normalizePath = externalNormalizeFn || ((value) => this._normalize(value));
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

    // PRESERVAR Phase 2: cargar datos existentes ANTES de overwrittear
    const normalizePath = (value) => this._normalize(value);
    const groupedByFilePre = groupAtomsByFilePath(atoms, normalizePath);
    const existingPhase2ByFile = loadExistingPhase2Bulk(this.db, groupedByFilePre.keys());

    // Single transaction for all batches — eliminates per-batch transaction overhead
    // Skip cleanup since INSERT OR REPLACE already handles updates
    const savedAtoms = [];
    const now = new Date().toISOString();
    const insertStmt = this.db.prepare(buildAtomInsertSql());
    const relationInsertStmt = this.db.prepare(
      `INSERT OR IGNORE INTO atom_relations (source_id, target_id, relation_type, weight, line_number, created_at)
       VALUES (?, ?, 'calls', 1.0, ?, ?)`
    );
    const msNow = Date.now();

    // Track max line per file for efficient metadata update
    const fileMaxLines = new Map();

    connectionManager.transaction(() => {
      for (const batch of chunkArray(atoms, size)) {
        const groupedByFile = groupAtomsByFilePath(batch, normalizePath);
        const existingIds = collectExistingIdsForFiles(this.db, groupedByFile.keys());

        for (const atom of batch) {
          // Normalize path
          atom.filePath = normalizePath(atom.file || atom.filePath);
          atom.file = atom.filePath;

          // Ensure ID
          if (!atom.id || !atom.id.includes('::')) {
            atom.id = `${atom.filePath}::${atom.name}`;
          }

          // PRESERVAR Phase 2: fusionar campos enriquecidos existentes
          mergePhase2IntoAtomBulk(atom, existingPhase2ByFile);

          const row = atomToRow(atom);
          const values = buildAtomInsertValues(row, now);
          insertStmt.run(...values);

          // Insert relations inline (skip handler overhead)
          if (atom.calls?.length > 0) {
            for (const call of atom.calls) {
              const targetId = normalizeCanonicalAtomId(call.id || call.name, this.projectPath);
              relationInsertStmt.run(atom.id, targetId, call.line || null, now);
            }
          }

          // Track max lines per file (deferred metadata update)
          const endLine = atom.line_end || atom.endLine || atom.line || 0;
          const current = fileMaxLines.get(atom.filePath) || 0;
          if (endLine > current) {
            fileMaxLines.set(atom.filePath, endLine);
          }
        }

        this.eventHandler.handle(batch, existingIds, now, msNow, normalizePath);
        savedAtoms.push(...batch);
      }

      // Bulk update file metadata once per file (not per atom)
      const upsertFileMeta = this.db.prepare(`
        INSERT INTO files (path, last_analyzed, total_lines) VALUES (?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          last_analyzed = excluded.last_analyzed,
          total_lines = MAX(COALESCE(files.total_lines, 0), excluded.total_lines),
          is_removed = 0,
          updated_at = datetime('now')
      `);
      for (const [filePath, maxLines] of fileMaxLines.entries()) {
        upsertFileMeta.run(filePath, now, maxLines);
      }
    });

    this._logger.debug(`[BulkOrchestrator] Processed ${atoms.length} atoms (single-tx)`);
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
