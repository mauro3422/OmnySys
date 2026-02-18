/**
 * @fileoverview Impact Analysis Tools
 * 
 * Herramientas para análisis de impacto de cambios
 * 
 * @module unified-server/tools/impact-tools
 */

import {
  getFileDependencies,
  getFileAnalysis
} from '../../../layer-c-memory/query/apis/file-api.js';

/**
 * Obtiene mapa de impacto de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Mapa de impacto
 */
export async function getImpactMap(filePath) {
  const cached = this.cache.ramCacheGet(`impact:${filePath}`);
  if (cached) return cached;

  try {
    const deps = await getFileDependencies(this.projectPath, filePath);
    const fileData = await getFileAnalysis(this.projectPath, filePath);

    const result = {
      file: filePath,
      directlyAffects: deps.usedBy || [],
      transitiveAffects: deps.transitiveDependents || [],
      semanticConnections: fileData.semanticConnections || [],
      totalAffected:
        (deps.usedBy?.length || 0) +
        (deps.transitiveDependents?.length || 0) +
        (fileData.semanticConnections?.length || 0),
      riskLevel: fileData.riskScore?.severity || 'unknown',
      subsystem: fileData.subsystem
    };

    this.cache.set(`impact:${filePath}`, result);
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Analiza el impacto de cambiar un símbolo
 * @param {string} filePath - Ruta del archivo
 * @param {string} symbolName - Nombre del símbolo
 * @returns {Promise<Object>} - Análisis de cambio
 */
export async function analyzeChange(filePath, symbolName) {
  try {
    const fileData = await getFileAnalysis(this.projectPath, filePath);
    const symbol = fileData.exports?.find((e) => e.name === symbolName);

    if (!symbol) {
      return { error: `Symbol '${symbolName}' not found in ${filePath}` };
    }

    const impactMap = await this.getImpactMap(filePath);

    return {
      symbol: symbolName,
      file: filePath,
      symbolType: symbol.kind,
      directDependents: impactMap.directlyAffects,
      transitiveDependents: impactMap.transitiveAffects,
      riskLevel: fileData.riskScore?.severity,
      recommendation: fileData.riskScore?.severity === 'critical'
        ? '⚠️ HIGH RISK - This change affects many files'
        : '✓ Safe - Limited scope'
    };
  } catch (error) {
    return { error: error.message };
  }
}
