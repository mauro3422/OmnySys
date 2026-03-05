/**
 * @fileoverview relation-bulk-handler.js
 * 
 * Maneja la inserción masiva de relaciones entre átomos.
 * 
 * @module storage/repository/adapters/handlers/relation-bulk-handler
 */

export class RelationBulkHandler {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Inserta relaciones en lotes
     * @param {Array} relationsToSave - Array de { atomId, call }
     * @param {string} now - Timestamp actual
     * @param {Function} normalizeIdFn - Función para normalizar IDs
     */
    handle(relationsToSave, now, normalizeIdFn) {
        if (!relationsToSave || relationsToSave.length === 0) return 0;

        const batchSize = 500;
        const totalBatches = Math.ceil(relationsToSave.length / batchSize);
        let totalSaved = 0;

        for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
            const batch = relationsToSave.slice(batchNum * batchSize, (batchNum + 1) * batchSize);
            const validRelations = [];

            for (const { atomId, call } of batch) {
                const normalizedSourceId = normalizeIdFn(atomId);

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
                    targetId = normalizeIdFn(calleeName);
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

        return totalSaved;
    }
}
