import { getProjectStats } from '../../../query/apis/project-api.js';
import { summarizePhysicsCoverageRow } from '../../../../shared/compiler/index.js';

/**
 * Maneja la agregación de métricas de salud (health)
 * @param {Object} tool - Instancia de AggregateMetricsTool
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Object>} Resultado de salud
 */
export async function handleHealthMetrics(tool, projectPath) {
    const stats = await getProjectStats(projectPath);

    // Compute real physics vectors from SQLite atoms
    let physics = {
        averageGravity: 0,
        averageReactivity: 0,
        avgFragility: null,
        avgCoupling: null,
        avgCohesion: null,
        avgImportance: null,
        avgCentrality: null,
        totalAtoms: 0
    };

    if (tool.repo?.db) {
        const row = tool.repo.db.prepare(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN fragility_score > 0 THEN 1 ELSE 0 END) as fragility_nonzero,
                   SUM(CASE WHEN coupling_score > 0 THEN 1 ELSE 0 END) as coupling_nonzero,
                   SUM(CASE WHEN cohesion_score > 0 THEN 1 ELSE 0 END) as cohesion_nonzero,
                   SUM(CASE WHEN importance_score > 0 THEN 1 ELSE 0 END) as importance_nonzero,
                   SUM(CASE WHEN centrality_score > 0 THEN 1 ELSE 0 END) as centrality_nonzero,
                   AVG(CASE WHEN fragility_score > 0 THEN fragility_score END) as avg_fragility,
                   AVG(CASE WHEN coupling_score > 0 THEN coupling_score END) as avg_coupling,
                   AVG(CASE WHEN cohesion_score > 0 THEN cohesion_score END) as avg_cohesion,
                   AVG(CASE WHEN importance_score > 0 THEN importance_score END) as avg_importance,
                   AVG(CASE WHEN centrality_score > 0 THEN centrality_score END) as avg_centrality
            FROM atoms
        `).get();

        if (row) {
            const { coverage, missingSignals } = summarizePhysicsCoverageRow(row);
            // Contar relaciones semánticas totales (Sprint 10)
            const semanticRow = tool.repo.db.prepare(`
                SELECT COUNT(*) as total
                FROM atom_relations
                WHERE relation_type IN ('shares_state', 'emits', 'listens')
            `).get();

            physics = {
                totalAtoms: row.total || 0,
                totalSemanticLinks: semanticRow?.total || 0,
                avgFragility: row.avg_fragility != null ? Math.round(row.avg_fragility * 1000) / 1000 : null,
                avgCoupling: row.avg_coupling != null ? Math.round(row.avg_coupling * 1000) / 1000 : null,
                avgCohesion: row.avg_cohesion != null ? Math.round(row.avg_cohesion * 1000) / 1000 : null,
                avgImportance: row.avg_importance != null ? Math.round(row.avg_importance * 1000) / 1000 : null,
                avgCentrality: row.avg_centrality != null ? Math.round(row.avg_centrality * 1000) / 1000 : null,
                averageGravity: row.avg_importance != null && row.avg_centrality != null
                    ? Math.round(row.avg_importance * row.avg_centrality * 1000) / 1000
                    : null,
                averageReactivity: row.avg_fragility != null && row.avg_coupling != null
                    ? Math.round(row.avg_fragility * row.avg_coupling * 1000) / 1000
                    : null,
                semanticBadge: (semanticRow?.total || 0) > 50 ? 'RADIOACTIVE' : 'STABLE',
                coverage,
                missingSignals
            };
        }
    }

    return {
        project: projectPath,
        globalHealth: stats.health,
        quality: stats.quality,
        physics
    };
}
