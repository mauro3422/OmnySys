/**
 * @fileoverview graph-persister.js
 * 
 * Persiste los grafos generados en .omnysysdata/
 * - event-graph.json
 * - clusters.json
 * - purpose-stats.json
 * 
 * @module layer-graph/persistence/graph-persister
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Guarda el event graph en disco
 * @param {Object} eventGraph - Grafo de eventos
 * @param {string} dataDir - Directorio de datos (.omnysysdata)
 */
export async function persistEventGraph(eventGraph, dataDir) {
  const outputPath = path.join(dataDir, 'event-graph.json');
  
  const output = {
    nodes: eventGraph.nodes,
    edges: eventGraph.edges,
    meta: {
      ...eventGraph.meta,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  return outputPath;
}

/**
 * Guarda los clusters en disco
 * @param {Array} fileClusters - Clusters por archivo
 * @param {Array} purposeClusters - Clusters por propósito
 * @param {string} dataDir - Directorio de datos
 */
export async function persistClusters(fileClusters, purposeClusters, dataDir) {
  const outputPath = path.join(dataDir, 'clusters.json');
  
  const output = {
    fileClusters: fileClusters.slice(0, 100), // Top 100
    purposeClusters,
    meta: {
      totalFileClusters: fileClusters.length,
      totalPurposeClusters: purposeClusters.length,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  return outputPath;
}

/**
 * Guarda estadísticas de purpose
 * @param {Map} atoms - Mapa de átomos
 * @param {string} dataDir - Directorio de datos
 */
export async function persistPurposeStats(atoms, dataDir) {
  const outputPath = path.join(dataDir, 'purpose-stats.json');
  
  const stats = {
    total: atoms.size,
    byPurpose: {},
    byArchetype: {},
    deadCodeReal: 0,
    apiExports: 0,
    testHelpers: 0
  };
  
  for (const atom of atoms.values()) {
    // By purpose
    const purpose = atom.purpose || 'UNKNOWN';
    stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
    
    // By archetype
    const archetype = atom.archetype?.type || 'unknown';
    stats.byArchetype[archetype] = (stats.byArchetype[archetype] || 0) + 1;
    
    // Specific counts
    if (purpose === 'DEAD_CODE' && (!atom.calledBy || atom.calledBy.length === 0)) {
      stats.deadCodeReal++;
    }
    if (purpose === 'API_EXPORT') stats.apiExports++;
    if (purpose === 'TEST_HELPER') stats.testHelpers++;
  }
  
  stats.generatedAt = new Date().toISOString();
  
  await fs.writeFile(outputPath, JSON.stringify(stats, null, 2));
  return outputPath;
}

/**
 * Carga todos los grafos persistidos
 * @param {string} dataDir - Directorio de datos
 * @returns {Object} - Todos los grafos cargados
 */
export async function loadPersistedGraphs(dataDir) {
  const result = {
    eventGraph: null,
    clusters: null,
    purposeStats: null
  };
  
  try {
    const eventGraphPath = path.join(dataDir, 'event-graph.json');
    const content = await fs.readFile(eventGraphPath, 'utf-8');
    result.eventGraph = JSON.parse(content);
  } catch {}
  
  try {
    const clustersPath = path.join(dataDir, 'clusters.json');
    const content = await fs.readFile(clustersPath, 'utf-8');
    result.clusters = JSON.parse(content);
  } catch {}
  
  try {
    const statsPath = path.join(dataDir, 'purpose-stats.json');
    const content = await fs.readFile(statsPath, 'utf-8');
    result.purposeStats = JSON.parse(content);
  } catch {}
  
  return result;
}

export default {
  persistEventGraph,
  persistClusters,
  persistPurposeStats,
  loadPersistedGraphs
};