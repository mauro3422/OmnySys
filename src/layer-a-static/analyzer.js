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

import path from 'path';
import * as tier1 from './analyses/tier1/index.js';
import * as tier2 from './analyses/tier2/index.js';
import * as tier3 from './analyses/tier3/index.js';
import { calculateQualityMetrics } from './analyses/metrics.js';
import { generateRecommendations } from './analyses/recommendations.js';

// DEBUG: Variable para tracking
let patternEngineLoaded = false;
let patternEngineError = null;

/**
 * Intenta detectar el projectRoot desde el systemMap
 * Busca package.json subiendo desde los directorios de los archivos
 * 
 * @param {object} systemMap - SystemMap con información de archivos
 * @returns {string|null} - Path del project root o null
 */
function detectProjectRoot(systemMap) {
  // Si ya está en metadata, usarlo
  if (systemMap.metadata?.projectRoot) {
    return systemMap.metadata.projectRoot;
  }
  
  // Intentar inferir desde los paths de los archivos
  const filePaths = Object.keys(systemMap.files || {});
  if (filePaths.length === 0) return null;
  
  // Tomar el primer archivo y asumir que el proyecto está 1-2 niveles arriba
  const firstFile = filePaths[0];
  const parts = firstFile.split('/');
  
  // Si el path empieza con 'src/', el root está un nivel arriba
  if (parts[0] === 'src' && parts.length > 1) {
    return '.'; // Asumir directorio actual
  }
  
  return null;
}

/**
 * Genera reporte completo de análisis
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @param {object} atomsIndex - Índice de átomos para análisis molecular (opcional)
 * @returns {Promise<object>} - Reporte con todos los análisis
 */
export async function generateAnalysisReport(systemMap, atomsIndex = {}) {
  // Detectar projectRoot para análisis de aliases
  const projectRoot = detectProjectRoot(systemMap);
  
  // Ejecutar todos los análisis
  const analyses = {
    // Tier 1: Análisis básicos
    unusedExports: tier1.findUnusedExports(systemMap),
    orphanFiles: tier1.findOrphanFiles(systemMap),
    hotspots: tier1.findHotspots(systemMap),
    circularFunctionDeps: tier1.findCircularFunctionDeps(systemMap, atomsIndex),
    deepDependencyChains: tier1.findDeepDependencyChains(systemMap),

    // Tier 2: Análisis avanzados
    sideEffectMarkers: tier2.detectSideEffectMarkers(systemMap),
    reachabilityAnalysis: tier2.analyzeReachability(systemMap),
    couplingAnalysis: tier2.analyzeCoupling(systemMap),
    unresolvedImports: await tier2.findUnresolvedImports(systemMap, projectRoot),
    circularImports: tier2.findCircularImports(systemMap),
    unusedImports: tier2.findUnusedImports(systemMap),
    reexportChains: tier2.analyzeReexportChains(systemMap),

    // Tier 3: Deep static analysis (types, constants, objects, enums)
    typeUsage: tier3.analyzeTypeUsage(systemMap),
    constantUsage: tier3.analyzeConstantUsage(systemMap),
    sharedObjects: tier3.analyzeSharedObjects(systemMap),
    enumUsage: tier3.analyzeEnumUsage(systemMap)
  };

  // Calcular métricas y recomendaciones (Legacy)
  let qualityMetrics = calculateQualityMetrics(analyses);
  let recommendations = generateRecommendations(analyses);
  
  // NUEVO: Intentar usar Pattern Detection Engine V2
  // DEBUG: Añadimos logging visible
  console.log('[ANALYZER] Attempting to load Pattern Detection Engine...');
  
  try {
    const pd = await import('./pattern-detection/index.js');
    const PatternDetectionEngine = pd.PatternDetectionEngine;
    
    if (PatternDetectionEngine) {
      console.log('[ANALYZER] Pattern Detection Engine loaded successfully');
      patternEngineLoaded = true;
      
      const engine = new PatternDetectionEngine({
        projectType: 'standard'
      });
      
      console.log('[ANALYZER] Running pattern detection analysis...');
      const patternResults = await engine.analyze(systemMap);
      
      console.log(`[ANALYZER] Pattern detection complete:`, {
        score: patternResults.qualityScore.score,
        grade: patternResults.qualityScore.grade,
        findings: patternResults.qualityScore.totalIssues
      });
      
      // REEMPLAZAR métricas legacy con las nuevas
      // No solo si son "mejores", sino SIEMPRE para usar el nuevo sistema
      qualityMetrics = {
        ...qualityMetrics,
        score: patternResults.qualityScore.score,
        grade: patternResults.qualityScore.grade,
        totalIssues: patternResults.qualityScore.totalIssues,
        breakdown: {
          ...qualityMetrics.breakdown,
          patternDetection: patternResults.qualityScore.breakdown
        }
      };
      
      recommendations = patternResults.qualityScore.recommendations.length > 0 
        ? patternResults.qualityScore.recommendations 
        : recommendations;
      
      analyses.patternDetection = patternResults.patterns;
      
      console.log('[ANALYZER] Using Pattern Detection Engine results');
    } else {
      console.log('[ANALYZER] Pattern Detection Engine not found in module');
      patternEngineError = 'PatternDetectionEngine not exported';
    }
  } catch (error) {
    console.error('[ANALYZER] Pattern Detection Engine failed:', error.message);
    console.error('[ANALYZER] Stack:', error.stack);
    patternEngineError = error.message;
  }

  // Retornar reporte completo
  return {
    metadata: systemMap.metadata,
    ...analyses,
    qualityMetrics: qualityMetrics,
    recommendations: recommendations
  };
}
