/**
 * @fileoverview connection-hotspots.js
 * 
 * Detecta archivos con muchas conexiones (hotspots de riesgo)
 * 
 * @module issue-detectors/connection-hotspots
 */

/**
 * Detecta archivos con muchas conexiones (hotspots de riesgo)
 * @param {object} enrichedResults - Resultados del análisis enriquecido
 * @returns {Array} - Issues encontrados ordenados por connectionCount
 */
export function detectConnectionHotspots(enrichedResults) {
  const issues = [];

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const connectionCount =
      (analysis.imports || []).length +
      (analysis.usedBy || []).length +
      (analysis.semanticAnalysis?.sharedState?.reads?.length || 0) +
      (analysis.semanticAnalysis?.sharedState?.writes?.length || 0) +
      (analysis.semanticAnalysis?.eventPatterns?.eventEmitters?.length || 0) +
      (analysis.semanticAnalysis?.eventPatterns?.eventListeners?.length || 0);

    // Si tiene más de 10 conexiones, es un hotspot
    if (connectionCount > 10) {
      issues.push({
        type: 'connection-hotspot',
        file: filePath,
        connectionCount,
        severity: connectionCount > 20 ? 'high' : 'medium',
        reason: `File has ${connectionCount} connections (high coupling)`,
        breakdown: {
          imports: (analysis.imports || []).length,
          usedBy: (analysis.usedBy || []).length,
          sharedStateReads: (analysis.semanticAnalysis?.sharedState?.reads?.length || 0),
          sharedStateWrites: (analysis.semanticAnalysis?.sharedState?.writes?.length || 0),
          eventEmitters: (analysis.semanticAnalysis?.eventPatterns?.eventEmitters?.length || 0),
          eventListeners: (analysis.semanticAnalysis?.eventPatterns?.eventListeners?.length || 0)
        },
        suggestion: 'Consider refactoring to reduce coupling'
      });
    }
  }

  return issues.sort((a, b) => b.connectionCount - a.connectionCount);
}
