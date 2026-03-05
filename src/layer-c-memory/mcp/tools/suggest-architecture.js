/**
 * MCP Tool: suggest_architecture
 * Refactorización y diseño de software orientado a dominios (DDD).
 * Recomienda reagrupamientos de módulos basándose en las Sociedades descubiertas.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../../utils/logger.js';
import path from 'path';

const logger = createLogger('OmnySys:suggest:architecture');

export async function suggest_architecture(args, context) {
    const { limit = 10, confidenceThreshold = 0.5 } = args;
    const { projectPath } = context;

    logger.info(`[Tool] suggest_architecture (limit: ${limit})`);

    try {
        const repo = getRepository(projectPath);
        if (!repo?.db) return { error: 'Database not available' };

        // Solo nos importan los clusters funcionales que OmnySys ya detectó que hacen lo mismo
        // pero que nosotros verificaremos si están esparcidos estructuralmente.
        const functionalSocieties = repo.db.prepare(`
      SELECT * FROM societies 
      WHERE type = 'functional'
      ORDER BY cohesion_score DESC
    `).all();

        const suggestions = [];

        for (const society of functionalSocieties) {
            const metadata = JSON.parse(society.metadata_json || '{}');
            const files = metadata.files || [];

            // Si el propósito está compartido en pocos archivos o demasiados
            if (files.length < 2 || files.length > 50) continue;

            // Calcular la dispersión de carpetas
            const folderPaths = new Set();
            for (const fp of files) {
                folderPaths.add(path.dirname(fp));
            }

            // Si todos los archivos ya viven en la misma carpeta, significa que el código
            // funcional ya concuerda perfectamente con la estructura del disco. (Felicidad máxima!).
            if (folderPaths.size <= 1) continue;

            // Si los archivos están en diferentes carpetas, calculamos el nombre principal propuesto
            const dominantPurpose = metadata.purpose || 'feature';

            let severity = 'low';
            if (folderPaths.size >= 4 && files.length >= 8 && society.cohesion_score > 0.8) {
                severity = 'high';
            } else if (folderPaths.size >= 3 || society.cohesion_score > 0.6) {
                severity = 'medium';
            }

            suggestions.push({
                societyId: society.id,
                societyName: society.name,
                targetDomainName: dominantPurpose.toLowerCase(),
                severity,
                cohesionScore: society.cohesion_score,
                metrics: {
                    filesCount: files.length,
                    directoriesSpread: folderPaths.size,
                    entropy: society.entropy_score
                },
                suggestion: `Group these highly cohesive files into a single vertical domain/module folder (e.g., src/modules/${dominantPurpose.toLowerCase()}/).`,
                reason: `These files form a tight functional society but are spread across ${folderPaths.size} different directories. Grouping them improves Domain-Driven Design (DDD).`,
                involvedFiles: files,
                currentDirectories: Array.from(folderPaths)
            });
        }

        // Filtrar por nivel de confianza y limitar
        const prioritized = suggestions
            .filter(s => s.cohesionScore >= confidenceThreshold)
            .sort((a, b) => b.cohesionScore - a.cohesionScore)
            .slice(0, limit);

        return {
            summary: {
                totalSocietiesAnalyzed: functionalSocieties.length,
                totalDomainSuggestions: suggestions.length,
                topActionableModules: prioritized.length
            },
            suggestions: prioritized
        };
    } catch (error) {
        logger.error(`[Tool] suggest_architecture failed: ${error.message}`);
        return { error: error.message };
    }
}

export default { suggest_architecture };
