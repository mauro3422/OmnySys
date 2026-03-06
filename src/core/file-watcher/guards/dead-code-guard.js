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
import {
    buildDeadCodeRemediation,
    isSuspiciousDeadCodeAtom,
    normalizeDeadCodeAtom
} from '../../../shared/compiler/index.js';

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
            const normalized = normalizeDeadCodeAtom(atom);
            const isDead = metrics.isDeadCode || isSuspiciousDeadCodeAtom(atom, { minLines });

            if (isDead && metrics.linesOfCode >= minLines) {
                const severity = metrics.linesOfCode > 20 ? 'medium' : 'low';
                const issueType = createIssueType(IssueDomains.CODE, 'dead_code', severity);
                const remediation = buildDeadCodeRemediation(atom);

                const reason = normalized.isExported
                    ? 'is exported but appears fully disconnected'
                    : 'is not exported and has no callers/callees';

                const suggestedAction = remediation.recommendedActions[0]
                    || (normalized.isExported
                        ? `${StandardSuggestions.DEAD_CODE_REMOVE} or verify the missing wiring/import`
                        : StandardSuggestions.DEAD_CODE_REMOVE);

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
                        suggestedAlternatives: remediation.recommendedActions,
                        extraData: {
                            isExported: metrics.isExported,
                            isDeadCode: true,
                            linesOfCode: metrics.linesOfCode,
                            functionType: metrics.type,
                            calledBy: normalized.calledBy,
                            calls: normalized.calls,
                            purpose: normalized.purpose
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

export default detectDeadCode;
