/**
 * @fileoverview hotspot-guard.js
 *
 * Detecta "hotspots" - funciones que cambian con alta frecuencia.
 * Indica posible inestabilidad o falta de diseño claro.
 *
 * @module core/file-watcher/guards/hotspot-guard
 * @version 1.0.0
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardThresholds,
    StandardSuggestions,
    isValidGuardTarget,
    extractAtomMetrics
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:hotspot');

/**
 * Detecta hotspots (funciones de cambio frecuente)
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Issues detectados
 */
export async function detectHotspots(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        highThreshold = StandardThresholds.HOTSPOT_HIGH,
        mediumThreshold = StandardThresholds.HOTSPOT_MEDIUM,
        maxAgeDays = 30,  // Solo considerar archivos recientes
        verbose = true
    } = options;

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return [];

        // Obtener átomos del archivo con métricas de evolución
        const atoms = repo.db.prepare(`
            SELECT 
                id, name, type, complexity, lines_of_code, is_async,
                change_frequency, age_days, fragility_score, risk_level,
                is_exported, is_dead_code
            FROM atoms
            WHERE file_path = ?
                AND (is_removed IS NULL OR is_removed = 0)
                AND (is_dead_code IS NULL OR is_dead_code = 0)
                AND age_days <= ?
            ORDER BY change_frequency DESC
        `).all(filePath, maxAgeDays);

        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_high');
            await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_medium');
            return [];
        }

        const issues = [];

        for (const atom of atoms) {
            // Solo considerar funciones significativas
            if (!isValidGuardTarget(atom)) continue;

            const metrics = extractAtomMetrics(atom);

            // Calcular score de hotspot
            // changeFrequency ya está normalizado (cambios/día)
            const changeScore = metrics.changeFrequency * metrics.ageDays;

            if (changeScore >= highThreshold || metrics.changeFrequency >= 0.5) {
                const severity = 'high';
                const issueType = createIssueType(IssueDomains.PERF, 'hotspot', severity);

                issues.push({
                    atomId: metrics.id,
                    atomName: metrics.name,
                    severity,
                    issueType,
                    message: `Hotspot detected: '${metrics.name}' changes frequently (${metrics.changeFrequency.toFixed(2)}/day over ${metrics.ageDays} days)`,
                    context: createStandardContext({
                        guardName: 'hotspot-guard',
                        atomId: metrics.id,
                        atomName: metrics.name,
                        metricValue: metrics.changeFrequency,
                        threshold: highThreshold / metrics.ageDays,
                        severity,
                        suggestedAction: StandardSuggestions.HOTSPOT_STABILIZE,
                        suggestedAlternatives: [
                            'Extract the changing parts into separate functions',
                            'Add comprehensive tests to prevent regressions',
                            StandardSuggestions.HOTSPOT_DOCUMENT,
                            'Consider if the interface design is unstable'
                        ],
                        extraData: {
                            changeFrequency: metrics.changeFrequency,
                            ageDays: metrics.ageDays,
                            changeScore,
                            fragilityScore: metrics.fragilityScore,
                            riskLevel: metrics.riskLevel,
                            complexity: metrics.complexity
                        }
                    })
                });
            } else if (changeScore >= mediumThreshold) {
                const severity = 'medium';
                const issueType = createIssueType(IssueDomains.PERF, 'hotspot', severity);

                issues.push({
                    atomId: metrics.id,
                    atomName: metrics.name,
                    severity,
                    issueType,
                    message: `Potential hotspot: '${metrics.name}' (${metrics.changeFrequency.toFixed(2)}/day)`,
                    context: createStandardContext({
                        guardName: 'hotspot-guard',
                        atomId: metrics.id,
                        atomName: metrics.name,
                        metricValue: metrics.changeFrequency,
                        threshold: mediumThreshold / metrics.ageDays,
                        severity,
                        suggestedAction: 'Monitor this function for further instability',
                        extraData: {
                            changeFrequency: metrics.changeFrequency,
                            ageDays: metrics.ageDays,
                            changeScore,
                            complexity: metrics.complexity
                        }
                    })
                });
            }
        }

        // Persistir issues
        if (issues.length > 0) {
            const highIssues = issues.filter(i => i.severity === 'high');
            const mediumIssues = issues.filter(i => i.severity === 'medium');

            if (highIssues.length > 0) {
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    'perf_hotspot_high',
                    'high',
                    `[${highIssues.length} HOTSPOT(s)] ${highIssues[0].message}`,
                    { 
                        issues: highIssues.map(i => i.context),
                        totalChangeFrequency: highIssues.reduce((sum, i) => sum + i.context.extraData.changeFrequency, 0)
                    }
                );
            } else {
                await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_high');
            }

            if (mediumIssues.length > 0) {
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    'perf_hotspot_medium',
                    'medium',
                    `[${mediumIssues.length} potential hotspot(s)]`,
                    { issues: mediumIssues.map(i => i.context) }
                );
            } else {
                await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_medium');
            }

            // Emitir evento
            EventEmitterContext.emit('perf:hotspot', {
                filePath,
                totalIssues: issues.length,
                high: highIssues.length,
                medium: mediumIssues.length,
                totalChangeFrequency: issues.reduce((sum, i) => sum + i.context.extraData.changeFrequency, 0),
                issues: issues.map(i => ({
                    atomName: i.atomName,
                    severity: i.severity,
                    changeFrequency: i.context.extraData.changeFrequency,
                    ageDays: i.context.extraData.ageDays
                }))
            });

            if (verbose) {
                logger.warn(`[HOTSPOT] ${filePath}: ${issues.length} hotspot(s) detected`);
            }
        } else {
            await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_high');
            await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_medium');
        }

        return issues;

    } catch (error) {
        logger.debug(`[HOTSPOT GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectHotspots;
