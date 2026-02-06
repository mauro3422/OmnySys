/**
 * @fileoverview cache-manager.js
 * 
 * Inicialización del cache unificado y carga de datos
 * 
 * @module unified-server/initialization/cache-manager
 */

import {
  getProjectMetadata,
  getAllConnections,
  getRiskAssessment
} from '../../../layer-a-static/storage/query-service.js';
import { UnifiedCacheManager } from '../../unified-cache-manager.js';

/**
 * Inicializa MCP Server - Cache y datos
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Object>} - { cache, metadata, hasExistingData }
 */
export async function initializeCache(projectPath) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: MCP Server Initialization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const cache = new UnifiedCacheManager(projectPath, {
    enableChangeDetection: true,
    cascadeInvalidation: true
  });
  
  await cache.initialize();
  console.log('  ✓ Unified cache initialized');

  return { cache };
}

/**
 * Carga datos existentes en el cache
 * @param {Object} context - { cache, projectPath }
 * @returns {Promise<Object>} - Metadata cargada
 */
export async function loadExistingData(context) {
  const { cache, projectPath } = context;
  
  const metadata = await getProjectMetadata(projectPath);
  cache.ramCacheSet('metadata', metadata);
  console.log('  ✓ Metadata cached');

  const connections = await getAllConnections(projectPath);
  cache.ramCacheSet('connections', connections);
  console.log('  ✓ Connections cached');

  const assessment = await getRiskAssessment(projectPath);
  cache.ramCacheSet('assessment', assessment);
  console.log('  ✓ Risk assessment cached');

  console.log(`  📊 ${metadata?.metadata?.totalFiles || 0} files indexed\n`);
  
  return metadata;
}

/**
 * Inicializa el cache con datos vacíos (cuando no hay análisis)
 * @param {Object} cache - Instancia de cache
 */
export function initializeEmptyCache(cache) {
  cache.ramCacheSet('metadata', { metadata: { totalFiles: 0 }, fileIndex: {} });
  cache.ramCacheSet('connections', { sharedState: [], eventListeners: [], total: 0 });
  cache.ramCacheSet('assessment', { report: { summary: {} } });
}

/**
 * Verifica si existe análisis previo
 * @param {string} omnySysDataPath - Ruta a .OmnySysData
 * @returns {Promise<boolean>}
 */
export async function hasExistingAnalysis(omnySysDataPath) {
  try {
    const indexPath = path.join(omnySysDataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

// Import necesario para hasExistingAnalysis
import fs from 'fs/promises';
import path from 'path';
