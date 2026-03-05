/**
 * @fileoverview dead-code-guard.js
 *
 * Detecta código muerto (dead code) en archivos recién creados o modificados.
 * Alerta cuando se introduce código que no es llamado ni exportado.
 *
 * @module core/file-watcher/guards/dead-code-guard
 * @version 1.0.0
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isValidGuardTarget,
    extractAtomMetrics
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:dead-code');

/**
 * Detecta código muerto en átomos
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Array<Object>} atoms - Átomos extraídos del archivo
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Issues detectados
 */
export async function detectDeadCode(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        minLines = 5,  // Solo reportar funciones significativas
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'code_dead_code_medium');
            await clearWatcherIssue(rootPath, filePath, 'code_dead_code_low');
            return [];
        }

        const issues = [];

        for (const atom of atoms) {
            if (!isValidGuardTarget(atom)) continue;

            const metrics = extractAtomMetrics(atom);

            // Verificar si es código muerto
            const isDead = metrics.isDeadCode || isDeadCodeAtom(atom, metrics);

            if (isDead && metrics.linesOfCode >= minLines) {
                const severity = metrics.linesOfCode > 20 ? 'medium' : 'low';
                const issueType = createIssueType(IssueDomains.CODE, 'dead_code', severity);

                const reason = metrics.isExported 
                    ? 'is exported but never imported elsewhere'
                    : 'is not exported and has no internal references';

                const suggestedAction = metrics.isExported
                    ? StandardSuggestions.DEAD_CODE_REMOVE + ' or check if should be used'
                    : StandardSuggestions.DEAD_CODE_REMOVE;

                issues.push({
                    atomId: metrics.id,
                    atomName: metrics.name,
                    severity,
                    issueType,
                    message: `Dead code detected: '${metrics.name}' (${metrics.linesOfCode} lines) ${reason}`,
                    context: createStandardContext({
                        guardName: 'dead-code-guard',
                        atomId: metrics.id,
                        atomName: metrics.name,
                        metricValue: metrics.linesOfCode,
                        threshold: minLines,
                        severity,
                        suggestedAction,
                        suggestedAlternatives: metrics.isExported ? [
                            'If temporarily unused, add @deprecated with revival date',
                            'If permanently unused, remove to reduce bundle size',
                            'Check if it should be called from another function'
                        ] : [
                            'Remove the unused function',
                            'Export it if should be used externally',
                            'If temporarily disabled, add a TODO comment with reason'
                        ],
                        extraData: {
                            isExported: metrics.isExported,
                            isDeadCode: true,
                            linesOfCode: metrics.linesOfCode,
                            functionType: metrics.type,
                            calledBy: atom.calledBy || [],
                            calls: atom.calls || []
                        }
                    })
                });
            }
        }

        // Persistir issues
        if (issues.length > 0) {
            const mediumIssues = issues.filter(i => i.severity === 'medium');
            const lowIssues = issues.filter(i => i.severity === 'low');

            if (mediumIssues.length > 0) {
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    'code_dead_code_medium',
                    'medium',
                    `[${mediumIssues.length} dead code function(s)] ${mediumIssues[0].message}`,
                    { issues: mediumIssues.map(i => i.context) }
                );
            } else {
                await clearWatcherIssue(rootPath, filePath, 'code_dead_code_medium');
            }

            if (lowIssues.length > 0) {
                await persistWatcherIssue(
                    rootPath,
                    filePath,
                    'code_dead_code_low',
                    'low',
                    `[${lowIssues.length} small dead code function(s)]`,
                    { issues: lowIssues.map(i => i.context) }
                );
            } else {
                await clearWatcherIssue(rootPath, filePath, 'code_dead_code_low');
            }

            // Emitir evento
            EventEmitterContext.emit('code:dead-code', {
                filePath,
                totalIssues: issues.length,
                medium: mediumIssues.length,
                low: lowIssues.length,
                totalLines: issues.reduce((sum, i) => sum + i.context.extraData.linesOfCode, 0),
                issues: issues.map(i => ({
                    atomName: i.atomName,
                    severity: i.severity,
                    lines: i.context.extraData.linesOfCode,
                    isExported: i.context.extraData.isExported
                }))
            });

            if (verbose) {
                const totalLines = issues.reduce((sum, i) => sum + i.context.extraData.linesOfCode, 0);
                logger.warn(`[DEAD-CODE] ${filePath}: ${issues.length} dead function(s), ${totalLines} lines total`);
            }
        } else {
            await clearWatcherIssue(rootPath, filePath, 'code_dead_code_medium');
            await clearWatcherIssue(rootPath, filePath, 'code_dead_code_low');
        }

        return issues;

    } catch (error) {
        logger.debug(`[DEAD-CODE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

/**
 * Determina si un átomo es código muerto
 * @param {Object} atom - Átomo a analizar
 * @param {Object} metrics - Métricas extraídas
 * @returns {boolean}
 */
function isDeadCodeAtom(atom, metrics) {
    // Obtener purpose del átomo (puede ser purpose o purpose_type)
    const purpose = atom.purpose || atom.purpose_type || '';
    const filePath = atom.file_path || atom.filePath || '';
    
    // NO reportar falsos positivos conocidos por purpose
    const nonDeadPurposes = ['ENTRY_POINT', 'WORKER_ENTRY', 'SERVER_HANDLER', 
                             'EVENT_HANDLER', 'TIMER_ASYNC', 'NETWORK_HANDLER',
                             'API_EXPORT', 'SCRIPT_MAIN', 'ANALYSIS_SCRIPT',
                             'POTENTIALLY_UNUSED', 'FACTORY', 'WRAPPER'];
    
    if (nonDeadPurposes.includes(purpose)) {
        return false;
    }
    
    // NO reportar dead code en archivos de servidor/sistema (entry points)
    const systemFilePatterns = [
        /mcp-.*proxy/,
        /mcp-.*server/,
        /mcp-.*bridge/,
        /websocket.*server/,
        /orchestrator.*server/,
        /error-guardian/,
        /initialization.*steps/
    ];
    
    if (systemFilePatterns.some(pattern => pattern.test(filePath))) {
        return false;
    }

    // Si ya está marcado como dead code en la DB, verificar que no sea falso positivo
    if (atom.isDeadCode || atom.isRemoved) {
        // Solo reportar si tiene llamadas (podría ser verdaderamente muerto)
        const calledBy = atom.calledBy || [];
        return calledBy.length === 0;
    }

    // Si no es exportado y no es llamado por nadie
    if (!metrics.isExported) {
        const calledBy = atom.calledBy || [];
        // Verificar si es llamado internamente
        const hasInternalCalls = calledBy.some(ref => {
            // Si el caller es del mismo archivo, es llamada interna
            const callerFile = typeof ref === 'string' 
                ? ref.split('::')[0] 
                : (ref.filePath || ref.file);
            return callerFile === atom.filePath;
        });
        
        if (!hasInternalCalls) {
            // Solo reportar si tiene purpose explícito de DEAD_CODE
            return atom.purpose === 'DEAD_CODE';
        }
    }

    // Si es exportado pero nadie lo importa
    if (metrics.isExported) {
        const calledBy = atom.calledBy || [];
        const hasExternalCalls = calledBy.some(ref => {
            const callerFile = typeof ref === 'string' 
                ? ref.split('::')[0] 
                : (ref.filePath || ref.file);
            return callerFile !== atom.filePath;
        });
        
        // Solo reportar si está explícitamente marcado
        if (!hasExternalCalls) {
            return atom.purpose === 'DEAD_CODE';
        }
    }

    return false;
}

export default detectDeadCode;
