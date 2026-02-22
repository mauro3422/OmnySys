/**
 * @fileoverview Issue Analyzer - Analiza problemas async
 */

/**
 * Analiza problemas async en un átomo
 * @param {Object} atom - Átomo a analizar
 * @param {Object} asyncInfo - Información async extraída
 * @param {number} minSequentialAwaits - Mínimo de awaits secuenciales para reportar
 * @returns {Array} - Array de issues encontrados
 */
export function analyzeAsyncIssues(atom, asyncInfo, minSequentialAwaits) {
  const issues = [];
  
  if (asyncInfo.sequentialCount >= minSequentialAwaits) {
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'waterfall_awaits',
      risk: asyncInfo.sequentialCount >= 10 ? 'high' : 'medium',
      description: `${asyncInfo.sequentialCount} sequential awaits detected`,
      impact: 'Sequential operations add latency (total time = sum of all operations)',
      suggestion: 'Check if operations are truly dependent; consider Promise.all for independent ops'
    });
  }

  if (asyncInfo.hasPromiseChain && !asyncInfo.hasAwait) {
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'legacy_promise_chain',
      risk: 'low',
      description: 'Uses .then() chains instead of async/await',
      impact: 'Harder to read and debug',
      suggestion: 'Consider refactoring to async/await for better readability'
    });
  }

  // Solo agregar missing_parallelization si NO hay ya un waterfall_awaits para este atom
  // (evita duplicar el mismo problema con dos nombres distintos)
  const alreadyWaterfall = issues.some(i => i.type === 'waterfall_awaits');
  if (!alreadyWaterfall && !asyncInfo.hasPromiseAll && asyncInfo.sequentialCount >= 5) {
    const estimatedSaving = `Potential ~${Math.round((1 - 1/asyncInfo.sequentialCount) * 100)}% time reduction IF operations are truly independent`;
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'missing_parallelization',
      risk: 'low',
      description: `${asyncInfo.sequentialCount} sequential operations — verify if any are independent`,
      impact: estimatedSaving,
      suggestion: 'Review data dependencies between awaits before applying Promise.all'
    });
  }

  if (asyncInfo.hasNewPromise && !asyncInfo.hasAwait) {
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'explicit_promise',
      risk: 'low',
      description: 'Uses explicit new Promise() constructor',
      impact: 'May indicate callback-based code that could be modernized',
      suggestion: 'Consider using util.promisify or async/await'
    });
  }

  // flowAnalysis puede duplicar patrones ya detectados arriba (ej: sequential-awaits vs waterfall_awaits).
  // Solo agregamos issues de flowAnalysis que aporten información nueva no cubierta.
  const COVERED_BY_LOCAL = new Set(['sequential-awaits', 'waterfall', 'missing_parallelization']);
  if (asyncInfo.flowAnalysis?.analyses) {
    for (const analysis of asyncInfo.flowAnalysis.analyses) {
      const alreadyCovered = COVERED_BY_LOCAL.has(analysis.pattern) && issues.length > 0;
      if (analysis.riskLevel === 'high' && !alreadyCovered && !issues.find(i => i.type === analysis.pattern)) {
        issues.push({
          atom: atom.id,
          atomName: atom.name,
          file: atom.filePath,
          line: atom.line,
          type: analysis.pattern,
          risk: analysis.riskLevel,
          description: analysis.concerns?.join('; ') || analysis.pattern,
          impact: analysis.metrics ? JSON.stringify(analysis.metrics) : 'Unknown impact',
          suggestion: analysis.recommendations?.[0] || 'Review async pattern'
        });
      }
    }
  }

  return issues;
}
