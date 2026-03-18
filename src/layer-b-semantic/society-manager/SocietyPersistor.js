/**
 * @fileoverview SocietyPersistor.js
 * 
 * Persistencia de Sociedades en el repositorio SQLite.
 * 
 * @module layer-b-semantic/society-manager/SocietyPersistor
 */

import { getRepository } from '../../layer-c-memory/storage/repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Semantic:SocietyPersistor');

export class SocietyPersistor {
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.repo = getRepository(rootPath);
    }

    /**
     * Guarda una lista de sociedades en la base de datos
     * @param {Array} societies - Lista de sociedades
     */
    async saveSocieties(societies) {
        if (!Array.isArray(societies) || societies.length === 0) {
            logger.debug('[SocietyPersistor] No societies to save');
            return;
        }

        logger.debug(`[SocietyPersistor] Saving ${societies.length} societies...`);

        try {
            const db = this.repo.db;
            const insert = db.prepare(`
                INSERT OR REPLACE INTO societies (
                    id, name, type, cohesion_score, entropy_score, 
                    molecule_count, metadata_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const now = new Date().toISOString();

            const transaction = db.transaction((list) => {
                for (const s of list) {
                    insert.run(
                        s.id,
                        s.name,
                        s.type,
                        s.cohesionScore || 0,
                        s.entropyScore || 0,
                        s.moleculeCount || 0,
                        JSON.stringify(s.metadata || {}),
                        s.createdAt || now,
                        now
                    );
                }
            });

            transaction(societies);
            logger.debug('[SocietyPersistor] Societies persisted successfully');
        } catch (error) {
            logger.error(`[SocietyPersistor] Error persisting societies: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obtiene todas las sociedades guardadas
     */
    async getSocieties() {
        try {
            const rows = this.repo.db.prepare('SELECT * FROM societies ORDER BY cohesion_score DESC').all();
            return (rows || []).map(r => {
                try {
                    return {
                        ...r,
                        metadata: JSON.parse(r.metadata_json || '{}')
                    };
                } catch (parseErr) {
                    logger.warn(`[SocietyPersistor] Error parsing metadata for society ${r.id}: ${parseErr.message}`);
                    return { ...r, metadata: {} };
                }
            });
        } catch (error) {
            logger.error(`[SocietyPersistor] Error retrieving societies: ${error.message}`);
            return [];
        }
    }
}
