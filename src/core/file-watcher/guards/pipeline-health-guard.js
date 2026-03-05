/**
 * @fileoverview pipeline-health-guard.js
 *
 * Monitorea la salud del pipeline de análisis.
 * Detecta Shadow Volume alto, zero atoms, y anomalías en la indexación.
 * Reemplaza/estandariza pipeline-alert-guard.js
 *
 * @module core/file-watcher/guards/pipeline-health-guard
 * @version 1.0.0
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:pipeline-health');

// Thresholds
const SHADOW_VOLUME_HIGH = 30;
const SHADOW_VOLUME_MEDIUM = 20;
const MIN_CODE_LINES = 50;

/**
 * Detecta issues de salud del pipeline
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Issues detectados
 */
export async function detectPipelineIssues(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        analysis = null,  // Resultado del análisis del archivo
        verbose = true
    } = options;

    try {
        // Si no hay análisis, no podemos detectar nada
        if (!analysis) {
            await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_high');
            await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_medium');
            return [];
        }

        const issues = [];
        const metadata = analysis.metadata || {};
        
        // 1. Detectar Shadow Volume alto
        const shadowVolume = metadata.shadowVolume || 0;
        if (shadowVolume > SHADOW_VOLUME_HIGH) {
            const severity = 'high';
            const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

            issues.push({
                severity,
                issueType,
                check: 'shadow_volume',
                message: `High Shadow Volume: ${shadowVolume}% of lines are not indexed`,
                context: createStandardContext({
                    guardName: 'pipeline-health-guard',
                    metricValue: shadowVolume,
                    threshold: SHADOW_VOLUME_HIGH,
                    severity,
                    suggestedAction: 'Review parser configuration for this file type. Unindexed code may contain untracked logic.',
                    suggestedAlternatives: [
                        'Check if the file uses unsupported syntax',
                        'Verify parser plugin is enabled for this language',
                        'Consider adding custom extractor if needed'
                    ],
                    extraData: {
                        shadowVolume,
                        unindexedLines: metadata.unindexedLines || [],
                        totalLines: metadata.totalLines,
                        indexedLines: metadata.indexedLines
                    }
                })
            });
        } else if (shadowVolume > SHADOW_VOLUME_MEDIUM) {
            const severity = 'medium';
            const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

            issues.push({
                severity,
                issueType,
                check: 'shadow_volume',
                message: `Elevated Shadow Volume: ${shadowVolume}% of lines not indexed`,
                context: createStandardContext({
                    guardName: 'pipeline-health-guard',
                    metricValue: shadowVolume,
                    threshold: SHADOW_VOLUME_MEDIUM,
                    severity,
                    suggestedAction: 'Monitor unindexed lines for important logic',
                    extraData: {
                        shadowVolume,
                        unindexedLines: metadata.unindexedLines || []
                    }
                })
            });
        }

        // 2. Detectar Zero Atoms en archivo con código
        const atomCount = analysis.atomCount || 0;
        const parsedLines = analysis.parsed?.source?.length || 0;
        
        if (atomCount === 0 && parsedLines > MIN_CODE_LINES) {
            const severity = 'medium';
            const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

            issues.push({
                severity,
                issueType,
                check: 'zero_atoms',
                message: `Zero atoms extracted from ${parsedLines} lines of code`,
                context: createStandardContext({
                    guardName: 'pipeline-health-guard',
                    metricValue: 0,
                    threshold: 1,
                    severity,
                    suggestedAction: 'Verify parser is working correctly for this file. Check for syntax errors or unsupported patterns.',
                    suggestedAlternatives: [
                        'Check for syntax errors in the file',
                        'Verify file extension matches parser expectations',
                        'Review if code uses unsupported modern syntax'
                    ],
                    extraData: {
                        atomCount: 0,
                        parsedLines,
                        fileType: metadata.fileType || 'unknown'
                    }
                })
            });
        }

        // 3. Detectar análisis muy lento (si hay timing info)
        const analysisTime = metadata.analysisTimeMs;
        if (analysisTime && analysisTime > 5000) {
            const severity = 'low';
            const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

            issues.push({
                severity,
                issueType,
                check: 'slow_analysis',
                message: `Slow analysis: ${analysisTime}ms for ${parsedLines} lines`,
                context: createStandardContext({
                    guardName: 'pipeline-health-guard',
                    metricValue: analysisTime,
                    threshold: 5000,
                    severity,
                    suggestedAction: 'Consider breaking this file into smaller modules',
                    extraData: {
                        analysisTime,
                        linesPerMs: parsedLines / analysisTime
                    }
                })
            });
        }

        // Persistir issues
        if (issues.length > 0) {
            const highIssues = issues.filter(i => i.severity === 'high');
            const mediumIssues = issues.filter(i => i.severity === 'medium');
            const lowIssues = issues.filter(i => i.severity === 'low');

            // Persistir cada severidad
            for (const issue of [...highIssues, ...mediumIssues]) {
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    issue.issueType,
                    issue.severity,
                    `[PIPELINE] ${issue.message}`,
                    issue.context
                );
            }

            // Limpiar issues que ya no aplican
            if (highIssues.length === 0) {
                await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_high');
            }
            if (mediumIssues.length === 0) {
                await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_medium');
            }

            // Emitir evento
            EventEmitterContext.emit('code:pipeline-health', {
                filePath,
                totalIssues: issues.length,
                high: highIssues.length,
                medium: mediumIssues.length,
                low: lowIssues.length,
                checks: issues.map(i => ({
                    check: i.check,
                    severity: i.severity,
                    message: i.message
                }))
            });

            if (verbose) {
                logger.warn(`[PIPELINE-HEALTH] ${filePath}: ${issues.length} issue(s) detected`);
            }
        } else {
            // Todo limpio
            await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_high');
            await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_medium');
            await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_low');
        }

        return issues;

    } catch (error) {
        logger.debug(`[PIPELINE-HEALTH GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectPipelineIssues;
