/**
 * @fileoverview event-bulk-handler.js
 * 
 * Maneja el registro de eventos de átomos y control de versiones.
 * 
 * @module storage/repository/adapters/handlers/event-bulk-handler
 */

import { calculateHash, calculateFieldHashes } from '../helpers/hashing.js';

export class EventBulkHandler {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Registra eventos y versiones para un lote de átomos
     * @param {Array} atoms - Átomos procesados
     * @param {Set} existingIds - IDs que ya existían antes de la operación
     * @param {string} now - Timestamp actual
     * @param {number} msNow - Timestamp en milisegundos
     * @param {Function} normalizeFn - Función para normalizar paths
     */
    handle(atoms, existingIds, now, msNow, normalizeFn) {
        if (!atoms || atoms.length === 0) return;

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

        // El llamador debe manejar la transacción si es necesario juntarlo con otros handlers
        for (const atom of atoms) {
            const filePath = normalizeFn(atom.filePath || atom.file);
            const atomId = atom.id || `${filePath}::${atom.name}`;

            // 1. Atom Events
            const eventType = existingIds.has(atomId) ? 'updated' : 'created';
            eventStmt.run(atomId, eventType, atom.derived?.changeRisk || 0, now, 'bulk_save');

            // 2. Atom Versions
            const fieldHashes = calculateFieldHashes(atom);
            const totalHash = calculateHash(atom);
            versionStmt.run(
                atomId,
                totalHash,
                JSON.stringify(fieldHashes),
                msNow,
                filePath,
                atom.name
            );
        }
    }
}
