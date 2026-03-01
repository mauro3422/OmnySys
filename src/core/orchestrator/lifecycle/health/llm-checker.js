// LLM health checker desactivado — LLM no se usa en esta versión.
// Los insights se derivan estáticamente desde átomos en _deriveStaticInsights().

/**
 * Inicia el health checker para análisis LLM (actualmente desactivado).
 * Setea _llmHealthRunning = true para indicar que el checker está activo.
 * @this {{ _llmHealthRunning?: boolean, _llmAnalysisTriggered?: boolean }}
 */
export function _startLLMHealthChecker() {
  // Setear flag para indicar que el checker está corriendo (aunque esté desactivado)
  if (this) {
    this._llmHealthRunning = true;
  }
  // No-op: LLM desactivado - no agenda ningún setTimeout
}
