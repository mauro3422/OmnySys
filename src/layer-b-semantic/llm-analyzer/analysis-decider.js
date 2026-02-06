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
 * ESTRATEGIA OPTIMIZADA v0.6:
 * - NO gastar LLM si las conexiones estáticas ya cubrieron el caso
 * - SÍ analizar solo cuando hay eventos/state NO resueltos por Layer A
 * - SÍ analizar código dinámico (no se puede resolver estáticamente)
 * - SÍ analizar archivos huérfanos sin explicación
 *
 * @param {object} semanticAnalysis - Resultados del análisis semántico (staticAnalysis)
 * @param {object} fileAnalysis - Info completa del archivo (imports, usedBy, semanticConnections)
 * @param {number} confidenceThreshold - Umbral de confianza (default 0.7)
 * @returns {boolean} - true si necesita análisis LLM
 */
export function needsLLMAnalysis(semanticAnalysis, fileAnalysis = null, confidenceThreshold = 0.7) {
  // Sin fileAnalysis, no podemos determinar si las conexiones están resueltas
  if (!fileAnalysis) {
    return true; // Fallback seguro
  }

  // 1. Huérfano sin explicación -> SÍ LLM
  if (isOrphanWithNoConnections(fileAnalysis)) {
    return true;
  }

  // 2. Dynamic imports/eval -> SÍ LLM (no se puede resolver estáticamente)
  if (hasDynamicCode(semanticAnalysis)) {
    return true;
  }

  // 3. Eventos: solo si hay eventos NO resueltos por conexiones estáticas
  if (hasUnresolvedEvents(fileAnalysis)) {
    return true;
  }

  // 4. Shared state: solo si hay state NO cruzado estáticamente
  if (hasUnresolvedSharedState(fileAnalysis)) {
    return true;
  }

  // 5. Conexiones de baja confianza -> SÍ LLM
  if (hasLowConfidenceConnections(fileAnalysis, confidenceThreshold)) {
    return true;
  }

  // Si llegamos aquí, Layer A ya cubrió todas las conexiones
  return false;
}

/**
 * Verifica si un archivo es huérfano sin ninguna conexión detectada
 */
function isOrphanWithNoConnections(fileAnalysis) {
  const hasImports = (fileAnalysis.imports || []).length > 0;
  const hasUsedBy = (fileAnalysis.usedBy || []).length > 0;
  const hasSemanticConnections = (fileAnalysis.semanticConnections || []).length > 0;
  return !hasImports && !hasUsedBy && !hasSemanticConnections;
}

/**
 * Verifica si tiene código dinámico que no se puede analizar estáticamente
 */
function hasDynamicCode(semanticAnalysis) {
  return semanticAnalysis.hasDynamicImports ||
         semanticAnalysis.hasEval ||
         (semanticAnalysis.dynamicImports && semanticAnalysis.dynamicImports.length > 0) ||
         semanticAnalysis.sideEffects?.some(
           effect => effect.includes('dynamic') || effect.includes('eval')
         );
}

/**
 * Verifica si hay eventos que NO fueron resueltos por conexiones estáticas
 */
function hasUnresolvedEvents(fileAnalysis) {
  const semanticAnalysis = fileAnalysis.semanticAnalysis || fileAnalysis;

  // Obtener todos los eventos detectados
  const eventNames = semanticAnalysis.events?.all || [];

  // Obtener eventos ya resueltos con confidence >= 1.0
  const resolvedEvents = (fileAnalysis.semanticConnections || [])
    .filter(c => c.type === 'eventListener' && c.confidence >= 1.0)
    .map(c => c.event || c.via);

  // Si hay eventos que NO tienen conexión estática resuelta
  return eventNames.some(e => {
    const eventName = e.event || e;
    return !resolvedEvents.includes(eventName);
  });
}

/**
 * Verifica si hay shared state que NO fue resuelto por conexiones estáticas
 */
function hasUnresolvedSharedState(fileAnalysis) {
  const semanticAnalysis = fileAnalysis.semanticAnalysis || fileAnalysis;

  // Obtener keys de localStorage y globals detectados
  const storageKeys = semanticAnalysis.localStorage?.all || [];
  const globalAccess = semanticAnalysis.globals?.all || [];

  // Obtener conexiones ya resueltas con confidence >= 1.0
  const resolvedConnections = (fileAnalysis.semanticConnections || [])
    .filter(c => (c.type === 'localStorage' || c.type === 'globalVariable') && c.confidence >= 1.0);

  const resolvedKeys = resolvedConnections.map(c => c.key || c.property || c.via);

  // Verificar si hay storage/globals sin resolver
  const unresolvedStorage = storageKeys.some(s => {
    const key = s.key || s;
    return !resolvedKeys.includes(key);
  });

  const unresolvedGlobals = globalAccess.some(g => {
    const prop = g.property || g;
    return !resolvedKeys.includes(prop);
  });

  return unresolvedStorage || unresolvedGlobals;
}

/**
 * Verifica si hay conexiones de baja confianza que necesitan análisis LLM
 */
function hasLowConfidenceConnections(fileAnalysis, threshold = 0.7) {
  return (fileAnalysis.semanticConnections || []).some(c => c.confidence < threshold);
}
