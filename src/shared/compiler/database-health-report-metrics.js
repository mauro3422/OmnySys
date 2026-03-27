export function buildDatabaseHealthMetrics({
  counts = {},
  fileUniverse = null,
  systemMapCoverage = null,
  semanticSurface = null,
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
  };
}
