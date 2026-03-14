/**
 * @fileoverview unified-duplicate-guard.js
 *
 * Guard unificado que coordina deteccion de duplicados estructurales (DNA)
 * y conceptuales (semantic fingerprint) en una sola ejecucion.
 *
 * Proporciona:
 * - Deteccion coordinada de ambos tipos de duplicados
 * - Priorizacion inteligente (structural primero)
 * - Tracking unificado de deuda tecnica
 * - Remediation plan combinado
 *
 * @module core/file-watcher/guards/unified-duplicate-guard
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions
} from './guard-standards.js';
import {
    buildDuplicateRemediationPlan,
    isCanonicalDuplicateSignalPolicyFile,
    normalizeFilePath,
    summarizeAtomTestability,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    buildDuplicateContext,
    coordinateDuplicateFindings
} from '../../../shared/compiler/index.js';
import {
    buildStructuralFindings,
    collectCandidateDnas,
    loadStructuralDuplicateRows,
    loadStructuralLocalAtoms
} from './duplicate-structural-core.js';
import {
    loadConceptualLocalAtoms,
    detectConceptualFindings
} from './duplicate-conceptual-core.js';

const logger = createLogger('OmnySys:file-watcher:guards:unified-duplicate');

/**
 * Ejecuta ambos guards (structural + conceptual) y coordina resultados
 * @param {string} rootPath - Ruta raiz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuracion
 * @returns {Promise<Object>} Resultados coordinados de ambos guards
 */
export async function detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        maxFindings = 10,
        minLinesOfCode = 3,
        atoms: providedAtoms = null,
        enableStructural = true,
        enableConceptual = true
    } = options;

    const normalizedFilePath = normalizeFilePath(filePath);

    if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_critical_high');
        return { structural: [], conceptual: [], coordinated: null };
    }

    logger.debug(`[UNIFIED DUPLICATE GUARD] STARTING for ${normalizedFilePath}`);

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);

        if (!repo?.db) {
            logger.warn('[UNIFIED DUPLICATE GUARD] No repo/db, returning empty');
            return { structural: [], conceptual: [], coordinated: null };
        }

        const previousFindings = loadPreviousFindings(repo.db, normalizedFilePath, 'code_%duplicate');

        const structuralPromise = enableStructural
            ? runStructuralDuplicateGuard(repo, normalizedFilePath, providedAtoms, { maxFindings, minLinesOfCode })
            : Promise.resolve([]);

        const conceptualPromise = enableConceptual
            ? runConceptualDuplicateGuard(repo, normalizedFilePath, { maxFindings, minLinesOfCode })
            : Promise.resolve([]);

        const [structuralFindings, conceptualFindings] = await Promise.all([
            structuralPromise,
            conceptualPromise
        ]);

        const resultMessage = `[UNIFIED DUPLICATE GUARD] ${normalizedFilePath}: structural=${structuralFindings.length}, conceptual=${conceptualFindings.length}`;
        if (structuralFindings.length > 0 || conceptualFindings.length > 0) {
            logger.warn(resultMessage);
        } else {
            logger.debug(resultMessage);
        }

        const coordinated = coordinateDuplicateFindings(structuralFindings, conceptualFindings);
        const allFindings = [...structuralFindings, ...conceptualFindings];
        const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, allFindings, previousFindings);

        if (allFindings.length > 0) {
            await persistUnifiedFinding(
                rootPath,
                normalizedFilePath,
                coordinated,
                debtHistory,
                EventEmitterContext
            );
        } else {
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
            await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
        }

        return {
            structural: structuralFindings,
            conceptual: conceptualFindings,
            coordinated,
            debtHistory,
            totalFindings: allFindings.length
        };
    } catch (error) {
        logger.error(`[UNIFIED DUPLICATE GUARD ERROR] ${normalizedFilePath}: ${error.message}`);
        console.error('[UNIFIED DUPLICATE GUARD ERROR]', error);
        return { structural: [], conceptual: [], coordinated: null, error: error.message };
    }
}

