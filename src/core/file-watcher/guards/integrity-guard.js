/**
 * @fileoverview integrity-guard.js
 *
 * Valida la coherencia atómica y el flujo de datos en tiempo real.
 * Detecta inconsistencias semánticas y problemas de data-flow.
 *
 * @module core/file-watcher/guards/integrity-guard
 * @version 2.0.0 - Estandarizado
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { DataFlowAnalyzer } from '../../../layer-a-static/extractors/data-flow/core/data-flow-analyzer.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardThresholds,
    isValidGuardTarget
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:integrity');

/**
 * Detecta violaciones de integridad atómica
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Array<Object>} atoms - Átomos extraídos del archivo
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Object|null>} Resultado del análisis
 */
export async function detectIntegrityViolations(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const { verbose = true } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_high');
            await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_medium');
            await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_low');
            return null;
        }

        const violations = [];

        for (const atom of atoms) {
            if (!isValidGuardTarget(atom)) continue;

            // 1. Validar Data Flow si está presente
            if (atom.dataFlow) {
                const analyzer = new DataFlowAnalyzer(
                    atom.dataFlow.inputs || [],
                    atom.dataFlow.transformations || [],
                    atom.dataFlow.outputs || []
                );

                const analysis = analyzer.analyze();

                // Baja coherencia = posible lógica rota
                if (analysis.coherence < StandardThresholds.COHERENCE_MIN) {
                    const severity = analysis.coherence < 0.1 ? 'high' : 'medium';
                    
                    violations.push({
                        atomId: atom.id,
                        atomName: atom.name,
                        type: 'LOW_COHERENCE',
                        severity,
                        message: `Atom '${atom.name}' has low data-flow coherence (${Math.round(analysis.coherence * 100)}%). Possible broken logic.`,
                        context: createStandardContext({
                            guardName: 'integrity-guard',
                            atomId: atom.id,
                            atomName: atom.name,
                            metricValue: analysis.coherence,
                            threshold: StandardThresholds.COHERENCE_MIN,
                            severity,
                            suggestedAction: 'Review data-flow logic for disconnected inputs/outputs',
                            suggestedAlternatives: [
                                'Remove unused inputs',
                                'Connect dangling outputs to appropriate destinations',
                                'Refactor into smaller, coherent functions'
                            ],
                            extraData: {
                                coherence: analysis.coherence,
                                inputs: analysis.inputs?.length || 0,
                                outputs: analysis.outputs?.length || 0,
                                transformationCount: analysis.transformations?.length || 0
                            }
                        })
                    });
                }

                // Inputs no utilizados
                if (analysis.unusedInputs?.length > 0) {
                    const inputNames = analysis.unusedInputs.map(input =>
                        typeof input === 'object' ? (input.name || JSON.stringify(input)) : input
                    );
                    
                    violations.push({
                        atomId: atom.id,
                        atomName: atom.name,
                        type: 'UNUSED_INPUTS',
                        severity: 'low',
                        message: `Atom '${atom.name}' has unused inputs: ${inputNames.join(', ')}.`,
                        context: createStandardContext({
                            guardName: 'integrity-guard',
                            atomId: atom.id,
                            atomName: atom.name,
                            severity: 'low',
                            suggestedAction: 'Remove unused parameters or use them in the function logic',
                            suggestedAlternatives: [
                                'Remove unused parameters',
                                'Use the parameters in the function body',
                                'Mark optional parameters as such'
                            ],
                            extraData: {
                                unusedInputs: inputNames,
                                inputCount: analysis.inputs?.length || 0
                            }
                        })
                    });
                }
            }

            // 2. Validar inconsistencias de nomenclatura
            // Ejemplo: funciones async que no tienen await pero sí efectos secundarios marcados
            if (atom.is_async === 0 && atom.name.toLowerCase().includes('async')) {
                violations.push({
                    atomId: atom.id,
                    atomName: atom.name,
                    type: 'NAMING_MISMATCH',
                    severity: 'low',
                    message: `Function '${atom.name}' is synchronous but its name suggests async behavior.`,
                    context: createStandardContext({
                        guardName: 'integrity-guard',
                        atomId: atom.id,
                        atomName: atom.name,
                        severity: 'low',
                        suggestedAction: 'Rename function to reflect its synchronous nature, or make it async',
                        suggestedAlternatives: [
                            'Rename to remove "async" from name',
                            'Add async keyword if function should be async',
                            'Check if missing await in the function body'
                        ],
                        extraData: {
                            isAsync: atom.is_async,
                            expectedAsync: true
                        }
                    })
                });
            }

            // 3. Validar que funciones puras no tengan efectos secundarios
            if (atom.archetype?.type === 'pure' && (atom.sharedStateAccess?.length > 0 || atom.globalReads?.length > 0)) {
                violations.push({
                    atomId: atom.id,
                    atomName: atom.name,
                    type: 'PURE_FUNCTION_SIDE_EFFECTS',
                    severity: 'medium',
                    message: `Pure function '${atom.name}' appears to have side effects (accesses shared state).`,
                    context: createStandardContext({
                        guardName: 'integrity-guard',
                        atomId: atom.id,
                        atomName: atom.name,
                        severity: 'medium',
                        suggestedAction: 'Remove side effects or change archetype to reflect impure nature',
                        suggestedAlternatives: [
                            'Remove access to shared state',
                            'Pass state as parameters instead',
                            'Update archetype classification'
                        ],
                        extraData: {
                            archetype: atom.archetype,
                            sharedStateAccess: atom.sharedStateAccess,
                            globalReads: atom.globalReads
                        }
                    })
                });
            }
        }

        if (violations.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_high');
            await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_medium');
            await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_low');
            return null;
        }

        // Agrupar por severidad
        const highIssues = violations.filter(v => v.severity === 'high');
        const mediumIssues = violations.filter(v => v.severity === 'medium');
        const lowIssues = violations.filter(v => v.severity === 'low');
        
        // Determinar severidad global
        const severity = highIssues.length > 0 ? 'high' : (mediumIssues.length > 0 ? 'medium' : 'low');
        const mainViolation = highIssues[0] || mediumIssues[0] || lowIssues[0];

        if (verbose) {
            logger.warn(`[INTEGRITY][${severity.toUpperCase()}] ${filePath}: ${mainViolation.message} (+${violations.length - 1} more)`);
        }

        // Emitir evento para tiempo real
        EventEmitterContext.emit('integrity:violation', {
            filePath,
            severity,
            message: mainViolation.message,
            totalViolations: violations.length,
            bySeverity: {
                high: highIssues.length,
                medium: mediumIssues.length,
                low: lowIssues.length
            },
            violations: violations.map(v => ({
                atomName: v.atomName,
                type: v.type,
                severity: v.severity,
                message: v.message
            }))
        });

        // Persistir con issue type estandarizado
        const issueType = createIssueType(IssueDomains.SEM, 'data_flow', severity);
        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            `[${violations.length} violation(s)] ${mainViolation.message}`,
            {
                totalViolations: violations.length,
                bySeverity: { high: highIssues.length, medium: mediumIssues.length, low: lowIssues.length },
                violations: violations.map(v => v.context)
            }
        );

        // Limpiar severidades que no aplican
        if (severity !== 'high') await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_high');
        if (severity !== 'medium') await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_medium');
        if (severity !== 'low') await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_low');

        return { severity, totalViolations: violations.length, violations };

    } catch (error) {
        logger.debug(`[INTEGRITY GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}

export default detectIntegrityViolations;
