/**
 * @fileoverview event-leak-guard.js
 *
 * Detecta potenciales fugas de memoria por event listeners no limpiados.
 * Identifica patrones de suscripción sin correspondiente unsuscribe/cleanup.
 *
 * @module core/file-watcher/guards/event-leak-guard
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
    extractAtomMetrics,
    formatEventLeakMessage
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:event-leak');

/**
 * Detecta potenciales fugas de event listeners
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Array<Object>} atoms - Átomos extraídos del archivo
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Issues detectados
 */
export async function detectEventLeaks(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        listenerThreshold = StandardThresholds.LISTENERS_PER_EMITTER,
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_high');
            await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_medium');
            return [];
        }

        const issues = [];

        for (const atom of atoms) {
            if (!isValidGuardTarget(atom)) continue;

            const metrics = extractAtomMetrics(atom);
            const code = atom.sourceCode || atom.code || '';

            // Analizar listeners sin cleanup
            const listenerAnalysis = analyzeEventListeners(code, metrics);

            if (listenerAnalysis.hasLeakRisk) {
                const severity = listenerAnalysis.listenerCount >= listenerThreshold * 2 ? 'high' : 'medium';
                const issueType = createIssueType(IssueDomains.RUNTIME, 'event_leak', severity);

                const suggestions = [StandardSuggestions.EVENT_ADD_CLEANUP];
                if (listenerAnalysis.usesOnce) {
                    suggestions.push(StandardSuggestions.EVENT_USE_ONCE);
                }

                issues.push({
                    atomId: metrics.id,
                    atomName: metrics.name,
                    severity,
                    issueType,
                    message: formatEventLeakMessage(metrics.name, listenerAnalysis.listenerCount),
                    context: createStandardContext({
                        guardName: 'event-leak-guard',
                        atomId: metrics.id,
                        atomName: metrics.name,
                        metricValue: listenerAnalysis.listenerCount,
                        threshold: listenerThreshold,
                        severity,
                        suggestedAction: StandardSuggestions.EVENT_ADD_CLEANUP,
                        suggestedAlternatives: suggestions,
                        extraData: {
                            listenerCount: listenerAnalysis.listenerCount,
                            hasCleanup: listenerAnalysis.hasCleanup,
                            usesOnce: listenerAnalysis.usesOnce,
                            eventNames: listenerAnalysis.eventNames,
                            missingCleanupFor: listenerAnalysis.missingCleanupFor
                        }
                    })
                });
            }

            // Verificar event listeners en metadata del átomo (si existe)
            if (metrics.eventListeners && metrics.eventListeners.length > 0) {
                const hasMatchingEmitters = metrics.eventEmitters && metrics.eventEmitters.length > 0;
                
                // Si tiene listeners pero no emite eventos relacionados, puede ser un leak
                if (!hasMatchingEmitters && metrics.eventListeners.length >= listenerThreshold) {
                    const alreadyReported = issues.some(i => i.atomId === metrics.id);
                    
                    if (!alreadyReported) {
                        const severity = 'low';
                        const issueType = createIssueType(IssueDomains.RUNTIME, 'event_leak', severity);

                        issues.push({
                            atomId: metrics.id,
                            atomName: metrics.name,
                            severity,
                            issueType,
                            message: `Function '${metrics.name}' has ${metrics.eventListeners.length} event listeners (verify cleanup)`,
                            context: createStandardContext({
                                guardName: 'event-leak-guard',
                                atomId: metrics.id,
                                atomName: metrics.name,
                                metricValue: metrics.eventListeners.length,
                                threshold: listenerThreshold,
                                severity,
                                suggestedAction: 'Verify that event listeners are properly cleaned up',
                                extraData: {
                                    eventListeners: metrics.eventListeners,
                                    eventEmitters: metrics.eventEmitters || [],
                                    source: 'metadata'
                                }
                            })
                        });
                    }
                }
            }
        }

        // Persistir issues
        if (issues.length > 0) {
            const highIssues = issues.filter(i => i.severity === 'high');
            const mediumIssues = issues.filter(i => i.severity === 'medium');
            const lowIssues = issues.filter(i => i.severity === 'low');

            // Persistir por severidad
            for (const issue of [...highIssues, ...mediumIssues]) {
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    issue.issueType,
                    issue.severity,
                    issue.message,
                    issue.context
                );
            }

            if (highIssues.length === 0) {
                await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_high');
            }
            if (mediumIssues.length === 0) {
                await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_medium');
            }

            // Emitir evento
            EventEmitterContext.emit('runtime:event-leak', {
                filePath,
                totalIssues: issues.length,
                high: highIssues.length,
                medium: mediumIssues.length,
                low: lowIssues.length,
                issues: issues.map(i => ({
                    atomName: i.atomName,
                    severity: i.severity,
                    listenerCount: i.context.extraData?.listenerCount
                }))
            });

            if (verbose) {
                logger.warn(`[EVENT-LEAK] ${filePath}: ${issues.length} potential leak(s) detected`);
            }
        } else {
            await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_high');
            await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_medium');
            await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_low');
        }

        return issues;

    } catch (error) {
        logger.debug(`[EVENT-LEAK GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

/**
 * Analiza el código en busca de listeners sin cleanup
 * @param {string} code - Código fuente
 * @param {Object} metrics - Métricas del átomo
 * @returns {Object} Análisis de listeners
 */
function analyzeEventListeners(code, metrics) {
    const result = {
        listenerCount: 0,
        hasCleanup: false,
        hasLeakRisk: false,
        usesOnce: false,
        eventNames: [],
        missingCleanupFor: []
    };

    if (!code) return result;

    // Detectar patrones de suscripción
    const onPatterns = [
        /\.on\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /\.addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /\.addListener\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    // Detectar patrones de cleanup
    const offPatterns = [
        /\.off\s*\(/,
        /\.removeEventListener\s*\(/,
        /\.removeListener\s*\(/,
        /return\s*\(\s*\)\s*=>\s*\{[^}]*\.off|\.remove/  // Cleanup function
    ];

    // Detectar uso de once
    const oncePattern = /\.once\s*\(/;

    // Contar listeners
    for (const pattern of onPatterns) {
        const matches = [...code.matchAll(pattern)];
        result.listenerCount += matches.length;
        for (const match of matches) {
            if (match[1]) result.eventNames.push(match[1]);
        }
    }

    // Verificar si tiene cleanup
    result.hasCleanup = offPatterns.some(pattern => pattern.test(code));
    result.usesOnce = oncePattern.test(code);

    // Determinar si hay riesgo de leak
    // Hay riesgo si tiene listeners pero no cleanup, y no usa once
    if (result.listenerCount > 0 && !result.hasCleanup && !result.usesOnce) {
        result.hasLeakRisk = true;
        result.missingCleanupFor = [...result.eventNames];
    }

    // Menos riesgo si usa once (listeners de un solo uso)
    if (result.usesOnce && result.listenerCount <= 2) {
        result.hasLeakRisk = false;
    }

    return result;
}

export default detectEventLeaks;
