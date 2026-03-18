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
        logger.debug(`[SocietyPersistor] Saving ${societies.length} societies...`);

        const db = this.repo.db;

        // Usar transacción para velocidad e integridad
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
                    s.cohesionScore,
                    s.entropyScore,
                    s.moleculeCount,
                    JSON.stringify(s.metadata || {}),
                    s.createdAt || now,
                    now
                );
            }
        });

        try {
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
        const rows = this.repo.db.prepare('SELECT * FROM societies ORDER BY cohesion_score DESC').all();
        return rows.map(r => ({
            ...r,
            metadata: JSON.parse(r.metadata_json)
        }));
    }
}
