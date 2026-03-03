/**
 * @fileoverview SocietyEngine.js
 * 
 * Motor de generación de sociedades basado en Álgebra Semántica y Física del Software.
 * 
 * @module layer-b-semantic/society-manager/SocietyEngine
 */

import { getRepository } from '../../layer-c-memory/storage/repository/index.js';
import { buildFileClusters, buildPurposeClusters } from '../../layer-graph/builders/cluster-builder.js';
import { analyzeNeighborhood } from '../inference-engine/detectors/neighborhood.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Semantic:SocietyEngine');

export class SocietyEngine {
    constructor(rootPath, options = {}) {
        this.rootPath = rootPath;
        this.options = options;
        this.repo = getRepository(rootPath);
    }

    async buildSocieties() {
        logger.info('[SocietyEngine] Building societies...');

        // 1. Cargar datos base (Átomos)
        const atomsList = await this.repo.getAll({ limit: 0 });
        const atomsMap = new Map(atomsList.map(a => [a.id, a]));

        // 2. Generar Clusters Funcionales (basados en propósito/arquetipo)
        const functionalClusters = buildPurposeClusters(atomsMap);

        // 3. Generar Clusters Estructurales (basados en archivos/módulos)
        const structuralClusters = buildFileClusters(atomsMap);

        const societies = [];

        // Transformar clusters en Sociedades (Pueblos)
        for (const cluster of functionalClusters) {
            societies.push(this._createSocietyFromCluster(cluster, 'functional', atomsMap));
        }

        for (const cluster of structuralClusters) {
            societies.push(this._createSocietyFromCluster(cluster, 'structural', atomsMap));
        }

        // 4. Identificar Sociedades Culturales (vía vecindarios y jerarquías)
        // TODO: Implementar análisis de vecindarios entre clusters

        logger.info(`[SocietyEngine] Generated ${societies.length} societies`);
        return societies;
    }

    _createSocietyFromCluster(cluster, type, atomsMap) {
        const dominantPurpose = cluster.metadata?.dominantPurpose || cluster.metadata?.purpose || 'UNKNOWN';
        const name = cluster.metadata?.name || `${type}:${dominantPurpose}`;

        // Cálculo de entropía simple: (1 - cohesión)
        const cohesion = cluster.cohesion || 0;
        const entropy = Math.max(0, 1 - cohesion);

        return {
            id: cluster.id,
            name,
            type,
            cohesionScore: cohesion,
            entropyScore: entropy,
            moleculeCount: cluster.metadata?.fileCount || (cluster.file ? 1 : 0),
            metadata: {
                ...cluster.metadata,
                atomCount: cluster.atoms.length,
                archetype: cluster.metadata?.archetype
            },
            updatedAt: new Date().toISOString()
        };
    }
}
