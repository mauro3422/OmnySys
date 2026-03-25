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

import { createLogger } from '../../../utils/logger.js';
import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import {
    isCanonicalDuplicateSignalPolicyFile,
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
import { persistUnifiedFinding } from './unified-duplicate-guard-persistence.js';
import {
    clearUnifiedDuplicateIssues,
    normalizeUnifiedDuplicateFilePath,
    loadUnifiedPreviousFindings,
    buildUnifiedDebtHistory,
    coordinateUnifiedDuplicateFindings
} from './unified-duplicate-guard-helpers.js';
import { summarizeAtomTestability } from '../../../shared/compiler/index.js';

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

    const normalizedFilePath = normalizeUnifiedDuplicateFilePath(filePath);

    if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
        await clearUnifiedDuplicateIssues(rootPath, normalizedFilePath);
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

        const previousFindings = loadUnifiedPreviousFindings(repo, normalizedFilePath);

        const structuralPromise = enableStructural
            ? runStructuralDuplicateGuard(repo, normalizedFilePath, providedAtoms, { maxFindings, minLinesOfCode })
            : Promise.resolve([]);

        const conceptualPromise = enableConceptual
            ? runConceptualDuplicateGuard(repo, rootPath, normalizedFilePath, { maxFindings, minLinesOfCode })
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

        const coordinated = coordinateUnifiedDuplicateFindings(structuralFindings, conceptualFindings);
        const allFindings = [...structuralFindings, ...conceptualFindings];
        const debtHistory = buildUnifiedDebtHistory(normalizedFilePath, allFindings, previousFindings);

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

async function runConceptualDuplicateGuard(repo, rootPath, normalizedFilePath, options) {
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

export default detectUnifiedDuplicateRisk;
