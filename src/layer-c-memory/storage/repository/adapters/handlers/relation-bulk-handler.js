/**
 * @fileoverview relation-bulk-handler.js
 * 
 * Maneja la inserción masiva de relaciones entre átomos.
 * 
 * @module storage/repository/adapters/handlers/relation-bulk-handler
 */

import { primeActiveAtomCache } from '../helpers/call-target-resolver.js';

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
     * @param {Function} resolveCallTargetIdFn - Resolver canónico para targets
     */
    handle(relationsToSave, now, normalizeIdFn, resolveCallTargetIdFn = null) {
        if (!relationsToSave || relationsToSave.length === 0) return 0;

        const batchSize = 500;
        const totalBatches = Math.ceil(relationsToSave.length / batchSize);
        let totalSaved = 0;
        const resolverCache = {
            importsBySourcePath: new Map(),
            resolvedTargets: new Map()
        };

        primeActiveAtomCache(this.db, resolverCache);

        for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
            const batch = relationsToSave.slice(batchNum * batchSize, (batchNum + 1) * batchSize);
            const validRelations = [];
            const relationFingerprints = new Set();

            for (const { atomId, call } of batch) {
                const normalizedSourceId = normalizeIdFn(atomId);
                const targetId = resolveCallTargetIdFn
                    ? resolveCallTargetIdFn(normalizedSourceId, call, resolverCache)
                    : null;
                if (!targetId) {
                    continue;
                }

                const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
                const lineNumber = typeof call?.line === 'number' ? call.line : null;

                let contextJson = '{}';
                try {
                    contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
                } catch (e) {
                    contextJson = '{}';
                }

                const relationFingerprint = `${normalizedSourceId}::${targetId}::calls::${lineNumber ?? ''}`;
                if (relationFingerprints.has(relationFingerprint)) {
                    continue;
                }
                relationFingerprints.add(relationFingerprint);

                validRelations.push({
                    atomId: normalizedSourceId,
                    targetId,
                    weight,
                    lineNumber,
                    contextJson,
                    now
                });
            }

            if (validRelations.length === 0) continue;

            const placeholders = validRelations.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const sql = `
        INSERT INTO atom_relations 
        (source_id, target_id, relation_type, weight, line_number, context_json, created_at, is_removed, lifecycle_status, updated_at)
        VALUES ${placeholders}
        ON CONFLICT(source_id, target_id, relation_type, line_number) DO UPDATE SET
          weight = excluded.weight,
          context_json = excluded.context_json,
          is_removed = 0,
          lifecycle_status = 'active',
          updated_at = excluded.created_at
      `;

            const flatValues = validRelations.flatMap(r => [
                r.atomId, r.targetId, 'calls', r.weight, r.lineNumber, r.contextJson, r.now, 0, 'active', r.now
            ]);

            this.db.prepare(sql).run(...flatValues);
            totalSaved += validRelations.length;
        }

        return totalSaved;
    }
}
