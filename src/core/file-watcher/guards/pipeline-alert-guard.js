/**
 * @fileoverview pipeline-alert-guard.js
 * 
 * Guardia de integridad para la pipeline de análisis.
 * Monitorea métricas críticas como el Shadow Volume y fallos en workers.
 * 
 * @module core/file-watcher/guards/pipeline-alert-guard
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:Guard:Pipeline');

export const pipelineAlertGuard = {
    name: 'pipeline-integrity',
    description: 'Monitors analysis pipeline health and metadata coverage',

    /**
     * Ejecuta la validación de integridad sobre el análisis de un archivo.
     * 
     * @param {string} rootPath - Ruta del proyecto.
     * @param {string} filePath - Archivo analizado.
     * @param {Object} watcher - Instancia del watcher.
     * @param {Object} analysis - Resultado del análisis.
     */
    async run(rootPath, filePath, watcher, analysis) {
        const metadata = analysis.metadata || {};
        const shadowVolume = metadata.shadowVolume || 0;

        // Alerta si el Shadow Volume es muy alto (> 30%)
        if (shadowVolume > 30) {
            const alert = {
                type: 'pipeline:shadow_volume_high',
                filePath,
                severity: 'warning',
                message: `High Shadow Volume detected: ${shadowVolume}% of lines are not indexed.`,
                details: {
                    unindexedLines: metadata.unindexedLines,
                    shadowVolume
                },
                timestamp: Date.now()
            };

            logger.warn(`[PIPELINE ALERT] ${filePath}: Shadow Volume ${shadowVolume}%`);
            watcher.emit('pipeline:alert', alert);

            // Broadcast si el watcher tiene acceso al wsManager (vía orchestrator)
            watcher.wsManager?.broadcast(alert);
        }

        // Alerta si no se encontraron átomos en un archivo que tiene código
        if (analysis.atomCount === 0 && analysis.parsed?.source?.length > 100) {
            const alert = {
                type: 'pipeline:zero_atoms',
                filePath,
                severity: 'info',
                message: `File contains significant code but zero atoms were extracted. Check parser/extractors.`,
                timestamp: Date.now()
            };
            watcher.emit('pipeline:alert', alert);
        }

        return { success: true };
    }
};
