/**
 * @fileoverview metadata-enhancer.js
 * 
 * Fase de enriquecimiento de metadata
 * 
 * @module pipeline/enhancers/phases/metadata-enhancer
 */

/**
 * Enriquece metadata de archivos
 * @param {object} staticResults - Resultados estáticos
 */
export function enhanceMetadata(staticResults) {
  for (const fileData of Object.values(staticResults.files || {})) {
    // Calcular métricas adicionales
    fileData.metrics = calculateMetrics(fileData);
    
    // Detectar flags adicionales
    fileData.flags = detectFlags(fileData);
  }
}

/**
 * Calcula métricas adicionales
 * @private
 */
function calculateMetrics(fileData) {
  const imports = fileData.imports || [];
  const exports = fileData.exports || [];
  const usedBy = fileData.usedBy || [];
  
  return {
    importCount: imports.length,
    exportCount: exports.length,
    dependentCount: usedBy.length,
    coupling: calculateCoupling(imports.length, usedBy.length)
  };
}

/**
 * Calcula nivel de acoplamiento
 * @private
 */
function calculateCoupling(importCount, dependentCount) {
  if (dependentCount > 10) return 'high';
  if (dependentCount > 5) return 'medium';
  return 'low';
}

/**
 * Detecta flags adicionales
 * @private
 */
function detectFlags(fileData) {
  return {
    hasCircularDependency: false, // Se calcularía con análisis adicional
    isEntryPoint: fileData.usedBy?.length > 5,
    isLeaf: fileData.imports?.length === 0
  };
}
