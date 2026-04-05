/**
 * @fileoverview atom-bulk-handler.js
 *
 * Maneja la inserción masiva de átomos en la base de datos.
 *
 * @module storage/repository/adapters/handlers/atom-bulk-handler
 */

import { atomToRow } from '../helpers/converters.js';
import { buildAtomInsertSql, buildAtomInsertValues } from '../helpers/atom-schema.js';

// Phase 2 enriched fields that must be preserved when Phase 1 overwrites
const PHASE2_COLUMNS = [
  'dna_json', 'data_flow_json', 'error_flow_json', 'performance_json',
  'temporal_json', 'shared_state_json', 'event_emitters_json',
  'event_listeners_json', 'derived_json'
];

/**
 * Carga campos Phase 2 existentes por file_path para preservarlos.
 * Evita que Phase 1 overwrittee el enriquecimiento de Phase 2 con nulls.
 */
function loadExistingPhase2ByFile(db, filePaths) {
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
function mergePhase2IntoAtom(atom, existingPhase2ByFile) {
  const filePath = atom.filePath || atom.file_path;
  const fileData = existingPhase2ByFile.get(filePath);
  if (!fileData) return;

  const existing = fileData.get(atom.id);
  if (!existing) return;

  for (const col of PHASE2_COLUMNS) {
    const existingValue = existing[col];
    if (!existingValue || existingValue === 'null' || existingValue === null) continue;

    // Mapear columna JSON → propiedad del átomo (camelCase sin _json)
    const atomProp = col.replace('_json', '').replace(/_([a-z])/g, g => g[1].toUpperCase());
    const currentValue = atom[atomProp];

    // Solo sobrescribe si el existente tiene datos y el nuevo NO
    if (!currentValue || currentValue === 'null' || currentValue === null) {
      try {
        atom[atomProp] = JSON.parse(existingValue);
      } catch {
        // Ignorar JSON inválido
      }
    }
  }
}

export class AtomBulkHandler {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Inserta un lote de átomos preservando campos Phase 2 existentes.
     * @param {Array} atoms - Átomos a insertar
     * @param {string} now - Timestamp actual
     * @param {Function} normalizeFn - Función para normalizar paths
     */
    handle(atoms, now, normalizeFn) {
        if (!atoms || atoms.length === 0) return 0;

        this._cleanupLegacyAtomIds(atoms, normalizeFn);

        // PRE-PRESERVACIÓN Phase 2: cargar datos existentes antes de overwrittear
        const filePaths = new Set(atoms.map(a => normalizeFn(a.file || a.filePath || 'unknown')));
        const existingPhase2ByFile = loadExistingPhase2ByFile(this.db, filePaths);

        const stmt = this.db.prepare(buildAtomInsertSql());
        let totalSaved = 0;

        for (const atom of atoms) {
            // Normalizar path
            atom.filePath = normalizeFn(atom.file || atom.filePath);
            atom.file = atom.filePath;

            // Asegurar ID
            if (!atom.id || !atom.id.includes('::')) {
                atom.id = `${atom.filePath}::${atom.name}`;
            }

            // PRESERVAR Phase 2: fusionar campos enriquecidos existentes
            mergePhase2IntoAtom(atom, existingPhase2ByFile);

            const row = atomToRow(atom);
            const values = buildAtomInsertValues(row, now);

            stmt.run(...values);
            totalSaved++;
        }

        return totalSaved;
    }

    _cleanupLegacyAtomIds(atoms, normalizeFn) {
        const filePaths = new Set();
        for (const atom of atoms) {
            const normalizedPath = normalizeFn(atom.file || atom.filePath);
            if (normalizedPath) {
                filePaths.add(normalizedPath);
            }
        }

        const deleteStmt = this.db.prepare(`
            DELETE FROM atoms
            WHERE file_path = ?
              AND id NOT LIKE ?
        `);

        for (const filePath of filePaths) {
            deleteStmt.run(filePath, `${filePath}::%`);
        }
    }
}
