/**
 * @fileoverview index.js
 * 
 * Initialization Module - SSOT para inicializaciÃ³n del servidor
 * 
 * Este mÃ³dulo centraliza toda la lÃ³gica de inicializaciÃ³n del
 * OmnySysUnifiedServer siguiendo principios SOLID:
 * - S: Cada sub-mÃ³dulo tiene una responsabilidad Ãºnica
 * - O: Extensible mediante nuevos inicializadores
 * - D: Depende de abstracciones (contextos), no de implementaciones
 * 
 * @module unified-server/initialization
 */

import * as cacheManager from './cache-manager.js';
import * as analysisManager from './analysis-manager.js';
import * as fileWatcherInit from './file-watcher-init.js';
import * as batchProcessorInit from './batch-processor-init.js';
import * as websocketInit from './websocket-init.js';
import * as orchestratorInit from './orchestrator-init.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:index');



// Re-exportar funciones individuales para compatibilidad
export { calculateChangePriority } from './batch-processor-init.js';

/**
 * Inicializa el servidor completo (API pÃºblica - compatible con versiÃ³n anterior)
 * @returns {Promise<boolean>}
 */
export async function initialize() {
  logger.info('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
  logger.info('â•‘     OmnySys Unified Server v2.0.0                         â•‘');
  logger.info('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
  logger.info(`ðŸ“ Project: ${this.projectPath}\n`);

  try {
    cleanupInitializationListeners(this);
    // Step 1: Initialize Cache
    const { cache } = await cacheManager.initializeCache(this.projectPath);
    this.cache = cache;

    // Verificar si existe anÃ¡lisis
    const hasAnalysis = await cacheManager.hasExistingAnalysis(this.OmnySysDataPath);

    if (!hasAnalysis) {
      logger.info('  âš ï¸  No analysis data found (or already running via MCP index-runner)');
      // FIX: Removed the automatic background trigger here because the MCP daemon's 
      // index-runner.js already handles full synchronous execution. Launching a background
      // queue simultaneously duplicates the AST extraction process, doubling the atoms 
      // (18k vs 9k) and causing 80-second delays due to lock contention.

      cacheManager.initializeEmptyCache(this.cache);
      logger.info('  â³ Server initialized with empty cache, waiting for primary analysis to complete (or already ready)\n');
    } else {
      this.metadata = await cacheManager.loadExistingData({
        cache: this.cache,
        projectPath: this.projectPath
      });
    }

    // Step 2: Initialize Orchestrator
    const { stateManager, worker } = await orchestratorInit.initializeOrchestratorComponents({
      projectPath: this.projectPath,
      omnySysDataPath: this.OmnySysDataPath,
      eventEmitter: this
    });
    this.stateManager = stateManager;
    this.worker = worker;

    // Step 3: Initialize File Watcher
    this.fileWatcher = await fileWatcherInit.initializeFileWatcher({
      projectPath: this.projectPath,
      batchProcessor: null, // Se conecta despuÃ©s
      wsManager: null // Se conecta despuÃ©s
    });

    // Step 4: Initialize Batch Processor
    this.batchProcessor = await batchProcessorInit.initializeBatchProcessor({
      queue: this.queue,
      wsManager: null, // Se actualiza despuÃ©s
      processNextFn: () => this.processNext(),
      isRunningRef: { current: this.isRunning },
      currentJobRef: { current: this.currentJob }
    });

    // Re-conectar FileWatcher con BatchProcessor
    this.fileWatcher.removeAllListeners('file:created');
    this.fileWatcher.removeAllListeners('file:modified');
    this.fileWatcher.removeAllListeners('file:deleted');

    this.fileWatcher.on('file:created', (event) => {
      this.batchProcessor?.queueChange(event.filePath, 'created');
    });
    this.fileWatcher.on('file:modified', (event) => {
      this.batchProcessor?.queueChange(event.filePath, 'modified');
    });
    this.fileWatcher.on('file:deleted', (event) => {
      this.batchProcessor?.queueChange(event.filePath, 'deleted');
    });

    // Step 5: Initialize WebSocket
    this.wsManager = await websocketInit.initializeWebSocket({
      port: this.ports.webSocket || 9997
    });

    // Actualizar referencias de wsManager en batchProcessor
    // (Esto es un workaround para mantener compatibilidad)

    // Step 6: Start processing
    this.processNext();

    this.initialized = true;
    this.emit('ready');
    this.printStatus();

    return true;
  } catch (error) {
    logger.error('\nâŒ Initialization failed:', error.message);
    logger.error(error.stack);
    throw error;
  }
}


/**
 * Verifica si existe anï¿½lisis (API pï¿½blica - compatible)
 */
export async function hasExistingAnalysis() {
  return cacheManager.hasExistingAnalysis(this.OmnySysDataPath);
}


// APIs de inicializaciÃ³n individuales (para uso avanzado)
export {
  cacheManager,
  analysisManager,
  fileWatcherInit,
  batchProcessorInit,
  websocketInit,
  orchestratorInit
};

function cleanupInitializationListeners(server) {
  server.fileWatcher?.removeAllListeners?.('file:created');
  server.fileWatcher?.removeAllListeners?.('file:modified');
  server.fileWatcher?.removeAllListeners?.('file:deleted');
  server.wsManager?.removeAllListeners?.('message');
  server.wsManager?.removeAllListeners?.('close');
  server.wsManager?.removeAllListeners?.('error');
}

