/**
 * @fileoverview duplicate-risk.js
 *
 * Detecta riesgo de simbolos duplicados tras creacion/modificacion.
 * Usa comparacion de DNA hash para encontrar duplicados logicos.
 *
 * @module core/file-watcher/guards/duplicate-risk
 * @version 2.0.0 - Estandarizado
 */

import { createLogger } from '../../../utils/logger.js';
import {
    getDuplicateKeySqlForMode,
    DUPLICATE_MODES
} from '#layer-c/storage/repository/utils/index.js';
import {
    normalizeFilePath,
    isCanonicalDuplicateSignalPolicyFile
} from '../../../shared/compiler/index.js';
import {
    clearStructuralDuplicateIssues
} from './duplicate-structural-core.js';
import {
    runStructuralDuplicateDetection
} from './duplicate-risk-detection.js';
import {
    persistStructuralDuplicateFinding
} from './duplicate-risk-remediation.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');
const DUPLICATE_MODE = DUPLICATE_MODES.STRUCTURAL;
const DUPLICATE_KEY_SQL = getDuplicateKeySqlForMode(DUPLICATE_MODE, 'a.dna_json');

/**
 * Detecta riesgo de duplicados por DNA hash
 * @param {string} rootPath - Ruta raiz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuracion
 * @returns {Promise<Array<Object>>} Findings detectados
 */
export async function detectDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        maxFindings = 8,
        minLinesOfCode = 4,
        atoms: providedAtoms = null
    } = options;

    const normalizedFilePath = normalizeFilePath(filePath);

    if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
        await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
        return [];
    }

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) {
            return [];
        }

        const findings = runStructuralDuplicateDetection({
            repo,
            normalizedFilePath,
            providedAtoms,
            minLinesOfCode,
            maxFindings,
            duplicateMode: DUPLICATE_MODE,
            duplicateKeySql: DUPLICATE_KEY_SQL
        });

        if (findings.length === 0) {
            await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        await persistStructuralDuplicateFinding({
            rootPath,
            normalizedFilePath,
            findings,
            eventEmitterContext: EventEmitterContext,
            maxFindings
        });

        return findings;
    } catch (error) {
        logger.debug(`[DUPLICATE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectDuplicateRisk;
