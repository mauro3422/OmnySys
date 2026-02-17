/**
 * @fileoverview cluster-detector.js
 * 
 * Detección de clusters basada en cohesión
 * 
 * @module project-analyzer/utils/cluster-detector
 */

import path from 'path';
import { COHESION_THRESHOLDS } from '../constants.js';
import { calculateInternalCohesion } from './cohesion-calculator.js';

/**
 * Detecta clusters de archivos con alta cohesión interna
 * @param {Map<string, Map<string, number>>} cohesionMatrix - Matriz de cohesión
 * @param {number} minCohesion - Cohesión mínima para formar cluster
 * @returns {Array<object>} - Lista de clusters detectados
 */
export function detectClusters(cohesionMatrix, minCohesion = COHESION_THRESHOLDS.MIN_FOR_CLUSTER) {
  const files = Array.from(cohesionMatrix.keys());
  const visited = new Set();
  const clusters = [];

  for (const startFile of files) {
    if (visited.has(startFile)) continue;

    // BFS para encontrar cluster
    const cluster = bfsCluster(startFile, cohesionMatrix, visited, minCohesion);

    // Calcular estadísticas del cluster
    const clusterInfo = buildClusterInfo(cluster, cohesionMatrix, clusters.length);
    clusters.push(clusterInfo);
  }

  // Ordenar por cohesión (más cohesivos primero)
  clusters.sort((a, b) => b.cohesion - a.cohesion);

  return clusters;
}

/**
 * BFS para encontrar cluster conectado
 * @private
 */
function bfsCluster(startFile, cohesionMatrix, visited, minCohesion) {
  const cluster = new Set([startFile]);
  const queue = [startFile];
  visited.add(startFile);

  while (queue.length > 0) {
    const currentFile = queue.shift();
    const connections = cohesionMatrix.get(currentFile);

    if (!connections) continue;

    for (const [connectedFile, cohesion] of connections.entries()) {
      if (cohesion >= minCohesion && !visited.has(connectedFile)) {
        cluster.add(connectedFile);
        queue.push(connectedFile);
        visited.add(connectedFile);
      }
    }
  }

  return cluster;
}

/**
 * Construye objeto de información del cluster
 * @private
 */
function buildClusterInfo(cluster, cohesionMatrix, index) {
  const clusterFiles = Array.from(cluster);
  const avgCohesion = calculateInternalCohesion(cluster, cohesionMatrix);
  const commonDir = findCommonDirectory(clusterFiles);
  const clusterName = commonDir
    ? path.basename(commonDir) || 'root'
    : 'root';

  return {
    name: clusterName,
    files: clusterFiles,
    cohesion: avgCohesion,
    commonDirectory: commonDir,
    fileCount: cluster.size
  };
}

/**
 * Encuentra el directorio común más específico para un conjunto de archivos
 * @param {string[]} files - Lista de archivos
 * @returns {string}
 */
export function findCommonDirectory(files) {
  if (files.length === 0) return '';
  if (files.length === 1) return path.dirname(files[0]);

  const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
  const dirs = normalizedFiles.map(f => {
    const dir = f.substring(0, f.lastIndexOf('/'));
    return dir ? dir.split('/') : [];
  });
  
  if (dirs.length === 0 || dirs[0].length === 0) return '';
  
  let commonParts = [];

  for (let i = 0; i < dirs[0].length; i++) {
    const part = dirs[0][i];
    if (dirs.every(d => d[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.join('/');
}
