/**
 * @fileoverview suspicious-patterns.js
 * 
 * Detecta patrones sospechosos en el código
 * 
 * @module issue-detectors/suspicious-patterns
 */

/**
 * Detecta patrones sospechosos
 * @param {object} enrichedResults - Resultados del análisis enriquecido
 * @returns {Array} - Issues encontrados
 */
export function detectSuspiciousPatterns(enrichedResults) {
  const issues = [];

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const semantic = analysis.semanticAnalysis || {};

    // Patrón 1: Escribe en shared state pero no tiene imports (sospechoso)
    const hasSharedStateWrites = (semantic.sharedState?.writes?.length || 0) > 0;
    const hasNoImports = (analysis.imports || []).length === 0;
    const hasNoUsedBy = (analysis.usedBy || []).length === 0;

    if (hasSharedStateWrites && hasNoImports && !hasNoUsedBy) {
      issues.push({
        type: 'isolated-state-writer',
        file: filePath,
        severity: 'medium',
        reason: 'File writes to global state but has no imports',
        evidence: {
          writes: semantic.sharedState.writes
        },
        suggestion: 'This file may be modifying state without proper initialization'
      });
    }

    // Patrón 2: LLM detectó conexiones con baja confianza
    if (analysis.llmInsights?.confidence < 0.85) {
      issues.push({
        type: 'low-confidence-analysis',
        file: filePath,
        severity: 'low',
        confidence: analysis.llmInsights.confidence,
        reason: 'LLM analysis has low confidence on this file',
        suggestion: 'Manual review recommended'
      });
    }

    // Patrón 3: Muchos side effects diferentes pero con pocas conexiones reales
    const sideEffectCount = Object.values(semantic.sideEffects || {}).filter(Boolean).length;
    const connectionCount =
      (analysis.imports || []).length +
      (analysis.usedBy || []).length +
      (analysis.semanticConnections || []).length +
      (semantic.sharedState?.reads?.length || 0) +
      (semantic.sharedState?.writes?.length || 0) +
      (semantic.sharedState?.readProperties?.length || 0) +
      (semantic.sharedState?.writeProperties?.length || 0) +
      (semantic.eventPatterns?.eventEmitters?.length || 0) +
      (semantic.eventPatterns?.eventListeners?.length || 0);
    const weaklyConnected = connectionCount <= 1;

    if (sideEffectCount >= 4 && weaklyConnected) {
      issues.push({
        type: 'many-side-effects',
        file: filePath,
        severity: 'medium',
        sideEffectCount,
        reason: 'File has many side effects but very few connections (suspiciously isolated)',
        evidence: {
          ...semantic.sideEffects,
          connectionCount
        },
        suggestion: 'Consider splitting responsibilities'
      });
    }
  }

  return issues;
}
