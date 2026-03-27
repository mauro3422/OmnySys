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
import { buildUnifiedDuplicateSummary, persistUnifiedFinding } from './unified-duplicate-guard-persistence.js';
import {
    clearUnifiedDuplicateIssues,
    normalizeUnifiedDuplicateFilePath,
    loadUnifiedPreviousFindings,
    buildUnifiedDebtHistory,
    coordinateUnifiedDuplicateFindings
} from './unified-duplicate-guard-helpers.js';
import { runStructuralDuplicateGuard } from './unified-duplicate-guard-structural.js';
import { runConceptualDuplicateGuard } from './unified-duplicate-guard-conceptual.js';

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
        const summary = buildUnifiedDuplicateSummary(rootPath, normalizedFilePath, coordinated, debtHistory);
        const coordinatedWithSummary = { ...coordinated, summary };

        if (allFindings.length > 0) {
            await persistUnifiedFinding(
                rootPath,
                normalizedFilePath,
                coordinatedWithSummary,
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
            coordinated: coordinatedWithSummary,
            debtHistory,
            totalFindings: allFindings.length
        };
    } catch (error) {
        logger.error(`[UNIFIED DUPLICATE GUARD ERROR] ${normalizedFilePath}: ${error.message}`);
        console.error('[UNIFIED DUPLICATE GUARD ERROR]', error);
        return { structural: [], conceptual: [], coordinated: null, error: error.message };
    }
}

export default detectUnifiedDuplicateRisk;
