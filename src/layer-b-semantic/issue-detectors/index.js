/**
 * @fileoverview index.js
 * 
 * Issue Detectors - Sistema modular de detección de problemas semánticos
 * 
 * Detecta problemas en el código usando información semántica:
 * 1. Archivos HUÉRFANOS con side effects
 * 2. Eventos emitidos pero SIN LISTENERS
 * 3. Shared state leído pero NUNCA ESCRITO
 * 4. Shared state escrito pero NUNCA LEÍDO
 * 5. Conexiones indirectas NO DOCUMENTADAS
 * 6. Archivos con alta complejidad de conexiones
 * 
 * @module issue-detectors
 */

// Detectores individuales
export { buildGlobalState } from './global-state-builder.js';
export { detectOrphanedFiles } from './orphaned-files.js';
export { detectUnhandledEvents } from './unhandled-events.js';
export { detectUndefinedSharedState, detectDeadSharedState } from './shared-state.js';
export { detectConnectionHotspots } from './connection-hotspots.js';
export { detectSuspiciousPatterns } from './suspicious-patterns.js';
export { generateIssuesReport } from './report-generator.js';

// ============================================
// Orquestador principal (API pública)
// ============================================

import { buildGlobalState } from './global-state-builder.js';
import { detectOrphanedFiles } from './orphaned-files.js';
import { detectUnhandledEvents } from './unhandled-events.js';
import { detectUndefinedSharedState, detectDeadSharedState } from './shared-state.js';
import { detectConnectionHotspots } from './connection-hotspots.js';
import { detectSuspiciousPatterns } from './suspicious-patterns.js';

/**
 * Detecta problemas semánticos en el análisis
 * @param {object} enrichedResults - Resultados del análisis enriquecido
 * @returns {object} - Reporte de issues encontrados
 */
export function detectSemanticIssues(enrichedResults) {
  const issues = {
    orphanedFilesWithSideEffects: [],
    unhandledEvents: [],
    undefinedSharedState: [],
    deadSharedState: [],
    connectionHotspots: [],
    suspiciousPatterns: []
  };

  // Preparar índices globales
  const globalState = buildGlobalState(enrichedResults);

  // 1. Archivos huérfanos con side effects
  issues.orphanedFilesWithSideEffects = detectOrphanedFiles(enrichedResults);

  // 2. Eventos sin listeners
  issues.unhandledEvents = detectUnhandledEvents(globalState);

  // 3. Shared state sin write
  issues.undefinedSharedState = detectUndefinedSharedState(globalState);

  // 4. Shared state sin reads (código muerto)
  issues.deadSharedState = detectDeadSharedState(globalState);

  // 5. Connection hotspots (archivos con muchas conexiones)
  issues.connectionHotspots = detectConnectionHotspots(enrichedResults);

  // 6. Patrones sospechosos
  issues.suspiciousPatterns = detectSuspiciousPatterns(enrichedResults);

  // Calcular estadísticas
  const stats = {
    totalIssues:
      issues.orphanedFilesWithSideEffects.length +
      issues.unhandledEvents.length +
      issues.undefinedSharedState.length +
      issues.deadSharedState.length +
      issues.connectionHotspots.length +
      issues.suspiciousPatterns.length,
    bySeverity: {
      high: 0,
      medium: 0,
      low: 0
    }
  };

  // Contar por severidad
  Object.values(issues).flat().forEach(issue => {
    if (issue.severity) {
      stats.bySeverity[issue.severity]++;
    }
  });

  return {
    issues,
    stats,
    timestamp: Date.now()
  };
}
