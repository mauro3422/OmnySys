function addRecommendation(recommendations, condition, item) {
  if (condition) {
    recommendations.push(item);
  }
}

function collectCoreRecommendations(analyses, recommendations) {
  addRecommendation(recommendations, analyses.unusedExports.totalUnused > 3, {
    priority: 'HIGH',
    category: 'Dead Code',
    message: `Remove ${analyses.unusedExports.totalUnused} unused exports to reduce tunnel vision`,
    action: 'Review and delete unused functions'
  });

  addRecommendation(recommendations, analyses.orphanFiles.deadCodeCount > 2, {
    priority: 'HIGH',
    category: 'Dead Code',
    message: `Found ${analyses.orphanFiles.deadCodeCount} orphan files - potential dead code`,
    action: 'Link or remove orphan files'
  });

  addRecommendation(recommendations, analyses.hotspots.criticalCount > 0, {
    priority: 'CRITICAL',
    category: 'Risk Management',
    message: `${analyses.hotspots.criticalCount} critical hotspot(s) - very risky to modify`,
    action: 'Add comprehensive tests before editing hotspots'
  });

  addRecommendation(recommendations, analyses.circularFunctionDeps.total > 0, {
    priority: 'HIGH',
    category: 'Architecture',
    message: `${analyses.circularFunctionDeps.total} circular dependency(ies) - can cause runtime errors`,
    action: 'Refactor to break circular dependencies'
  });

  addRecommendation(recommendations, analyses.deepDependencyChains.totalDeepChains > 2, {
    priority: 'MEDIUM',
    category: 'Code Quality',
    message: `${analyses.deepDependencyChains.totalDeepChains} deep dependency chains detected`,
    action: 'Consider refactoring to reduce coupling'
  });

  addRecommendation(recommendations, analyses.couplingAnalysis.concern === 'HIGH', {
    priority: 'MEDIUM',
    category: 'Code Quality',
    message: `High coupling between ${analyses.couplingAnalysis.total} file pairs`,
    action: 'Extract common functionality or apply dependency injection'
  });

  const reach = analyses.reachabilityAnalysis;
  addRecommendation(recommendations, parseFloat(reach.reachablePercent) < 70, {
    priority: 'MEDIUM',
    category: 'Code Health',
    message: `Only ${reach.reachablePercent}% of code is reachable from entry points`,
    action: 'Remove unreachable code or link it to entry points'
  });

  addRecommendation(recommendations, analyses.unresolvedImports.total > 0, {
    priority: 'CRITICAL',
    category: 'Broken Code',
    message: `${analyses.unresolvedImports.total} unresolved import(s) - may break at runtime`,
    action: 'Fix missing files or incorrect paths in imports'
  });

  addRecommendation(recommendations, analyses.circularImports.problematicCount > 0, {
    priority: 'CRITICAL',
    category: 'Architecture',
    message: `${analyses.circularImports.problematicCount} ciclos problemáticos detectados`,
    action: 'Refactorizar usando arquitectura hexagonal o inyección de dependencias'
  });

  addRecommendation(recommendations, analyses.circularImports.validCount > 0, {
    priority: 'INFO',
    category: 'Architecture',
    message: `${analyses.circularImports.validCount} ciclos arquitectónicamente válidos (eventos, WebSocket, lifecycle)`,
    action: 'No requieren cambios - son patrones intencionales'
  });

  const unusedImports = analyses.unusedImports.total;
  if (unusedImports > 5) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Code Cleanup',
      message: `${unusedImports} unused import(s) - adds confusion`,
      action: 'Remove unused imports to reduce cognitive load for AI'
    });
  } else if (unusedImports > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Cleanup',
      message: `${unusedImports} unused import(s) - adds confusion`,
      action: 'Remove unused imports to reduce cognitive load for AI'
    });
  }

  addRecommendation(recommendations, analyses.reexportChains.total > 2, {
    priority: 'MEDIUM',
    category: 'Architecture',
    message: `${analyses.reexportChains.total} complex re-export chain(s) found`,
    action: 'Simplify re-export chains or add comments explaining the flow'
  });
}

function collectTierThreeRecommendations(analyses, recommendations) {
  addRecommendation(recommendations, analyses.sharedObjects && analyses.sharedObjects.criticalObjects.length > 0, {
    priority: 'CRITICAL',
    category: 'Shared State',
    message: `${analyses.sharedObjects.criticalObjects.length} mutable object(s) shared across files - HIGH risk of bugs`,
    action: 'Refactor to immutable patterns, use state management library, or add clear documentation'
  });

  addRecommendation(recommendations, analyses.typeUsage && analyses.typeUsage.highRiskCount > 0, {
    priority: 'HIGH',
    category: 'Type Safety',
    message: `${analyses.typeUsage.highRiskCount} TypeScript type(s)/interface(s) used in many files`,
    action: 'Review all usages before modifying these types - breaking changes affect many files'
  });

  addRecommendation(recommendations, analyses.constantUsage && analyses.constantUsage.hotspotConstants.length > 0, {
    priority: 'HIGH',
    category: 'Configuration',
    message: `${analyses.constantUsage.hotspotConstants.length} constant(s) heavily used across the project`,
    action: 'Changing these constants has wide impact - ensure thorough testing'
  });

  addRecommendation(recommendations, analyses.enumUsage && analyses.enumUsage.highRiskCount > 0, {
    priority: 'HIGH',
    category: 'Type Safety',
    message: `${analyses.enumUsage.highRiskCount} enum(s) widely used across files`,
    action: 'Adding/removing enum values requires reviewing all usages'
  });
}

function summarizeRecommendations(recommendations) {
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  return {
    total: recommendations.length,
    byPriority: {
      CRITICAL: recommendations.filter(r => r.priority === 'CRITICAL').length,
      HIGH: recommendations.filter(r => r.priority === 'HIGH').length,
      MEDIUM: recommendations.filter(r => r.priority === 'MEDIUM').length,
      LOW: recommendations.filter(r => r.priority === 'LOW').length
    },
    recommendations: recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  };
}

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
  collectCoreRecommendations(analyses, recommendations);
  collectTierThreeRecommendations(analyses, recommendations);
  return summarizeRecommendations(recommendations);
}
