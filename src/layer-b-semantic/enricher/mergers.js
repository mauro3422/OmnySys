/**
 * mergers.js
 * Funciones para combinar análisis estático y LLM
 */

/**
 * Merge análisis estático y LLM para un archivo
 * @param {object} staticAnalysis - Análisis estático del archivo
 * @param {object} llmAnalysis - Análisis del LLM
 * @returns {object} - Análisis combinado
 */
export function mergeAnalyses(staticAnalysis, llmAnalysis) {
  const merged = { ...staticAnalysis };

  // Asegurar que semanticAnalysis existe
  if (!merged.semanticAnalysis) {
    merged.semanticAnalysis = {
      sharedState: { reads: [], writes: [] },
      eventPatterns: { eventEmitters: [], eventListeners: [] },
      sideEffects: {}
    };
  }

  // Agregar sección de LLM insights
  merged.llmInsights = {
    confidence: llmAnalysis.confidence,
    reasoning: llmAnalysis.reasoning,
    enhancedConnections: [],
    suggestedConnections: llmAnalysis.suggestedConnections || [],
    hiddenConnections: llmAnalysis.hiddenConnections || []
  };

  // Merge shared state
  if (llmAnalysis.sharedState) {
    merged.semanticAnalysis.sharedState = mergeSharedState(
      merged.semanticAnalysis.sharedState,
      llmAnalysis.sharedState
    );
  }

  // Merge eventos
  if (llmAnalysis.events) {
    merged.semanticAnalysis.eventPatterns = mergeEvents(
      merged.semanticAnalysis.eventPatterns,
      llmAnalysis.events
    );
  }

  // Agregar side effects adicionales
  if (llmAnalysis.sideEffects?.length > 0) {
    merged.semanticAnalysis.sideEffectDetails = merged.semanticAnalysis.sideEffectDetails || {};
    merged.semanticAnalysis.sideEffectDetails.llmDetected = llmAnalysis.sideEffects;
  }

  // Agregar archivos afectados detectados por LLM
  if (llmAnalysis.affectedFiles?.length > 0) {
    merged.llmInsights.affectedFiles = llmAnalysis.affectedFiles;
  }

  return merged;
}

/**
 * Merge detecciones de estado compartido (static + LLM)
 * @param {object} staticState - Estado del análisis estático
 * @param {object} llmState - Estado del LLM
 * @returns {object} - Estado combinado
 */
export function mergeSharedState(staticState, llmState) {
  const merged = { ...staticState };

  // Agregar reads detectados por LLM (sin duplicar)
  const existingReads = new Set(staticState?.reads || []);
  const newReads = (llmState?.reads || []).filter(r => !existingReads.has(r.property || r));
  if (newReads.length > 0) {
    merged.reads = [...(staticState?.reads || []), ...newReads];
  }

  // Agregar writes detectados por LLM (sin duplicar)
  const existingWrites = new Set(staticState?.writes || []);
  const newWrites = (llmState?.writes || []).filter(w => !existingWrites.has(w.property || w));
  if (newWrites.length > 0) {
    merged.writes = [...(staticState?.writes || []), ...newWrites];
  }

  return merged;
}

/**
 * Merge detecciones de eventos (static + LLM)
 * @param {object} staticEvents - Eventos del análisis estático
 * @param {object} llmEvents - Eventos del LLM
 * @returns {object} - Eventos combinados
 */
export function mergeEvents(staticEvents, llmEvents) {
  const merged = { ...staticEvents };

  // Agregar emits detectados por LLM
  const existingEmits = new Set(staticEvents?.eventEmitters || []);
  const newEmits = (llmEvents?.emits || []).filter(e => !existingEmits.has(e));
  if (newEmits.length > 0) {
    merged.eventEmitters = [...(staticEvents?.eventEmitters || []), ...newEmits];
  }

  // Agregar listens detectados por LLM
  const existingListens = new Set(staticEvents?.eventListeners || []);
  const newListens = (llmEvents?.listens || []).filter(e => !existingListens.has(e));
  if (newListens.length > 0) {
    merged.eventListeners = [...(staticEvents?.eventListeners || []), ...newListens];
  }

  return merged;
}
