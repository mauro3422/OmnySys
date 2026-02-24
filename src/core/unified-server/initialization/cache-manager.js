/**
 * @fileoverview cache-manager.js
 * 
 * Inicialización del cache unificado y carga de datos
 * 
 * @module unified-server/initialization/cache-manager
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { getAllConnections } from '#layer-c/query/apis/connections-api.js';
import { getRiskAssessment } from '#layer-c/query/apis/risk-api.js';
import { getCacheManager } from '#core/cache/singleton.js';

/**
 * Inicializa MCP Server - Cache y datos
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Object>} - { cache, metadata, hasExistingData }
 */
export async function initializeCache(projectPath) {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 1: MCP Server Initialization');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const cache = await getCacheManager(projectPath);
  logger.info('  ✓ Unified cache initialized (singleton)');

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
  cache.set('metadata', metadata);
  logger.info('  ✓ Metadata cached');

  const connections = await getAllConnections(projectPath);
  cache.set('connections', connections);
  logger.info('  ✓ Connections cached');

  const assessment = await getRiskAssessment(projectPath);
  cache.set('assessment', assessment);
  logger.info('  ✓ Risk assessment cached');

  logger.info(`  📊 ${metadata?.stats?.totalFiles || 0} files indexed\n`);
  
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
    // Check for index.json (legacy)
    const indexPath = path.join(omnySysDataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    // Check for SQLite database (newer)
    try {
      const dbPath = path.join(omnySysDataPath, 'omnysys.db');
      await fs.access(dbPath);
      // Verify SQLite has data
      const SQLite = await import('better-sqlite3');
      const db = new SQLite.default(dbPath, { readonly: true });
      const count = db.prepare('SELECT COUNT(*) as count FROM atoms').get();
      db.close();
      return count?.count > 0;
    } catch {
      return false;
    }
  }
}

// Import necesario para hasExistingAnalysis
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:cache:manager');


