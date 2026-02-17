/**
 * @fileoverview orphan-detector.js
 * 
 * Detección de archivos huérfanos
 * 
 * @module project-analyzer/utils/orphan-detector
 */

import { COHESION_THRESHOLDS, Severity } from '../constants.js';

/**
 * Identifica archivos huérfanos (sin conexiones significativas)
 * @param {object} staticResults - Resultados del análisis estático
 * @param {Map<string, Map<string, number>>} cohesionMatrix - Matriz de cohesión
 * @returns {Array<object>} - Lista de archivos huérfanos
 */
export function identifyOrphans(staticResults, cohesionMatrix) {
  const orphans = [];

  for (const [filePath, analysis] of Object.entries(staticResults.files || {})) {
    const orphanInfo = analyzeOrphanPotential(filePath, analysis, cohesionMatrix);
    
    if (orphanInfo.isOrphan) {
      orphans.push(buildOrphanInfo(filePath, analysis, orphanInfo));
    }
  }

  return orphans;
}

/**
 * Analiza si un archivo tiene potencial de ser huérfano
 * @private
 */
function analyzeOrphanPotential(filePath, analysis, cohesionMatrix) {
  const connections = cohesionMatrix.get(filePath);
  const maxCohesion = connections
    ? Math.max(...Array.from(connections.values()), 0)
    : 0;

  // Criterios de huérfano
  const hasNoImports = (analysis.imports?.length || 0) === 0;
  const hasNoDependents = (analysis.usedBy?.length || 0) === 0;
  const lowCohesion = maxCohesion < COHESION_THRESHOLDS.MIN_FOR_CLUSTER * 2;

  return {
    isOrphan: hasNoImports && hasNoDependents && lowCohesion,
    maxCohesion,
    hasNoImports,
    hasNoDependents
  };
}

/**
 * Construye objeto de información del huérfano
 * @private
 */
function buildOrphanInfo(filePath, analysis, orphanInfo) {
  const semantic = analysis.semanticAnalysis || {};
  const hasSideEffects = detectSideEffects(semantic);

  return {
    file: filePath,
    hasSideEffects,
    severity: hasSideEffects ? Severity.HIGH : Severity.LOW,
    maxCohesion: orphanInfo.maxCohesion,
    sharedState: {
      writes: semantic.sharedState?.writes || [],
      reads: semantic.sharedState?.reads || []
    },
    events: {
      emits: semantic.eventPatterns?.eventEmitters || [],
      listens: semantic.eventPatterns?.eventListeners || []
    }
  };
}

/**
 * Detecta si un archivo tiene side effects
 * @param {object} semantic - Análisis semántico
 * @returns {boolean}
 */
function detectSideEffects(semantic) {
  const hasStateWrites = (semantic.sharedState?.writes?.length || 0) > 0;
  const hasEmitters = (semantic.eventPatterns?.eventEmitters?.length || 0) > 0;
  const hasGlobal = !!semantic.sideEffects?.hasGlobalAccess;
  const hasLocalStorage = !!semantic.sideEffects?.usesLocalStorage;
  
  return hasStateWrites || hasEmitters || hasGlobal || hasLocalStorage;
}

/**
 * Verifica si un archivo tiene side effects significativos
 * @param {object} analysis - Análisis del archivo
 * @returns {boolean}
 */
export function hasSignificantSideEffects(analysis) {
  const semantic = analysis?.semanticAnalysis;
  if (!semantic) return false;
  
  return detectSideEffects(semantic);
}
