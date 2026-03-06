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

const INTEGRITY_ISSUE_TYPES = [
    'sem_data_flow_high',
    'sem_data_flow_medium',
    'sem_data_flow_low'
];

function normalizeUnusedInputName(input) {
    if (typeof input === 'object' && input !== null) {
        return String(input.name || '').trim();
    }

    return String(input || '').trim();
}

function isLikelyParserNoiseUnusedInput(name = '') {
    if (!name) return true;
    if (name === '__destructured_0') return true;
    if (/\s/.test(name)) return true;
    if (/['"`]/.test(name)) return true;
    if (/[;(){}]/.test(name)) return true;
    if (name.length < 2) return true;
    return false;
}

function getActionableUnusedInputs(analysis = {}) {
    const inputCount = analysis.inputs?.length || 0;
    if (inputCount === 0) {
        return [];
    }

    return (analysis.unusedInputs || [])
        .map(normalizeUnusedInputName)
        .filter((name) => !isLikelyParserNoiseUnusedInput(name));
}

async function clearIntegrityIssues(rootPath, filePath) {
    try {
        await Promise.all(
            INTEGRITY_ISSUE_TYPES.map((issueType) => clearWatcherIssue(rootPath, filePath, issueType))
        );
    } catch (error) {
        logger.debug(`[INTEGRITY CLEAR SKIP] ${filePath}: ${error.message}`);
    }
}

function buildLowCoherenceViolation(atom, analysis) {
    const severity = analysis.coherence < 0.1 ? 'high' : 'medium';

    return {
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
    };
}

function buildUnusedInputsViolation(atom, analysis, inputNames) {
    return {
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
    };
}

function analyzeAtomDataFlow(atom) {
    if (!atom.dataFlow) {
        return [];
    }

    const analyzer = new DataFlowAnalyzer(
        atom.dataFlow.inputs || [],
        atom.dataFlow.transformations || [],
        atom.dataFlow.outputs || []
    );
    const analysis = analyzer.analyze();
    const violations = [];

    if (analysis.coherence < StandardThresholds.COHERENCE_MIN) {
        violations.push(buildLowCoherenceViolation(atom, analysis));
    }

    const inputNames = getActionableUnusedInputs(analysis);
    if (inputNames.length > 0) {
        violations.push(buildUnusedInputsViolation(atom, analysis, inputNames));
    }

    return violations;
}

function analyzeAtomNaming(atom) {
    if (atom.is_async !== 0 || !atom.name.toLowerCase().includes('async')) {
        return [];
    }

    return [{
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
    }];
}

function analyzeAtomIntegrity(atom) {
    if (!isValidGuardTarget(atom)) {
        return [];
    }

    return [
        ...analyzeAtomDataFlow(atom),
        ...analyzeAtomNaming(atom)
    ];
}

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
            await clearIntegrityIssues(rootPath, filePath);
            return null;
        }

        const violations = atoms.flatMap(analyzeAtomIntegrity);

        if (violations.length === 0) {
            await clearIntegrityIssues(rootPath, filePath);
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
