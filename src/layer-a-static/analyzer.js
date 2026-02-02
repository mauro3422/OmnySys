/**
 * Analyzer - Orquestador de análisis automático
 *
 * Responsabilidad:
 * - Coordinar todos los análisis de código (Tier 1, 2 y 3)
 * - Calcular métricas y generar recomendaciones
 * - Retornar reporte completo
 *
 * PRINCIPIO: Single Responsibility - solo orquesta, no analiza
 */

import * as tier1 from './analyses/tier1/index.js';
import * as tier2 from './analyses/tier2/index.js';
import * as tier3 from './analyses/tier3/index.js';
import { calculateQualityMetrics } from './analyses/metrics.js';
import { generateRecommendations } from './analyses/recommendations.js';

/**
 * Genera reporte completo de análisis
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte con todos los análisis
 */
export function generateAnalysisReport(systemMap) {
  // Ejecutar todos los análisis
  const analyses = {
    // Tier 1: Análisis básicos
    unusedExports: tier1.findUnusedExports(systemMap),
    orphanFiles: tier1.findOrphanFiles(systemMap),
    hotspots: tier1.findHotspots(systemMap),
    circularFunctionDeps: tier1.findCircularFunctionDeps(systemMap),
    deepDependencyChains: tier1.findDeepDependencyChains(systemMap),

    // Tier 2: Análisis avanzados
    sideEffectMarkers: tier2.detectSideEffectMarkers(systemMap),
    reachabilityAnalysis: tier2.analyzeReachability(systemMap),
    couplingAnalysis: tier2.analyzeCoupling(systemMap),
    unresolvedImports: tier2.findUnresolvedImports(systemMap),
    circularImports: tier2.findCircularImports(systemMap),
    unusedImports: tier2.findUnusedImports(systemMap),
    reexportChains: tier2.analyzeReexportChains(systemMap),

    // Tier 3: Deep static analysis (types, constants, objects, enums)
    typeUsage: tier3.analyzeTypeUsage(systemMap),
    constantUsage: tier3.analyzeConstantUsage(systemMap),
    sharedObjects: tier3.analyzeSharedObjects(systemMap),
    enumUsage: tier3.analyzeEnumUsage(systemMap)
  };

  // Calcular métricas y recomendaciones
  const qualityMetrics = calculateQualityMetrics(analyses);
  const recommendations = generateRecommendations(analyses);

  // Retornar reporte completo
  return {
    metadata: systemMap.metadata,
    ...analyses,
    qualityMetrics: qualityMetrics,
    recommendations: recommendations
  };
}
