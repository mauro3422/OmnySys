/**
 * Recommendations Generator
 *
 * Responsabilidad:
 * - Generar recomendaciones basadas en análisis precalculados
 * - Priorizar y categorizar sugerencias
 *
 * NOTA: Recibe analyses como parámetro, no llama a generateAnalysisReport
 *
 * @param {object} analyses - Resultados de todos los análisis
 * @returns {object} - Recomendaciones priorizadas
 */
export function generateRecommendations(analyses) {
  const recommendations = [];

  // Recomendación 1: Código muerto
  if (analyses.unusedExports.totalUnused > 3) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Dead Code',
      message: `Remove ${analyses.unusedExports.totalUnused} unused exports to reduce tunnel vision`,
      action: 'Review and delete unused functions'
    });
  }

  // Recomendación 2: Archivos huérfanos
  if (analyses.orphanFiles.deadCodeCount > 2) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Dead Code',
      message: `Found ${analyses.orphanFiles.deadCodeCount} orphan files - potential dead code`,
      action: 'Link or remove orphan files'
    });
  }

  // Recomendación 3: Hotspots críticos
  if (analyses.hotspots.criticalCount > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Risk Management',
      message: `${analyses.hotspots.criticalCount} critical hotspot(s) - very risky to modify`,
      action: 'Add comprehensive tests before editing hotspots'
    });
  }

  // Recomendación 4: Ciclos
  if (analyses.circularFunctionDeps.total > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Architecture',
      message: `${analyses.circularFunctionDeps.total} circular dependency(ies) - can cause runtime errors`,
      action: 'Refactor to break circular dependencies'
    });
  }

  // Recomendación 5: Cadenas profundas
  if (analyses.deepDependencyChains.totalDeepChains > 2) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Quality',
      message: `${analyses.deepDependencyChains.totalDeepChains} deep dependency chains detected`,
      action: 'Consider refactoring to reduce coupling'
    });
  }

  // Recomendación 6: Acoplamiento
  if (analyses.couplingAnalysis.concern === 'HIGH') {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Quality',
      message: `High coupling between ${analyses.couplingAnalysis.total} file pairs`,
      action: 'Extract common functionality or apply dependency injection'
    });
  }

  // Recomendación 7: Reachability
  const reach = analyses.reachabilityAnalysis;
  if (parseFloat(reach.reachablePercent) < 70) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Health',
      message: `Only ${reach.reachablePercent}% of code is reachable from entry points`,
      action: 'Remove unreachable code or link it to entry points'
    });
  }

  // Recomendación 8: Imports no resueltos (NUEVOS)
  if (analyses.unresolvedImports.total > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Broken Code',
      message: `${analyses.unresolvedImports.total} unresolved import(s) - may break at runtime`,
      action: 'Fix missing files or incorrect paths in imports'
    });
  }

  // Recomendación 8.5: Circular imports (NUEVOS)
  if (analyses.circularImports.total > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Architecture',
      message: `${analyses.circularImports.total} circular import(s) detected - breaks module loading`,
      action: 'Refactor to break circular dependencies (move shared code to utility)'
    });
  }

  // Recomendación 9: Imports sin usar (NUEVOS)
  if (analyses.unusedImports.total > 5) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Code Cleanup',
      message: `${analyses.unusedImports.total} unused import(s) - adds confusion`,
      action: 'Remove unused imports to reduce cognitive load for AI'
    });
  } else if (analyses.unusedImports.total > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Cleanup',
      message: `${analyses.unusedImports.total} unused import(s) - adds confusion`,
      action: 'Remove unused imports to reduce cognitive load for AI'
    });
  }

  // Recomendación 10: Cadenas de re-exports
  if (analyses.reexportChains.total > 2) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Architecture',
      message: `${analyses.reexportChains.total} complex re-export chain(s) found`,
      action: 'Simplify re-export chains or add comments explaining the flow'
    });
  }

  // TIER 3 RECOMMENDATIONS

  // Recomendación 11: Shared mutable objects
  if (analyses.sharedObjects && analyses.sharedObjects.criticalObjects.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Shared State',
      message: `${analyses.sharedObjects.criticalObjects.length} mutable object(s) shared across files - HIGH risk of bugs`,
      action: 'Refactor to immutable patterns, use state management library, or add clear documentation'
    });
  }

  // Recomendación 12: High-risk types/interfaces
  if (analyses.typeUsage && analyses.typeUsage.highRiskCount > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Type Safety',
      message: `${analyses.typeUsage.highRiskCount} TypeScript type(s)/interface(s) used in many files`,
      action: 'Review all usages before modifying these types - breaking changes affect many files'
    });
  }

  // Recomendación 13: Hotspot constants
  if (analyses.constantUsage && analyses.constantUsage.hotspotConstants.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Configuration',
      message: `${analyses.constantUsage.hotspotConstants.length} constant(s) heavily used across the project`,
      action: 'Changing these constants has wide impact - ensure thorough testing'
    });
  }

  // Recomendación 14: High-risk enums
  if (analyses.enumUsage && analyses.enumUsage.highRiskCount > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Type Safety',
      message: `${analyses.enumUsage.highRiskCount} enum(s) widely used across files`,
      action: 'Adding/removing enum values requires reviewing all usages'
    });
  }

  return {
    total: recommendations.length,
    byPriority: {
      CRITICAL: recommendations.filter(r => r.priority === 'CRITICAL').length,
      HIGH: recommendations.filter(r => r.priority === 'HIGH').length,
      MEDIUM: recommendations.filter(r => r.priority === 'MEDIUM').length,
      LOW: recommendations.filter(r => r.priority === 'LOW').length
    },
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
  };
}
