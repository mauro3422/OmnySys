/**
 * enricher/index.js
 * API pública del módulo de enriquecimiento semántico
 * 
 * OPCION B (actual): Análisis por archivo con imports completos
 * OPCION C (futuro): Análisis por función (ver function-analyzer.js)
 * 
 * Re-exporta todas las funciones para mantener compatibilidad hacia atrás
 * con el archivo original semantic-enricher.js
 */

// Función principal (Opción B - por archivo)
export { enrichSemanticAnalysis } from './core.js';

// Opción C - Análisis por función (futuro)
export {
  analyzeFunctions,
  buildFunctionContext,
  hasSideEffects,
  isPureFunction
} from '../function-analyzer.js';

// Validación de respuestas LLM
export {
  validateLLMResponse,
  calculateDynamicTimeout,
  extractActualLocalStorageKeys,
  extractActualEventNames
} from '../llm-response-validator.js';

// Utilidades
export { getEnrichmentStats } from './utils.js';

// Builders de contexto (útiles para testing y debugging)
export { 
  buildFileSpecificContext, 
  buildProjectContext,
  buildCompactProjectMetadata 
} from './context-builders.js';

// Mergers (útiles para testing)
export { 
  mergeAnalyses, 
  mergeSharedState, 
  mergeEvents 
} from './mergers.js';

// Re-exportar desde el detector de issues semánticos
export { 
  detectSemanticIssues, 
  generateIssuesReport 
} from '../semantic-issues-detector.js';
