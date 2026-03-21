/**
 * @fileoverview Final payload assembly for canonical database health.
 *
 * This keeps the scoring helper and the public summary separate so the status
 * surface can stay small enough for governance and editing safety.
 *
 * @module shared/compiler/database-health-report
 */

export function buildDatabaseHealthReport({
  counts = {},
  fileUniverse = null,
  systemMapCoverage = null,
  semanticSurface = null,
  assessment = null,
  liveRowSync = null
} = {}) {
  const {
    scannedFiles,
    activeFiles,
    activeAtoms,
    orphanAtoms,
    orphanAtomsMissingScan,
    atomsWithCalls,
    atomsWithCalledBy,
    activeCallRelations,
    activeSharesStateRelations,
    callGraphRows,
    orphanCallRelations,
    contradictoryRiskRows,
    activeRiskRows,
    atomsWithSharedState,
    atomsWithEventEmitters,
    atomsWithEventListeners,
    atomsWithSemanticSignals,
    activeSystemFiles,
    systemFilesWithSemantics,
    activeSemanticConnections
  } = counts || {};

  return {
    healthy: assessment?.healthy,
    healthScore: assessment?.healthScore,
    grade: assessment?.grade,
    summary: assessment?.summary,
    metrics: {
      scannedFiles,
      activeFiles,
      activeAtoms,
      orphanAtoms,
      orphanAtomsMissingScan,
      atomsWithCalls,
      atomsWithCalledBy,
      activeCallRelations,
      activeSharesStateRelations,
      callGraphRows,
      orphanCallRelations,
      contradictoryRiskRows,
      activeRiskRows,
      atomsWithSharedState,
      atomsWithEventEmitters,
      atomsWithEventListeners,
      atomsWithSemanticSignals,
      activeSystemFiles,
      systemFilesWithSemantics,
      activeSemanticConnections,
      liveRowSync,
      fileUniverse,
      systemMapCoverage,
      semanticSurface
    },
    criticalFindings: assessment?.criticalFindings || [],
    warnings: assessment?.warnings || [],
    recommendations: assessment?.recommendations || []
  };
}
