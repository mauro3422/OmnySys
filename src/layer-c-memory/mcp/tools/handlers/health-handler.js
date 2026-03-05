import { getProjectStats } from '../../../query/apis/project-api.js';

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
        avgFragility: 0,
        avgCoupling: 0,
        avgCohesion: 0,
        avgImportance: 0,
        totalAtoms: 0
    };

    if (tool.repo?.db) {
        const row = tool.repo.db.prepare(`
            SELECT COUNT(*) as total,
                   AVG(fragility_score) as avg_fragility,
                   AVG(coupling_score) as avg_coupling,
                   AVG(cohesion_score) as avg_cohesion,
                   AVG(importance_score) as avg_importance,
                   AVG(centrality_score) as avg_centrality
            FROM atoms
        `).get();

        if (row) {
            // Contar relaciones semánticas totales (Sprint 10)
            const semanticRow = tool.repo.db.prepare(`
                SELECT COUNT(*) as total
                FROM atom_relations
                WHERE relation_type IN ('shares_state', 'emits', 'listens')
            `).get();

            physics = {
                totalAtoms: row.total || 0,
                totalSemanticLinks: semanticRow?.total || 0,
                avgFragility: Math.round((row.avg_fragility || 0) * 1000) / 1000,
                avgCoupling: Math.round((row.avg_coupling || 0) * 1000) / 1000,
                avgCohesion: Math.round((row.avg_cohesion || 0) * 1000) / 1000,
                avgImportance: Math.round((row.avg_importance || 0) * 1000) / 1000,
                avgCentrality: Math.round((row.avg_centrality || 0) * 1000) / 1000,
                // Gravity ≈ importance × centrality
                averageGravity: Math.round((row.avg_importance || 0) * (row.avg_centrality || 0) * 1000) / 1000,
                // Reactivity ≈ fragility × coupling
                averageReactivity: Math.round((row.avg_fragility || 0) * (row.avg_coupling || 0) * 1000) / 1000,
                semanticBadge: (semanticRow?.total || 0) > 50 ? 'RADIOACTIVE' : 'STABLE'
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
