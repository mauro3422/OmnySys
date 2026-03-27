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

import { createLogger } from '../../../utils/logger.js';
import { normalizeFilePath, isCanonicalDuplicateSignalPolicyFile } from '../../../shared/compiler/index.js';
import { clearConceptualDuplicateIssues } from './duplicate-conceptual-core.js';
import { loadConceptualDuplicateRepo, loadConceptualDuplicateContext } from './conceptual-duplicate-risk-repo.js';
import { detectConceptualDuplicateFindings } from './conceptual-duplicate-risk-detection.js';
import { persistConceptualDuplicateFinding } from './conceptual-duplicate-risk-persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:conceptual-duplicate');

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

        const findings = await detectConceptualDuplicateFindings({
            repo,
            normalizedFilePath,
            localAtoms,
            maxFindings,
            projectPath: rootPath
        });

        if (findings.length === 0) {
            await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        await persistConceptualDuplicateFinding({
            rootPath,
            normalizedFilePath,
            findings,
            previousFindings,
            eventEmitterContext: EventEmitterContext,
            maxFindings
        });

        return findings;
    } catch (error) {
        logger.warn(`[CONCEPTUAL DUPLICATE GUARD ERROR] ${normalizedFilePath}: ${error.message}`);
        console.error('[CONCEPTUAL DUPLICATE GUARD ERROR]', error);
        return [];
    }
}

export default detectConceptualDuplicateRisk;
