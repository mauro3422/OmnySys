/**
 * @fileoverview cohesion-calculator.js
 * 
 * Cálculo de cohesión entre archivos
 * 
 * @module project-analyzer/utils/cohesion-calculator
 */

import path from 'path';
import { COHESION_WEIGHTS, DIRECTORY_CONFIG } from '../constants.js';

/**
 * Calcula la cohesión entre dos archivos
 * @param {object} fileA - Análisis del archivo A
 * @param {object} fileB - Análisis del archivo B
 * @param {string} pathA - Ruta del archivo A
 * @param {string} pathB - Ruta del archivo B
 * @returns {number} - Score de cohesión (0-10)
 */
export function calculateCohesion(fileA, fileB, pathA, pathB) {
  let cohesion = 0;

  // 1. IMPORTS DIRECTOS
  cohesion += calculateImportCohesion(fileA, fileB, pathA, pathB);

  // 2. SHARED STATE
  cohesion += calculateSharedStateCohesion(fileA, fileB);

  // 3. EVENTOS
  cohesion += calculateEventCohesion(fileA, fileB);

  // 4. DIRECTORIO
  cohesion += calculateDirectoryCohesion(pathA, pathB);

  return cohesion;
}

/**
 * Calcula cohesión por imports directos
 * @private
 */
function calculateImportCohesion(fileA, fileB, pathA, pathB) {
  let score = 0;
  
  if (fileA.imports?.some(imp => imp.resolvedPath === pathB)) {
    score += COHESION_WEIGHTS.DIRECT_IMPORTS;
  }
  if (fileB.imports?.some(imp => imp.resolvedPath === pathA)) {
    score += COHESION_WEIGHTS.DIRECT_IMPORTS;
  }
  
  return score;
}

/**
 * Calcula cohesión por shared state
 * @private
 */
function calculateSharedStateCohesion(fileA, fileB) {
  const semanticA = fileA.semanticAnalysis || {};
  const semanticB = fileB.semanticAnalysis || {};

  const writesA = semanticA.sharedState?.writes || [];
  const readsB = semanticB.sharedState?.reads || [];
  const writesB = semanticB.sharedState?.writes || [];
  const readsA = semanticA.sharedState?.reads || [];

  // A escribe lo que B lee (o viceversa)
  if (writesA.some(w => readsB.includes(w)) || writesB.some(w => readsA.includes(w))) {
    return COHESION_WEIGHTS.SHARED_STATE;
  }
  
  return 0;
}

/**
 * Calcula cohesión por eventos
 * @private
 */
function calculateEventCohesion(fileA, fileB) {
  const semanticA = fileA.semanticAnalysis || {};
  const semanticB = fileB.semanticAnalysis || {};

  const emitsA = semanticA.eventPatterns?.eventEmitters || [];
  const listensB = semanticB.eventPatterns?.eventListeners || [];
  const emitsB = semanticB.eventPatterns?.eventEmitters || [];
  const listensA = semanticA.eventPatterns?.eventListeners || [];

  // A emite lo que B escucha (o viceversa)
  if (emitsA.some(e => listensB.includes(e)) || emitsB.some(e => listensA.includes(e))) {
    return COHESION_WEIGHTS.SHARED_EVENTS;
  }
  
  return 0;
}

/**
 * Calcula cohesión por proximidad de directorio
 * @private
 */
function calculateDirectoryCohesion(pathA, pathB) {
  let score = 0;

  // Mismo directorio
  if (path.dirname(pathA) === path.dirname(pathB)) {
    score += COHESION_WEIGHTS.SAME_DIRECTORY;
  }

  // Directorio cercano
  const dirA = path.dirname(pathA).split(path.sep);
  const dirB = path.dirname(pathB).split(path.sep);

  let sharedLevels = 0;
  for (let i = 0; i < Math.min(dirA.length, dirB.length); i++) {
    if (dirA[i] === dirB[i]) {
      sharedLevels++;
    } else {
      break;
    }
  }

  if (sharedLevels >= DIRECTORY_CONFIG.MIN_SHARED_LEVELS) {
    score += COHESION_WEIGHTS.NEARBY_DIRECTORY;
  }

  return score;
}

/**
 * Calcula cohesión interna promedio de un cluster
 * @param {Set<string>} cluster - Archivos en el cluster
 * @param {Map} cohesionMatrix - Matriz de cohesión
 * @returns {number}
 */
export function calculateInternalCohesion(cluster, cohesionMatrix) {
  let totalCohesion = 0;
  let connectionCount = 0;

  for (const fileA of cluster) {
    for (const fileB of cluster) {
      if (fileA !== fileB) {
        const cohesion = cohesionMatrix.get(fileA)?.get(fileB) || 0;
        totalCohesion += cohesion;
        connectionCount++;
      }
    }
  }

  return connectionCount > 0 ? totalCohesion / connectionCount : 0;
}
