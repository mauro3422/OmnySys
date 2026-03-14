/**
 * @fileoverview conceptual-duplicate-risk.js
 *
 * Detecta duplicados conceptuales: funciones con mismo proposito semantico
 * pero diferentes implementaciones. Usa semanticFingerprint (verb:chest:domain:entity)
 * para detectar "mirror atoms".
 *
 * @module core/file-watcher/guards/conceptual-duplicate-risk
 * @version 1.0.0
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
    generateAlternativeNames,
    normalizeFilePath,
    isCanonicalDuplicateSignalPolicyFile,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    buildDuplicateContext
} from '../../../shared/compiler/index.js';
import {
    clearConceptualDuplicateIssues,
    loadConceptualLocalAtoms,
    detectConceptualFindings
} from './duplicate-conceptual-core.js';

const logger = createLogger('OmnySys:file-watcher:guards:conceptual-duplicate');

async function loadConceptualDuplicateRepo(rootPath) {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    return getRepository(rootPath);
}

function loadConceptualDuplicateContext(repo, normalizedFilePath, minLinesOfCode) {
    const previousFindings = loadPreviousFindings(
        repo.db,
        normalizedFilePath,
        'code_conceptual_duplicate'
    );
    const localAtoms = loadConceptualLocalAtoms(repo, normalizedFilePath, minLinesOfCode);

    return {
        previousFindings,
        localAtoms
    };
}

async function detectConceptualDuplicateFindings(repo, normalizedFilePath, localAtoms, maxFindings, projectPath = null) {
    return detectConceptualFindings(
        repo,
        normalizedFilePath,
        localAtoms,
        maxFindings,
        isLowSignalName,
        'low',
        projectPath
    );
}

async function persistConceptualDuplicateFinding(
    rootPath,
    normalizedFilePath,
    findings,
    previousFindings,
    EventEmitterContext,
    maxFindings
) {
    const preview = findings
        .map((finding) => `${finding.symbol}(${finding.semanticFingerprint})`)
        .join(', ');

    // Chest-based severity logic (V4: verb:chest:domain:entity)
    const chests = findings.map(f => f.semanticFingerprint.split(':')[1] || 'logic');
    const hasPublicApiIssue = findings.some(
        (finding) => finding.isExported && finding.existingExports > 0
    );

    let severity = 'medium';
    if (chests.includes('logic') || chests.includes('orchestration')) {
        severity = hasPublicApiIssue ? 'high' : 'medium';
    } else if (chests.every(c => c === 'lifecycle')) {
        severity = 'low';
    } else if (chests.includes('telemetry') || chests.includes('storage')) {
        severity = 'medium';
    }

    const issueType = createIssueType(IssueDomains.CODE, 'conceptual_duplicate', severity);
    const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);

    logger.warn(
        `[CONCEPTUAL DUPLICATE GUARD] ${normalizedFilePath}: ${findings.length} conceptual duplicate(s) -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`
    );

    const enrichedContext = buildDuplicateContext(findings, debtHistory);
    const context = createStandardContext({
        guardName: 'conceptual-duplicate-risk-guard',
        severity,
        suggestedAction: hasPublicApiIssue
            ? 'This function duplicates an existing public API. Consider reusing the canonical implementation.'
            : `${StandardSuggestions.DUPLICATE_REUSE} (same semantic purpose, different implementation)`,
        suggestedAlternatives: findings.flatMap((finding) => finding.suggestedAlternatives).slice(0, 6),
        relatedFiles: findings.flatMap((finding) => finding.duplicateFiles).filter((value, index, all) => all.indexOf(value) === index),
        extraData: {
            conceptualDuplicateCount: findings.length,
            findings: findings.slice(0, maxFindings),
            fingerprintFormat: 'verb:chest:domain:entity',
            debtHistory: enrichedContext.debtHistory,
            recommendations: enrichedContext.recommendations
        }
    });

    await persistWatcherIssue(
        rootPath,
        normalizedFilePath,
        issueType,
        severity,
        `${findings.length} conceptual duplicate(s): ${preview}`,
        context
    );

    if (severity === 'high') {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_medium');
    } else {
        await clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_high');
    }

    EventEmitterContext.emit('code:conceptual_duplicate', {
        filePath: normalizedFilePath,
        severity,
        duplicateCount: findings.length,
        findings: findings.map((finding) => ({
            symbol: finding.symbol,
            semanticFingerprint: finding.semanticFingerprint,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}

/**
 * Detecta duplicados conceptuales por semanticFingerprint
 * @param {string} rootPath - Ruta raiz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuracion
 * @returns {Promise<Array<Object>>} Findings detectados
 */
export async function detectConceptualDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        maxFindings = 5,
        minLinesOfCode = 3
    } = options;
    const normalizedFilePath = normalizeFilePath(filePath);

    if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
        await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
        return [];
    }

    try {
        const repo = await loadConceptualDuplicateRepo(rootPath);
        if (!repo?.db) {
            return [];
        }

        const {
            previousFindings,
            localAtoms
        } = loadConceptualDuplicateContext(
            repo,
            normalizedFilePath,
            minLinesOfCode
        );

        if (localAtoms.length === 0) {
            await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        const findings = await detectConceptualDuplicateFindings(
            repo,
            normalizedFilePath,
            localAtoms,
            maxFindings,
            rootPath
        );

        if (findings.length === 0) {
            await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        await persistConceptualDuplicateFinding(
            rootPath,
            normalizedFilePath,
            findings,
            previousFindings,
            EventEmitterContext,
            maxFindings
        );

        return findings;
    } catch (error) {
        logger.warn(`[CONCEPTUAL DUPLICATE GUARD ERROR] ${normalizedFilePath}: ${error.message}`);
        console.error('[CONCEPTUAL DUPLICATE GUARD ERROR]', error);
        return [];
    }
}

export default detectConceptualDuplicateRisk;
