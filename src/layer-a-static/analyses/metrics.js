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
  // Scoring (0-100)
  let score = 100;

  // Penalties (destructuring de analyses precalculados)
  if (analyses.unusedExports.totalUnused > 0)
    score -= Math.min(20, analyses.unusedExports.totalUnused);
  if (analyses.orphanFiles.deadCodeCount > 0)
    score -= Math.min(15, analyses.orphanFiles.deadCodeCount * 5);
  if (analyses.hotspots.criticalCount > 0)
    score -= Math.min(25, analyses.hotspots.criticalCount * 10);
  // Circular function deps: penalizar solo si es excesivo (>10)
  // La mayoría son funciones recursivas legítimas (DFS, traversal)
  if (analyses.circularFunctionDeps.total > 10)
    score -= Math.min(15, (analyses.circularFunctionDeps.total - 10) * 5);
  if (analyses.deepDependencyChains.totalDeepChains > 0)
    score -= Math.min(20, analyses.deepDependencyChains.totalDeepChains * 2);
  if (analyses.couplingAnalysis.concern === 'HIGH') score -= 15;
  // Penalizar imports problemáticos
  if (analyses.unresolvedImports.total > 0)
    score -= Math.min(25, analyses.unresolvedImports.total * 5);
  // Solo penalizar ciclos problemáticos (no los arquitectónicamente válidos)
  const problematicCycles = analyses.circularImports.problematicCount || 0;
  if (problematicCycles > 0)
    score -= Math.min(20, problematicCycles * 10);
  if (analyses.unusedImports.total > 0)
    score -= Math.min(15, Math.ceil(analyses.unusedImports.total / 2));

  // TIER 3: Penalizar estado compartido mutable y high-risk types/constants
  if (analyses.sharedObjects && analyses.sharedObjects.criticalObjects.length > 0)
    score -= Math.min(20, analyses.sharedObjects.criticalObjects.length * 10);
  if (analyses.typeUsage && analyses.typeUsage.highRiskCount > 0)
    score -= Math.min(10, analyses.typeUsage.highRiskCount * 2);
  if (analyses.constantUsage && analyses.constantUsage.hotspotConstants.length > 0)
    score -= Math.min(10, analyses.constantUsage.hotspotConstants.length * 2);
  if (analyses.enumUsage && analyses.enumUsage.highRiskCount > 0)
    score -= Math.min(10, analyses.enumUsage.highRiskCount * 2);

  score = Math.max(0, Math.min(100, score));

  const grade =
    score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';

  return {
    score: score,
    grade: grade,
    totalIssues:
      analyses.unusedExports.totalUnused +
      analyses.orphanFiles.total +
      analyses.hotspots.total +
      analyses.circularFunctionDeps.total +
      analyses.unresolvedImports.total +
      (analyses.circularImports.problematicCount || 0) +
      analyses.unusedImports.total +
      (analyses.sharedObjects?.criticalObjects.length || 0) +
      (analyses.typeUsage?.highRiskCount || 0) +
      (analyses.constantUsage?.hotspotConstants.length || 0) +
      (analyses.enumUsage?.highRiskCount || 0),
    breakdown: {
      unusedExports: analyses.unusedExports.totalUnused,
      orphanFiles: analyses.orphanFiles.deadCodeCount,
      hotspots: analyses.hotspots.criticalCount,
      circularDeps: analyses.circularFunctionDeps.total,
      deepChains: analyses.deepDependencyChains.totalDeepChains,
      coupling: analyses.couplingAnalysis.total,
      unresolvedImports: analyses.unresolvedImports.total,
      circularImports: analyses.circularImports.total,
      unusedImports: analyses.unusedImports.total,
      reexportChains: analyses.reexportChains.total,
      // TIER 3
      sharedObjects: analyses.sharedObjects?.criticalObjects.length || 0,
      highRiskTypes: analyses.typeUsage?.highRiskCount || 0,
      hotspotConstants: analyses.constantUsage?.hotspotConstants.length || 0,
      highRiskEnums: analyses.enumUsage?.highRiskCount || 0
    }
  };
}
