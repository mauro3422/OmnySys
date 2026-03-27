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
import { executeConceptualDuplicateRisk } from './conceptual-duplicate-risk-execution.js';

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
    try {
        return await executeConceptualDuplicateRisk(rootPath, filePath, EventEmitterContext, options, logger);
    } catch (error) {
        const normalizedFilePath = filePath;
        logger.warn(`[CONCEPTUAL DUPLICATE GUARD ERROR] ${normalizedFilePath}: ${error.message}`);
        console.error('[CONCEPTUAL DUPLICATE GUARD ERROR]', error);
        return [];
    }
}

export default detectConceptualDuplicateRisk;
