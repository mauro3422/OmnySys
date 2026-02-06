/**
 * @fileoverview impact-analyzer.js
 * 
 * Análisis de impacto de cambios en archivos.
 * Calcula qué archivos se verían afectados por modificar uno.
 * 
 * @module graph/algorithms/impact-analyzer
 */

import { createImpactInfo } from '../types.js';

// Niveles de riesgo
export const RISK_LEVELS = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Umbrales para calcular riesgo
const RISK_THRESHOLDS = {
  LOW: 3,      // 1-3 archivos afectados
  MEDIUM: 10   // 4-10 archivos afectados, >10 es HIGH
};

/**
 * Calcula el nivel de riesgo basado en la cantidad de archivos afectados
 * 
 * @param {number} affectedCount - Cantidad de archivos afectados
 * @returns {string} - 'low', 'medium', 'high'
 */
export function calculateRiskLevel(affectedCount) {
  if (affectedCount === 0) return RISK_LEVELS.LOW;
  if (affectedCount <= RISK_THRESHOLDS.LOW) return RISK_LEVELS.LOW;
  if (affectedCount <= RISK_THRESHOLDS.MEDIUM) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.HIGH;
}

/**
 * Genera una recomendación basada en el riesgo
 * 
 * @param {number} affectedCount - Cantidad de archivos afectados
 * @param {string} riskLevel - Nivel de riesgo
 * @returns {string} - Recomendación legible
 */
export function generateRecommendation(affectedCount, riskLevel) {
  if (affectedCount === 0) {
    return '✅ Safe to edit - no dependencies detected';
  }

  if (riskLevel === RISK_LEVELS.LOW) {
    return `📝 Review ${affectedCount} file(s) before editing`;
  }

  if (riskLevel === RISK_LEVELS.MEDIUM) {
    return `⚠️ MEDIUM RISK - Review ${affectedCount} affected file(s) carefully`;
  }

  return `🚨 HIGH RISK - Review all ${affectedCount} affected file(s) before making changes`;
}

/**
 * Obtiene el impacto de editar un archivo
 * 
 * @param {string} filePath - Path del archivo a analizar
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @returns {ImpactResult} - Información completa de impacto
 */
export function getImpactMap(filePath, files) {
  const fileNode = files[filePath];

  if (!fileNode) {
    return {
      error: `File not found: ${filePath}`
    };
  }

  const impactInfo = createImpactInfo(filePath, fileNode);
  const riskLevel = calculateRiskLevel(impactInfo.totalFilesAffected);

  return {
    ...impactInfo,
    riskLevel,
    recommendation: generateRecommendation(impactInfo.totalFilesAffected, riskLevel)
  };
}

/**
 * Analiza el impacto de múltiples archivos a la vez
 * 
 * @param {string[]} filePaths - Paths de los archivos
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @returns {Object.<string, ImpactResult>} - Mapa de path -> impacto
 */
export function getMultipleImpactMaps(filePaths, files) {
  const results = {};
  
  for (const filePath of filePaths) {
    results[filePath] = getImpactMap(filePath, files);
  }
  
  return results;
}

/**
 * Encuentra los archivos de mayor impacto en el sistema
 * (los que más otros archivos dependen de ellos)
 * 
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @param {number} [limit=10] - Cantidad máxima a retornar
 * @returns {Array<{path: string, dependentCount: number}>}
 */
export function findHighImpactFiles(files, limit = 10) {
  const impacts = Object.entries(files).map(([path, node]) => ({
    path,
    dependentCount: (node.usedBy?.length || 0) + (node.transitiveDependents?.length || 0),
    directDependents: node.usedBy?.length || 0,
    transitiveDependents: node.transitiveDependents?.length || 0
  }));

  return impacts
    .sort((a, b) => b.dependentCount - a.dependentCount)
    .slice(0, limit);
}

/**
 * @typedef {Object} ImpactResult
 * @property {string} filePath
 * @property {string[]} directDependents
 * @property {string[]} indirectDependents
 * @property {string[]} allAffected
 * @property {number} totalFilesAffected
 * @property {string} riskLevel
 * @property {string} recommendation
 * @property {string} [error]
 */
