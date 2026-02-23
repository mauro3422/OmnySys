/**
 * @fileoverview orphaned-files.js
 * 
 * Detecta archivos huérfanos con side effects
 * 
 * @module issue-detectors/orphaned-files
 */

/**
 * Verifica si un archivo es huérfano (sin imports ni dependents)
 */
function checkFileOrphanStatus(analysis) {
  return (analysis.imports || []).length === 0 &&
         (analysis.usedBy || []).length === 0;
}

/**
 * Detecta side effects en el archivo
 */
function detectSideEffects(semantic, analysis) {
  const sideEffects = semantic.sideEffects || {};
  const hasCrossFileConnections = (analysis.semanticConnections || []).length > 0;
  
  const hasEvents =
    (semantic.eventPatterns?.eventEmitters?.length || 0) > 0 ||
    (semantic.eventPatterns?.eventListeners?.length || 0) > 0;

  const hasSharedState =
    (semantic.sharedState?.reads?.length || 0) > 0 ||
    (semantic.sharedState?.writes?.length || 0) > 0 ||
    (semantic.sharedState?.readProperties?.length || 0) > 0 ||
    (semantic.sharedState?.writeProperties?.length || 0) > 0;

  return { sideEffects, hasCrossFileConnections, hasEvents, hasSharedState };
}

/**
 * Crea un issue de archivo huérfano
 */
function createOrphanIssue(filePath, type, severity, reason, evidence) {
  return { type, file: filePath, severity, reason, evidence };
}

/**
 * Detecta archivos huérfanos con side effects (alta prioridad)
 * @param {object} enrichedResults - Resultados del análisis enriquecido
 * @returns {Array} - Issues encontrados
 */
export function detectOrphanedFiles(enrichedResults) {
  const issues = [];

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    if (!checkFileOrphanStatus(analysis)) continue;

    const semantic = analysis.semanticAnalysis || {};
    const { sideEffects, hasCrossFileConnections, hasEvents, hasSharedState } = detectSideEffects(semantic, analysis);

    if (sideEffects.hasGlobalAccess && !hasCrossFileConnections) {
      issues.push(createOrphanIssue(
        filePath,
        'orphan-with-global-access',
        'high',
        'File has no imports and no dependents but accesses global state',
        {
          sharedStateWrites: semantic.sharedState?.writes || semantic.sharedState?.writeProperties || [],
          sharedStateReads: semantic.sharedState?.reads || semantic.sharedState?.readProperties || []
        }
      ));
    } else if (sideEffects.usesLocalStorage && !hasCrossFileConnections) {
      issues.push(createOrphanIssue(
        filePath,
        'orphan-with-localstorage',
        'medium',
        'File has no imports/exports but uses localStorage',
        { hasLocalStorage: true }
      ));
    } else if (hasEvents && !hasCrossFileConnections) {
      issues.push(createOrphanIssue(
        filePath,
        'orphan-with-events',
        'medium',
        'File has no imports/exports but emits/listens to events',
        {
          events: {
            emits: semantic.eventPatterns?.eventEmitters || [],
            listens: semantic.eventPatterns?.eventListeners || []
          }
        }
      ));
    }
  }

  return issues;
}
