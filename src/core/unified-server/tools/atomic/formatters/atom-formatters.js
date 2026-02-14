/**
 * @fileoverview Atom Formatters - Formateo de datos atómicos
 * 
 * @module atomic/formatters
 */

/**
 * Formatea datos básicos del átomo
 * @param {Object} atom - Átomo a formatear
 * @returns {Object} Datos formateados
 */
export function formatAtomBasic(atom) {
  return {
    id: atom.id,
    name: atom.name,
    type: 'atom',
    line: atom.line,
    linesOfCode: atom.linesOfCode,
    complexity: atom.complexity,
    isExported: atom.isExported,
    isAsync: atom.isAsync
  };
}

/**
 * Formatea información de side effects
 * @param {Object} atom - Átomo con side effects
 * @returns {Object} Side effects formateados
 */
export function formatSideEffects(atom) {
  return {
    hasNetworkCalls: atom.hasNetworkCalls,
    hasDomManipulation: atom.hasDomManipulation,
    hasStorageAccess: atom.hasStorageAccess,
    hasLogging: atom.hasLogging,
    networkEndpoints: atom.networkEndpoints
  };
}

/**
 * Formatea call graph
 * @param {Object} atom - Átomo con call graph
 * @returns {Object} Call graph formateado
 */
export function formatCallGraph(atom) {
  return {
    calls: atom.calls?.length || 0,
    externalCalls: atom.externalCallCount,
    calledBy: atom.calledBy?.length || 0,
    callers: atom.calledBy || []
  };
}

/**
 * Formatea métricas de calidad
 * @param {Object} atom - Átomo a formatear
 * @returns {Object} Métricas de calidad
 */
export function formatQualityMetrics(atom) {
  return {
    hasErrorHandling: atom.hasErrorHandling,
    hasNestedLoops: atom.hasNestedLoops,
    hasBlockingOps: atom.hasBlockingOps
  };
}

/**
 * Formatea resumen de función para listados
 * @param {Object} atom - Átomo a formatear
 * @returns {Object} Resumen formateado
 */
export function formatFunctionSummary(atom) {
  return {
    name: atom.name,
    line: atom.line,
    complexity: atom.complexity,
    calledBy: atom.calledBy?.length || 0
  };
}

/**
 * Formatea insights del archivo
 * @param {Object} data - Datos del análisis
 * @returns {Object} Insights formateados
 */
export function formatInsights(data) {
  return {
    hasDeadCode: data.stats.deadAtoms > 0,
    hasHotPaths: data.stats.hotPathAtoms > 0,
    hasFragileNetwork: data.stats.fragileNetworkAtoms > 0,
    riskLevel: data.derived?.archetype?.severity > 7 ? 'high' :
               data.derived?.archetype?.severity > 4 ? 'medium' : 'low'
  };
}
