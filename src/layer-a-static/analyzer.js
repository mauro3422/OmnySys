/**
 * Analyzer - Orquestador de análisis automático
 *
 * Responsabilidad:
 * - Coordinar todos los análisis mediante Pattern Detection Engine V2
 * - Usar SOLO el sistema V2 (SSOT - Single Source of Truth)
 * - Eliminar duplicación de análisis legacy
 *
 * PRINCIPIO: Single Responsibility - solo orquesta, no analiza
 * ARQUITECTURA: SOLID + SSOT mediante Pattern Detection Engine V2
 */

import { PatternDetectionEngine } from './pattern-detection/index.js';

/**
 * Genera reporte completo de análisis usando Pattern Detection Engine V2
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {Promise<object>} - Reporte con análisis V2
 */
export async function generateAnalysisReport(systemMap) {
  // USAR SOLO Pattern Detection Engine V2 (SSOT)
  const engine = new PatternDetectionEngine({
    projectType: 'standard'
  });
  
  const patternResults = await engine.analyze(systemMap);
  
  // Retornar reporte con datos V2 únicamente
  return {
    metadata: systemMap.metadata,
    patternDetection: patternResults.patterns,
    qualityMetrics: patternResults.qualityScore,
    recommendations: patternResults.qualityScore.recommendations
  };
}
