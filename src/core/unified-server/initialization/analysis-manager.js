/**
 * @fileoverview analysis-manager.js
 * 
 * Gestión del análisis inicial en background
 * 
 * @module unified-server/initialization/analysis-manager
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Inicia el análisis inicial en background
 * @param {string} projectPath - Ruta del proyecto
 * @param {Function} reloadMetadataFn - Función para recargar metadata
 * @returns {Promise<void>}
 */
export async function queueInitialAnalysis(projectPath, reloadMetadataFn) {
  const { indexProject } = await import('#layer-a/indexer.js');
  
  // Verificar LLM health
  let llmAvailable = false;
  try {
    const { LLMClient } = await import('#ai/llm-client.js');
    const client = new LLMClient({ llm: { enabled: true } });
    const health = await client.healthCheck();
    llmAvailable = health.gpu || health.cpu;
  } catch {
    llmAvailable = false;
  }
  
  // Ejecutar análisis en background
  indexProject(projectPath, {
    outputPath: 'system-map.json',
    verbose: true,
    skipLLM: !llmAvailable
  }).then(() => {
    console.log('\n📊 Background analysis completed');
    if (reloadMetadataFn) {
      return reloadMetadataFn();
    }
  }).catch(error => {
    console.error('\n❌ Background analysis failed:', error.message);
  });
}

/**
 * Recarga metadata después de que el análisis completa
 * @param {Object} context - { cache, projectPath, wsManager }
 * @returns {Promise<void>}
 */
export async function reloadMetadata(context) {
  const { cache, projectPath, wsManager } = context;
  
  try {
    const { getProjectMetadata, getAllConnections, getRiskAssessment } =
      await import('#layer-a/query/index.js');
    
    const metadata = await getProjectMetadata(projectPath);
    cache.ramCacheSet('metadata', metadata);
    
    const connections = await getAllConnections(projectPath);
    cache.ramCacheSet('connections', connections);
    
    const assessment = await getRiskAssessment(projectPath);
    cache.ramCacheSet('assessment', assessment);
    
    // Notificar a clientes WebSocket
    wsManager?.broadcast({
      type: 'analysis:completed',
      filesAnalyzed: metadata?.metadata?.totalFiles || 0,
      timestamp: Date.now()
    });
    
    console.log(`📊 Data refreshed: ${metadata?.metadata?.totalFiles || 0} files`);
  } catch (error) {
    console.error('Failed to reload metadata:', error.message);
  }
}
