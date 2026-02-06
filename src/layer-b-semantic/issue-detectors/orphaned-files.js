/**
 * @fileoverview orphaned-files.js
 * 
 * Detecta archivos huérfanos con side effects
 * 
 * @module issue-detectors/orphaned-files
 */

/**
 * Detecta archivos huérfanos con side effects (alta prioridad)
 * @param {object} enrichedResults - Resultados del análisis enriquecido
 * @returns {Array} - Issues encontrados
 */
export function detectOrphanedFiles(enrichedResults) {
  const issues = [];

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const isOrphan =
      (analysis.imports || []).length === 0 &&
      (analysis.usedBy || []).length === 0;

    if (!isOrphan) continue;

    const semantic = analysis.semanticAnalysis || {};
    const sideEffects = semantic.sideEffects || {};
    const hasSemanticConnections =
      (analysis.semanticConnections || []).length > 0 ||
      (semantic.sharedState?.reads?.length || 0) > 0 ||
      (semantic.sharedState?.writes?.length || 0) > 0 ||
      (semantic.sharedState?.readProperties?.length || 0) > 0 ||
      (semantic.sharedState?.writeProperties?.length || 0) > 0 ||
      (semantic.eventPatterns?.eventEmitters?.length || 0) > 0 ||
      (semantic.eventPatterns?.eventListeners?.length || 0) > 0;

    // Casos sospechosos
    if (sideEffects.hasGlobalAccess && !hasSemanticConnections) {
      issues.push({
        type: 'orphan-with-global-access',
        file: filePath,
        severity: 'high',
        reason: 'File has no imports and no dependents but accesses global state',
        evidence: {
          sharedStateWrites: semantic.sharedState?.writes || semantic.sharedState?.writeProperties || [],
          sharedStateReads: semantic.sharedState?.reads || semantic.sharedState?.readProperties || []
        }
      });
    } else if (sideEffects.usesLocalStorage && !hasSemanticConnections) {
      issues.push({
        type: 'orphan-with-localstorage',
        file: filePath,
        severity: 'medium',
        reason: 'File has no imports/exports but uses localStorage',
        evidence: {
          hasLocalStorage: true
        }
      });
    } else if (semantic.eventPatterns) {
      const hasEvents =
        (semantic.eventPatterns.eventEmitters || []).length > 0 ||
        (semantic.eventPatterns.eventListeners || []).length > 0;

      if (hasEvents && !hasSemanticConnections) {
        issues.push({
          type: 'orphan-with-events',
          file: filePath,
          severity: 'medium',
          reason: 'File has no imports/exports but emits/listens to events',
          evidence: {
            events: {
              emits: semantic.eventPatterns.eventEmitters || [],
              listens: semantic.eventPatterns.eventListeners || []
            }
          }
        });
      }
    }
  }

  return issues;
}
