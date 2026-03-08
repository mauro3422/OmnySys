/**
 * @fileoverview duplicate-risk.js
 *
 * Detecta riesgo de símbolos duplicados tras creación/modificación.
 * Usa comparación de DNA hash para encontrar duplicados lógicos.
 *
 * @module core/file-watcher/guards/duplicate-risk
 * @version 2.0.0 - Estandarizado
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isLowSignalName
} from './guard-standards.js';
import {
    getDuplicateKeySqlForMode,
    DUPLICATE_MODES
} from '#layer-c/storage/repository/utils/index.js';
import { buildDuplicateRemediationPlan } from '../../../shared/compiler/index.js';
import {
    normalizeFilePath,
    isCanonicalDuplicateSignalPolicyFile,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    buildDuplicateContext
} from '../../../shared/compiler/index.js';
import {
    clearStructuralDuplicateIssues,
    loadStructuralLocalAtoms,
    collectCandidateDnas,
    loadStructuralDuplicateRows,
    buildStructuralFindings
} from './duplicate-structural-core.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');
const DUPLICATE_MODE = DUPLICATE_MODES.STRUCTURAL;
const DUPLICATE_KEY_SQL = getDuplicateKeySqlForMode(DUPLICATE_MODE, 'a.dna_json');

/**
 * Detecta riesgo de duplicados por DNA hash
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Findings detectados
 */
export async function detectDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        maxFindings = 8,
        minLinesOfCode = 4,
        atoms: providedAtoms = null
    } = options;

    // Normalizar filePath
    const normalizedFilePath = normalizeFilePath(filePath);

    if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
        await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
        return [];
    }

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return [];

        // Cargar findings previos para tracking de historial
        const previousFindings = loadPreviousFindings(repo.db, normalizedFilePath, 'code_duplicate');

        const localAtoms = loadStructuralLocalAtoms({
            repo,
            normalizedFilePath,
            providedAtoms,
            minLinesOfCode,
            maxFindings,
            duplicateMode: DUPLICATE_MODE,
            duplicateKeySql: DUPLICATE_KEY_SQL
        });

        if (localAtoms.length === 0) {
            await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        const candidateDnas = collectCandidateDnas(localAtoms, normalizedFilePath, isLowSignalName);

        if (candidateDnas.length === 0) {
            await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        const duplicateRows = loadStructuralDuplicateRows(repo, candidateDnas, normalizedFilePath, DUPLICATE_KEY_SQL);

        if (duplicateRows.length === 0) {
            await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        const findings = buildStructuralFindings(localAtoms, duplicateRows, normalizedFilePath, maxFindings);

        if (findings.length > 0) {
            const remediationPlan = buildDuplicateRemediationPlan(findings.map((finding) => ({
                groupSize: finding.totalInstances,
                urgencyScore: finding.totalInstances,
                instances: [{
                    name: finding.symbol,
                    file: normalizedFilePath,
                    importanceScore: 0,
                    callerCount: 0,
                    changeFrequency: 0
                }, ...finding.duplicateFiles.map((duplicateFile) => ({
                    name: finding.symbol,
                    file: duplicateFile,
                    importanceScore: 0,
                    callerCount: 0,
                    changeFrequency: 0
                }))]
            })));
            const preview = findings
                .map(f => `${f.symbol}(${f.totalInstances})`)
                .join(', ');

            const severity = findings.length >= 3 ? 'high' : 'medium';
            const issueType = createIssueType(IssueDomains.CODE, 'duplicate', severity);

            // Construir historial de deuda técnica
            const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);

            logger.warn(
                `[DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} duplicated symbol(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
            );

            // Crear contexto estandarizado con historial de deuda
            const enrichedContext = buildDuplicateContext(findings, debtHistory);
            const context = createStandardContext({
                guardName: 'duplicate-risk-guard',
                severity,
                suggestedAction: findings.length >= 3
                    ? StandardSuggestions.DUPLICATE_REUSE + ' (multiple duplicates detected)'
                    : StandardSuggestions.DUPLICATE_REUSE,
                suggestedAlternatives: remediationPlan.items.flatMap((item) => item.recommendedActions).slice(0, 6),
                relatedFiles: findings.flatMap(f => f.duplicateFiles).filter((v, i, a) => a.indexOf(v) === i),
                extraData: {
                    duplicateCount: findings.length,
                    findings: findings.slice(0, maxFindings),
                    remediation: remediationPlan,
                    debtHistory: enrichedContext.debtHistory,
                    recommendations: enrichedContext.recommendations
                }
            });

            await persistWatcherIssue(
                rootPath,
                normalizedFilePath,
                issueType,
                severity,
                `${findings.length} duplicate symbol(s): ${preview}`,
                context
            );

            // Limpiar severidad opuesta
            if (severity === 'high') {
                await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_medium');
            } else {
                await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_high');
            }

            EventEmitterContext.emit('code:duplicate', {
                filePath: normalizedFilePath,
                severity,
                duplicateCount: findings.length,
                findings: findings.map(f => ({
                    symbol: f.symbol,
                    instances: f.totalInstances,
                    files: f.duplicateFiles.length
                }))
            });
        } else {
            await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
        }

        return findings;

    } catch (error) {
        logger.debug(`[DUPLICATE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectDuplicateRisk;
