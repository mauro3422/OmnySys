/**
 * Determina si un archivo necesita LLM basado en arquetipos y Gates de decisión
 * 
 * GATE 1: Verificar arquetipos con requiresLLM = true (siempre necesitan LLM)
 * GATE 2: Verificar arquetipos con requiresLLM = 'conditional' (usar analysis-decider)
 * GATE 3: Arquetipos con requiresLLM = false (nunca necesitan LLM)
 * GATE 4: Fallback a analysis-decider si no hay arquetipos determinísticos
 * 
 * @param {Array} archetypes - Arquetipos detectados
 * @param {Object} fileAnalysis - Análisis del archivo
 * @param {Object} llmAnalyzer - Instancia del analizador LLM
 * @returns {boolean} - true si necesita LLM
 */
export function shouldUseLLM(archetypes, fileAnalysis, llmAnalyzer) {
  // Si no hay arquetipos, usar analysis-decider como fallback
  if (!archetypes || archetypes.length === 0) {
    return llmAnalyzer.needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
  }

  // GATE 1: Si hay arquetipos que SIEMPRE requieren LLM
  const alwaysNeedsLLM = archetypes.some(a => a.requiresLLM === true);
  if (alwaysNeedsLLM) {
    return true;
  }

  // GATE 2: Si hay arquetipos condicionales, verificar con analysis-decider
  const hasConditional = archetypes.some(a => a.requiresLLM === 'conditional');
  if (hasConditional) {
    return llmAnalyzer.needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
  }

  // GATE 3: Si todos los arquetipos tienen requiresLLM = false, NO necesita LLM
  const allBypass = archetypes.every(a => a.requiresLLM === false);
  if (allBypass) {
    return false;
  }

  // Fallback: usar analysis-decider para casos mixtos
  return llmAnalyzer.needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
}

/**
 * Decide si necesita LLM basado en datos de átomos (v0.9.37)
 * @param {Object} fileAnalysis - Análisis del archivo
 * @param {Object} atomDecider - Módulo atom-decider
 * @returns {Object} Decisión con { decided, needsLLM, fileArchetype, reason }
 */
export function decideFromAtoms(fileAnalysis, atomDecider) {
  return atomDecider.decideFromAtoms(fileAnalysis);
}
