/**
 * Quality Metrics Calculator
 *
 * Responsabilidad:
 * - Calcular métricas de calidad general del código
 * - Generar score (0-100) y grade (A-F)
 *
 * NOTA: Se llama DENTRO de generateAnalysisReport, no puede llamar a generateAnalysisReport
 *
 * @param {object} analyses - Resultados de todos los análisis
 * @returns {object} - Métricas de calidad
 */
export function calculateQualityMetrics(analyses) {
  let score = 100;

  // Extract each penalty to a separate function for lower complexity
  score -= calculateUnusedExportsPenalty(analyses.unusedExports);
  score -= calculateDeadCodePenalty(analyses.orphanFiles);
  score -= calculateHotspotsPenalty(analyses.hotspots);
  score -= calculateCircularFunctionPenalty(analyses.circularFunctionDeps);
  score -= calculateDeepChainsPenalty(analyses.deepDependencyChains);
  score -= calculateCouplingPenalty(analyses.couplingAnalysis);
  score -= calculateUnresolvedImportsPenalty(analyses.unresolvedImports);
  score -= calculateCircularImportsPenalty(analyses.circularImports);
  score -= calculateUnusedImportsPenalty(analyses.unusedImports);
  score -= calculateSharedObjectsPenalty(analyses.sharedObjects);
  score -= calculateTypeUsagePenalty(analyses.typeUsage);
  score -= calculateConstantUsagePenalty(analyses.constantUsage);
  score -= calculateEnumUsagePenalty(analyses.enumUsage);

  score = Math.max(0, Math.min(100, score));

  const grade = score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';

  return buildMetricsResult(analyses, score, grade);
}

function calculateUnusedExportsPenalty(unusedExports) {
  return Math.min(20, unusedExports.totalUnused || 0);
}

function calculateDeadCodePenalty(orphanFiles) {
  return Math.min(15, (orphanFiles.deadCodeCount || 0) * 5);
}

function calculateHotspotsPenalty(hotspots) {
  return Math.min(25, (hotspots.criticalCount || 0) * 10);
}

function calculateCircularFunctionPenalty(circularFunctionDeps) {
  const problematicCount = circularFunctionDeps?.problematicCount || 0;
  return Math.min(15, problematicCount * 5);
}

function calculateDeepChainsPenalty(deepDependencyChains) {
  return Math.min(20, (deepDependencyChains.totalDeepChains || 0) * 2);
}

function calculateCouplingPenalty(couplingAnalysis) {
  return couplingAnalysis?.concern === 'HIGH' ? 15 : 0;
}

function calculateUnresolvedImportsPenalty(unresolvedImports) {
  return Math.min(25, (unresolvedImports.total || 0) * 5);
}

function calculateCircularImportsPenalty(circularImports) {
  const problematicCount = circularImports?.problematicCount || 0;
  return Math.min(20, problematicCount * 10);
}

function calculateUnusedImportsPenalty(unusedImports) {
  return Math.min(15, Math.ceil((unusedImports.total || 0) / 2));
}

function calculateSharedObjectsPenalty(sharedObjects) {
  if (!sharedObjects) return 0;
  return Math.min(20, (sharedObjects.criticalObjects?.length || 0) * 10);
}

function calculateTypeUsagePenalty(typeUsage) {
  if (!typeUsage) return 0;
  return Math.min(10, (typeUsage.highRiskCount || 0) * 2);
}

function calculateConstantUsagePenalty(constantUsage) {
  if (!constantUsage) return 0;
  return Math.min(10, (constantUsage.hotspotConstants?.length || 0) * 2);
}

function calculateEnumUsagePenalty(enumUsage) {
  if (!enumUsage) return 0;
  return Math.min(10, (enumUsage.highRiskCount || 0) * 2);
}

function buildMetricsResult(analyses, score, grade) {
  return {
    score,
    grade,
    totalIssues: sumTotalIssues(analyses),
    breakdown: {
      unusedExports: analyses.unusedExports.totalUnused,
      orphanFiles: analyses.orphanFiles.deadCodeCount,
      hotspots: analyses.hotspots.criticalCount,
      circularDeps: analyses.circularFunctionDeps?.problematicCount || 0,
      deepChains: analyses.deepDependencyChains.totalDeepChains,
      coupling: analyses.couplingAnalysis.total,
      unresolvedImports: analyses.unresolvedImports.total,
      circularImports: analyses.circularImports.total,
      unusedImports: analyses.unusedImports.total,
      reexportChains: analyses.reexportChains.total,
      sharedObjects: analyses.sharedObjects?.criticalObjects?.length || 0,
      highRiskTypes: analyses.typeUsage?.highRiskCount || 0,
      hotspotConstants: analyses.constantUsage?.hotspotConstants?.length || 0,
      highRiskEnums: analyses.enumUsage?.highRiskCount || 0
    }
  };
}

function sumTotalIssues(analyses) {
  return (analyses.unusedExports.totalUnused || 0) +
    (analyses.orphanFiles.total || 0) +
    (analyses.hotspots.total || 0) +
    (analyses.circularFunctionDeps?.problematicCount || 0) +
    (analyses.unresolvedImports.total || 0) +
    (analyses.circularImports?.problematicCount || 0) +
    (analyses.unusedImports.total || 0) +
    (analyses.sharedObjects?.criticalObjects?.length || 0) +
    (analyses.typeUsage?.highRiskCount || 0) +
    (analyses.constantUsage?.hotspotConstants?.length || 0) +
    (analyses.enumUsage?.highRiskCount || 0);
}