async function runStructuralDuplicateGuard(repo, normalizedFilePath, providedAtoms, options) {
    const { maxFindings, minLinesOfCode } = options;

    try {
        const { getDuplicateKeySqlForMode, DUPLICATE_MODES } = await import('#layer-c/storage/repository/utils/index.js');

        const duplicateMode = DUPLICATE_MODES.STRUCTURAL;
        const duplicateKeySql = getDuplicateKeySqlForMode(duplicateMode, 'a.dna_json');

        const localAtoms = loadStructuralLocalAtoms({
            repo,
            normalizedFilePath,
            providedAtoms,
            minLinesOfCode,
            maxFindings,
            duplicateMode,
            duplicateKeySql
        });

        if (localAtoms.length === 0) {
            return [];
        }

        const { isLowSignalName } = await import('./guard-standards.js');
        const candidateDnas = collectCandidateDnas(localAtoms, normalizedFilePath, isLowSignalName);

        if (candidateDnas.length === 0) {
            return [];
        }

        const duplicateRows = loadStructuralDuplicateRows(repo, candidateDnas, normalizedFilePath, duplicateKeySql);
        if (duplicateRows.length === 0) {
            return [];
        }

        return buildStructuralFindings(localAtoms, duplicateRows, normalizedFilePath, maxFindings);
    } catch (error) {
        logger.debug(`[STRUCTURAL GUARD SKIP] ${normalizedFilePath}: ${error.message}`);
        return [];
    }
}

async function runConceptualDuplicateGuard(repo, normalizedFilePath, options) {
    const { maxFindings, minLinesOfCode } = options;

    try {
        const { isLowSignalName } = await import('./guard-standards.js');
        const localAtoms = loadConceptualLocalAtoms(repo, normalizedFilePath, minLinesOfCode);

        if (localAtoms.length === 0) {
            return [];
        }

        const testabilitySummary = summarizeAtomTestability(localAtoms);
        return await detectConceptualFindings(
            repo,
            normalizedFilePath,
            localAtoms,
            maxFindings,
            isLowSignalName,
            testabilitySummary.severity,
            rootPath
        );
    } catch (error) {
        logger.debug(`[CONCEPTUAL GUARD SKIP] ${normalizedFilePath}: ${error.message}`);
        return [];
    }
}

async function persistUnifiedFinding(rootPath, normalizedFilePath, coordinated, debtHistory, EventEmitterContext) {
    const allFindings = [...coordinated.structural, ...coordinated.conceptual];

    let severity = 'medium';
    let issueTypeLabel = 'duplicate_unified';

    if (coordinated.hasOverlap) {
        severity = 'high';
        issueTypeLabel = 'duplicate_unified_critical';
    } else if (coordinated.structural.length >= 3 || allFindings.length >= 5) {
        severity = 'high';
    }

    const issueType = createIssueType(IssueDomains.CODE, issueTypeLabel, severity);
    const remediationPlan = buildDuplicateRemediationPlan(allFindings.map((finding) => ({
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

    const preview = allFindings
        .map((finding) => `${finding.symbol}(${finding.duplicateType}:${finding.totalInstances})`)
        .join(', ');

    logger.warn(
        `[UNIFIED DUPLICATE GUARD] ${normalizedFilePath}: ${allFindings.length} total -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    const enrichedContext = buildDuplicateContext(allFindings, debtHistory);
    const context = createStandardContext({
        guardName: 'unified-duplicate-risk-guard',
        severity,
        suggestedAction: coordinated.hasOverlap
            ? 'CRITICAL: Same symbols have both structural and conceptual duplicates. Immediate refactoring required.'
            : coordinated.structural.length > 0
                ? `${StandardSuggestions.DUPLICATE_REUSE} (structural duplicates detected)`
                : `${StandardSuggestions.DUPLICATE_REUSE} (conceptual duplicates detected)`,
        suggestedAlternatives: remediationPlan.items.flatMap((item) => item.recommendedActions).slice(0, 8),
        relatedFiles: allFindings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData: {
            totalDuplicateCount: allFindings.length,
            structuralCount: coordinated.structural.length,
            conceptualCount: coordinated.conceptual.length,
            hasOverlap: coordinated.hasOverlap,
            overlapDetails: coordinated.overlapDetails,
            priority: coordinated.priority,
            combinedRemediation: coordinated.combinedRemediation,
            findings: allFindings.slice(0, 10),
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
        `${allFindings.length} duplicate(s): ${preview}`,
        context
    );

    if (severity === 'high') {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
    } else {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
    }

    EventEmitterContext.emit('code:duplicate_unified', {
        filePath: normalizedFilePath,
        severity,
        totalDuplicateCount: allFindings.length,
        structuralCount: coordinated.structural.length,
        conceptualCount: coordinated.conceptual.length,
        hasOverlap: coordinated.hasOverlap,
        debtScore: debtHistory.debt.score,
        debtTrend: debtHistory.debt.trend,
        findings: allFindings.map((finding) => ({
            symbol: finding.symbol,
            type: finding.duplicateType,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}

export default detectUnifiedDuplicateRisk;
