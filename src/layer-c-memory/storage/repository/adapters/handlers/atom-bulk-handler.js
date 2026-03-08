/**
 * @fileoverview atom-bulk-handler.js
 * 
 * Maneja la inserción masiva de átomos en la base de datos.
 * 
 * @module storage/repository/adapters/handlers/atom-bulk-handler
 */

import { atomToRow } from '../helpers/converters.js';
import { buildAtomInsertSql, buildAtomInsertValues } from '../helpers/atom-schema.js';

export class AtomBulkHandler {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Inserta un lote de átomos
     * @param {Array} atoms - Átomos a insertar
     * @param {string} now - Timestamp actual
     * @param {Function} normalizeFn - Función para normalizar paths
     */
    handle(atoms, now, normalizeFn) {
        if (!atoms || atoms.length === 0) return 0;

        this._cleanupLegacyAtomIds(atoms, normalizeFn);

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
