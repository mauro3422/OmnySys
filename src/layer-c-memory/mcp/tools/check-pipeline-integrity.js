/**
 * @fileoverview check-pipeline-integrity.js
 *
 * MCP tool para verificar la integridad de TODO el pipeline de OmnySys.
 * Ejecuta PipelineIntegrityDetector y genera reporte consolidado.
 *
 * @module mcp/tools/check-pipeline-integrity
 */

import { PipelineIntegrityDetector } from '../../../core/meta-detector/pipeline-integrity-detector.js';
import { IntegrityDashboard } from '../../../core/meta-detector/integrity-dashboard.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:MCP:PipelineIntegrity');

/**
 * Verifica la integridad del pipeline
 * @param {Object} args - Argumentos MCP
 * @param {Object} context - Contexto MCP
 * @returns {Promise<Object>} Reporte de integridad
 */
export async function check_pipeline_integrity(args = {}, context = {}) {
    const { fullCheck = true, includeSamples = true, verbose = false } = args;

    try {
        logger.info('Starting pipeline integrity check...');

        // Obtener projectPath del contexto
        const projectPath = context?.projectPath || process.cwd();

        // Crear detector y verificar
        const detector = new PipelineIntegrityDetector(projectPath);
        const results = await detector.verify();

        if (results.length === 0) {
            return {
                success: false,
                error: 'Pipeline verification failed: repository not available',
                timestamp: new Date().toISOString()
            };
        }

        // Generar reporte consolidado
        const dashboard = new IntegrityDashboard();
        const report = await dashboard.generateReport(results);

        // Log en consola si es verbose
        if (verbose) {
            const consoleSummary = dashboard.generateConsoleSummary(report);
            logger.info(consoleSummary);
        }

        // Preparar respuesta
        const response = {
            success: true,
            data: {
                overallHealth: report.overallHealth,
                grade: report.grade,
                timestamp: report.timestamp,
                summary: report.summary,
                criticalIssues: report.criticalIssues,
                warnings: report.warnings,
                recommendations: report.recommendations,
                detailedResults: includeSamples ? report.detailedResults : undefined
            }
        };

        logger.info(`Pipeline integrity check complete: ${report.overallHealth}/100 (Grade: ${report.grade})`);

        return response;

    } catch (error) {
        logger.error('Pipeline integrity check failed:', error.message);

        return {
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Export como MCP tool
 */
export const checkPipelineIntegrity = check_pipeline_integrity;
export default { check_pipeline_integrity };
