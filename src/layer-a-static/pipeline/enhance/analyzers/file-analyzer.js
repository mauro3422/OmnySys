/**
 * @fileoverview File Analyzer - Análisis de archivos individuales
 * 
 * @module pipeline/enhance/analyzers
 */

import { detectSharedState } from '../../../analyses/tier3/shared-state-detector.js';
import { detectEventPatterns } from '../../../analyses/tier3/event-pattern-detector.js';
import { detectSideEffects } from '../../../analyses/tier3/side-effects-detector.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:enhance:file-analyzer');

/**
 * Analiza un archivo individual para detectar patrones semánticos
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @param {Object} fileInfo - Información del archivo
 * @returns {Object} Análisis del archivo
 */
export function analyzeFile(filePath, code, fileInfo) {
  try {
    // Detectar shared state
    const sharedState = detectSharedState(code, filePath);

    // Detectar event patterns
    const eventPatterns = detectEventPatterns(code, filePath);

    // Detectar side effects
    const sideEffects = detectSideEffects(code, filePath);

    return {
      ...fileInfo,
      semanticAnalysis: {
        sharedState,
        eventPatterns,
        sideEffects: sideEffects.sideEffects,
        sideEffectDetails: sideEffects.details
      },
      sideEffects
    };
  } catch (error) {
    logger.warn(`Error analyzing ${filePath}:`, error.message);
    return fileInfo;
  }
}

/**
 * Analiza múltiples archivos
 * @param {Object} parsedFiles - Mapa de archivos parseados
 * @param {string} absoluteRootPath - Raíz del proyecto
 * @returns {Promise<Object>} Archivos analizados y side effects
 */
export async function analyzeAllFiles(parsedFiles, absoluteRootPath) {
  const enhancedFiles = {};
  const allSideEffects = {};
  const fileSourceCode = {};

  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const projectRelative = filePath.replace(/\\/g, '/');

    try {
      // Usar código ya en memoria desde el parseo (evita leer disco 2 veces)
      const code = fileInfo.source || fileInfo.code || '';
      fileSourceCode[projectRelative] = code;

      // Analizar archivo
      const analysis = analyzeFile(projectRelative, code, fileInfo);
      enhancedFiles[projectRelative] = analysis;
      allSideEffects[projectRelative] = analysis.sideEffects;
    } catch (error) {
      logger.warn(`Error reading ${filePath}:`, error.message);
      enhancedFiles[projectRelative] = fileInfo;
    }
  }

  return { enhancedFiles, allSideEffects, fileSourceCode };
}
