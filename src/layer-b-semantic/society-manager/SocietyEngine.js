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

        // Load ALL atoms — NOTE: limit:0 means LIMIT 0 in SQLite = 0 rows, so pass {} for no limit
        const atomsList = await this.repo.getAll({});
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

        // Obtener átomos del mapa para calcular promedios
        const clusterAtoms = cluster.atoms.map(id => atomsMap.get(id)).filter(Boolean);

        const avgImportance = Number((clusterAtoms.reduce((sum, a) => sum + (a.importanceScore || 0), 0) / (clusterAtoms.length || 1)).toFixed(3));
        const avgCentrality = Number((clusterAtoms.reduce((sum, a) => sum + (a.centralityScore || 0), 0) / (clusterAtoms.length || 1)).toFixed(3));

        // Cálculo de entropía: (1 - cohesión) * (1 + avgImportance)
        // Sociedades importantes y descoordinadas tienen mayor entropía sistémica
        const cohesion = Number((cluster.cohesion || 0).toFixed(3));
        const entropy = Number((Math.max(0, (1 - cohesion) * (1 + avgImportance))).toFixed(3));

        return {
            id: cluster.id,
            name,
            type,
            cohesionScore: cohesion,
            entropyScore: entropy,
            moleculeCount: cluster.metadata?.fileCount || (cluster.file ? 1 : 0),
            metadata: {
                ...cluster.metadata,
                atomCount: clusterAtoms.length,
                avgImportance,
                avgCentrality,
                archetype: cluster.metadata?.archetype
            },
            updatedAt: new Date().toISOString()
        };
    }
}
