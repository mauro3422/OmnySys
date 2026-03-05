/**
 * @fileoverview complexity-guard.js
 *
 * Monitorea la complejidad ciclomática y el tamaño de funciones.
 * Detecta funciones que son difíciles de mantener y testear.
 *
 * @module core/file-watcher/guards/complexity-guard
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
    severityFromComplexity,
    severityFromLines,
    isValidGuardTarget,
    extractAtomMetrics
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:complexity');

/**
 * Detecta funciones con alta complejidad o tamaño excesivo
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Array<Object>} atoms - Átomos extraídos del archivo
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Issues detectados
 */
export async function detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        complexityHigh = StandardThresholds.COMPLEXITY_HIGH,
        complexityMedium = StandardThresholds.COMPLEXITY_MEDIUM,
        linesHigh = StandardThresholds.LINES_HIGH,
        linesMedium = StandardThresholds.LINES_MEDIUM,
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'code_complexity_high');
            await clearWatcherIssue(rootPath, filePath, 'code_complexity_medium');
            return [];
        }

        const issues = [];
        
        // Solo analizar purposes relevantes (no tests ni scripts de análisis)
        const relevantPurposes = ['API_EXPORT', 'CLASS_METHOD', 'INTERNAL_HELPER', 
                                  'PRIVATE_HELPER', 'NETWORK_HANDLER', 'TIMER_ASYNC',
                                  'ENTRY_POINT', 'WORKER_ENTRY'];

        for (const atom of atoms) {
            if (!isValidGuardTarget(atom)) continue;
            
            // Solo purposes relevantes
            const purpose = atom.purpose || atom.purpose_type || '';
            if (!relevantPurposes.includes(purpose)) continue;

            const metrics = extractAtomMetrics(atom);

            // Verificar complejidad
            const complexitySeverity = severityFromComplexity(metrics.complexity);
            if (complexitySeverity) {
                const issueType = createIssueType(IssueDomains.CODE, 'complexity', complexitySeverity);
                
                const suggestedAction = metrics.complexity >= complexityHigh
                    ? StandardSuggestions.COMPLEXITY_SPLIT + ' (consider extracting helper functions)'
                    : StandardSuggestions.COMPLEXITY_REFACTOR;

                issues.push({
                    atomId: metrics.id,
                    atomName: metrics.name,
                    severity: complexitySeverity,
                    issueType,
                    metricType: 'complexity',
                    message: `Function '${metrics.name}' has complexity ${metrics.complexity} (threshold: ${complexitySeverity === 'high' ? complexityHigh : complexityMedium})`,
                    context: createStandardContext({
                        guardName: 'complexity-guard',
                        atomId: metrics.id,
                        atomName: metrics.name,
                        metricValue: metrics.complexity,
                        threshold: complexitySeverity === 'high' ? complexityHigh : complexityMedium,
                        severity: complexitySeverity,
                        suggestedAction,
                        suggestedAlternatives: [
                            'Extract nested conditions into separate functions',
                            'Use early returns to reduce nesting',
                            'Consider using a strategy pattern for complex conditionals',
                            'Add unit tests for each branch'
                        ],
                        extraData: {
                            metricType: 'cyclomatic_complexity',
                            linesOfCode: metrics.linesOfCode,
                            isAsync: metrics.isAsync,
                            functionType: metrics.type
                        }
                    })
                });
            }

            // Verificar tamaño (líneas de código)
            const linesSeverity = severityFromLines(metrics.linesOfCode);
            if (linesSeverity) {
                const issueType = createIssueType(IssueDomains.CODE, 'function_length', linesSeverity);
                
                // Evitar duplicados si ya reportamos por complejidad
                const alreadyReported = issues.some(i => 
                    i.atomId === metrics.id && i.severity === linesSeverity
                );

                if (!alreadyReported) {
                    issues.push({
                        atomId: metrics.id,
                        atomName: metrics.name,
                        severity: linesSeverity,
                        issueType,
                        metricType: 'lines',
                        message: `Function '${metrics.name}' is ${metrics.linesOfCode} lines long (threshold: ${linesSeverity === 'high' ? linesHigh : linesMedium})`,
                        context: createStandardContext({
                            guardName: 'complexity-guard',
                            atomId: metrics.id,
                            atomName: metrics.name,
                            metricValue: metrics.linesOfCode,
                            threshold: linesSeverity === 'high' ? linesHigh : linesMedium,
                            severity: linesSeverity,
                            suggestedAction: StandardSuggestions.COMPLEXITY_SPLIT,
                            suggestedAlternatives: [
                                'Extract logical sections into private methods',
                                'Use the Extract Method refactoring pattern',
                                'Consider creating a class to hold related functionality',
                                'Document why the function is long if it cannot be split'
                            ],
                            extraData: {
                                metricType: 'lines_of_code',
                                complexity: metrics.complexity,
                                isAsync: metrics.isAsync,
                                functionType: metrics.type
                            }
                        })
                    });
                }
            }
        }

        // Persistir issues
        if (issues.length > 0) {
            const highIssues = issues.filter(i => i.severity === 'high');
            const mediumIssues = issues.filter(i => i.severity === 'medium');

            if (highIssues.length > 0) {
                const primary = highIssues[0];
                const byType = groupBy(highIssues, 'metricType');
                
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    primary.issueType,
                    'high',
                    `[${highIssues.length} HIGH complexity issues] ${primary.message}`,
                    { 
                        issues: highIssues.map(i => i.context),
                        byType: Object.keys(byType).reduce((acc, key) => {
                            acc[key] = byType[key].length;
                            return acc;
                        }, {})
                    }
                );
            } else {
                await clearWatcherIssue(rootPath, filePath, 'code_complexity_high');
            }

            if (mediumIssues.length > 0) {
                const primary = mediumIssues[0];
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    primary.issueType,
                    'medium',
                    `[${mediumIssues.length} MEDIUM complexity issues] ${primary.message}`,
                    { issues: mediumIssues.map(i => i.context) }
                );
            } else {
                await clearWatcherIssue(rootPath, filePath, 'code_complexity_medium');
            }

            // Emitir evento
            EventEmitterContext.emit('code:complexity', {
                filePath,
                totalIssues: issues.length,
                high: highIssues.length,
                medium: mediumIssues.length,
                issues: issues.map(i => ({
                    atomName: i.atomName,
                    severity: i.severity,
                    metricType: i.metricType,
                    value: i.metricType === 'complexity' 
                        ? i.context.metricValue 
                        : i.context.metricValue
                }))
            });

            if (verbose) {
                logger.warn(`[COMPLEXITY] ${filePath}: ${issues.length} complexity issue(s) detected`);
            }
        } else {
            await clearWatcherIssue(rootPath, filePath, 'code_complexity_high');
            await clearWatcherIssue(rootPath, filePath, 'code_complexity_medium');
        }

        return issues;

    } catch (error) {
        logger.debug(`[COMPLEXITY GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

/**
 * Agrupa elementos por una clave
 * @param {Array} array - Array a agrupar
 * @param {string} key - Clave de agrupación
 * @returns {Object} Elementos agrupados
 */
function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {});
}

export default detectHighComplexity;
