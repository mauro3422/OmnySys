/**
 * semantic-enricher.js
 * Orquestador que combina análisis estático + LLM opcional
 * 
 * ⚠️  NOTA: Este archivo ha sido refactorizado.
 * El código ahora vive en enricher/ como módulos separados.
 * Este archivo mantiene compatibilidad hacia atrás.
 *
 * Pipeline:
 * 1. Análisis estático (siempre) - pattern matching + AST
 * 2. Identificar casos de baja confianza o complejos
 * 3. Aplicar LLM solo a casos que lo necesiten
 * 4. Merge resultados priorizando alta confianza
 * 5. Retornar enhanced connections
 */

// Re-exportar todo desde el nuevo módulo modular
export {
  // Función principal
  enrichSemanticAnalysis,
  // Utilidades
  getEnrichmentStats,
  // Builders de contexto
  buildFileSpecificContext,
  buildProjectContext,
  buildCompactProjectMetadata,
  // Mergers
  mergeAnalyses,
  mergeSharedState,
  mergeEvents,
  // Detector de issues
  detectSemanticIssues,
  generateIssuesReport
} from './enricher/index.js';
