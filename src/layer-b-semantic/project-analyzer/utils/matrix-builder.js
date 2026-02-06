/**
 * @fileoverview matrix-builder.js
 * 
 * Construcción de matriz de cohesión
 * 
 * @module project-analyzer/utils/matrix-builder
 */

import { calculateCohesion } from './cohesion-calculator.js';

/**
 * Calcula matriz de cohesión para todos los archivos del proyecto
 * @param {object} staticResults - Resultados del análisis estático
 * @returns {Map<string, Map<string, number>>} - Matriz de cohesión
 */
export function calculateCohesionMatrix(staticResults) {
  const matrix = new Map();
  const files = Object.keys(staticResults.files || {});

  for (const fileA of files) {
    const cohesionMap = new Map();

    for (const fileB of files) {
      if (fileA === fileB) continue;

      const cohesion = calculateCohesion(
        staticResults.files[fileA],
        staticResults.files[fileB],
        fileA,
        fileB
      );

      if (cohesion > 0) {
        cohesionMap.set(fileB, cohesion);
      }
    }

    matrix.set(fileA, cohesionMap);
  }

  return matrix;
}

/**
 * Obtiene los archivos más cohesivos con un archivo dado
 * @param {string} filePath - Archivo de referencia
 * @param {Map} cohesionMatrix - Matriz de cohesión
 * @param {number} limit - Cantidad máxima a retornar
 * @returns {Array<{file: string, cohesion: number}>}
 */
export function getMostCohesiveFiles(filePath, cohesionMatrix, limit = 5) {
  const connections = cohesionMatrix.get(filePath);
  if (!connections) return [];

  return Array.from(connections.entries())
    .map(([file, cohesion]) => ({ file, cohesion }))
    .sort((a, b) => b.cohesion - a.cohesion)
    .slice(0, limit);
}

/**
 * Calcula estadísticas de la matriz
 * @param {Map} cohesionMatrix - Matriz de cohesión
 * @returns {object}
 */
export function calculateMatrixStats(cohesionMatrix) {
  let totalConnections = 0;
  let totalCohesion = 0;
  let maxCohesion = 0;
  let minCohesion = Infinity;

  for (const connections of cohesionMatrix.values()) {
    for (const cohesion of connections.values()) {
      totalConnections++;
      totalCohesion += cohesion;
      maxCohesion = Math.max(maxCohesion, cohesion);
      minCohesion = Math.min(minCohesion, cohesion);
    }
  }

  return {
    totalConnections,
    averageCohesion: totalConnections > 0 ? totalCohesion / totalConnections : 0,
    maxCohesion,
    minCohesion: minCohesion === Infinity ? 0 : minCohesion
  };
}
