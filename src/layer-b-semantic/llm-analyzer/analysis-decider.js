/**
 * @fileoverview analysis-decider.js
 * 
 * Determina si un archivo necesita análisis LLM
 * 
 * @module llm-analyzer/analysis-decider
 */

/**
 * Determina si un archivo necesita análisis LLM
 * 
 * ESTRATEGIA INTELIGENTE:
 * - NO analizar archivos ya conectados por imports (lo sabemos)
 * - SÍ analizar archivos DESCONECTADOS con indicios de conexión oculta
 * - SÍ analizar archivos con shared state/eventos (conexiones no obvias)
 *
 * @param {object} staticAnalysis - Resultados del análisis estático
 * @param {object} fileInfo - Info completa del archivo (imports, usedBy, etc)
 * @param {number} confidenceThreshold - Umbral de confianza
 * @returns {boolean} - true si necesita análisis LLM
 */
export function needsLLMAnalysis(staticAnalysis, fileInfo = null, confidenceThreshold = 0.7) {
  // Criterio 1: Archivos HUÉRFANOS o DESCONECTADOS
  const isOrphan = fileInfo &&
    (fileInfo.imports || []).length === 0 &&
    (fileInfo.usedBy || []).length === 0;

  // Criterio 2: Tiene SHARED STATE
  const hasSharedState =
    (staticAnalysis.sharedState?.reads?.length > 0) ||
    (staticAnalysis.sharedState?.writes?.length > 0);

  // Criterio 3: Tiene EVENTOS
  const hasEvents =
    (staticAnalysis.eventPatterns?.eventListeners?.length > 0) ||
    (staticAnalysis.eventPatterns?.eventEmitters?.length > 0);

  // Criterio 4: Código DINÁMICO
  const hasDynamicCode = staticAnalysis.sideEffects?.some(
    effect => effect.includes('dynamic') || effect.includes('eval')
  );

  // Criterio 5: Baja CONFIANZA en conexiones detectadas
  const hasLowConfidence = staticAnalysis.semanticConnections?.some(
    conn => (conn.confidence || 1.0) < confidenceThreshold
  );

  // Criterio 6: Archivo AISLADO con side effects sospechosos
  const hasSuspiciousSideEffects =
    isOrphan &&
    (staticAnalysis.sideEffects?.hasGlobalAccess ||
     staticAnalysis.sideEffects?.usesLocalStorage);

  // Solo analizar si hay INDICIOS de conexiones ocultas
  return hasSharedState || hasEvents || hasDynamicCode ||
         hasLowConfidence || hasSuspiciousSideEffects;
}
