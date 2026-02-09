/**
 * @fileoverview index.js
 * 
 * Initialization Module - SSOT para inicialización del servidor
 * 
 * Este módulo centraliza toda la lógica de inicialización del
 * OmnySysUnifiedServer siguiendo principios SOLID:
 * - S: Cada sub-módulo tiene una responsabilidad única
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
 * Inicializa el servidor completo (API pública - compatible con versión anterior)
 * @returns {Promise<boolean>}
 */
export async function initialize() {
  logger.info('\n╔═══════════════════════════════════════════════════════════════╗');
  logger.info('║     OmnySys Unified Server v2.0.0                         ║');
  logger.info('╚═══════════════════════════════════════════════════════════════╝\n');
  logger.info(`📁 Project: ${this.projectPath}\n`);

  try {
    // Step 1: Initialize Cache
    const { cache } = await cacheManager.initializeCache(this.projectPath);
    this.cache = cache;

    // Verificar si existe análisis
    const hasAnalysis = await cacheManager.hasExistingAnalysis(this.OmnySysDataPath);
    
    if (!hasAnalysis) {
      logger.info('  ⚠️  No analysis data found');
      logger.info('  🔄 Queuing initial analysis in background...\n');
      
      analysisManager.queueInitialAnalysis(
        this.projectPath,
        () => this.reloadMetadata()
      );
      
      cacheManager.initializeEmptyCache(this.cache);
      logger.info('  ⏳ Server ready, analysis running in background\n');
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
      batchProcessor: null, // Se conecta después
      wsManager: null // Se conecta después
    });

    // Step 4: Initialize Batch Processor
    this.batchProcessor = await batchProcessorInit.initializeBatchProcessor({
      queue: this.queue,
      wsManager: null, // Se actualiza después
      processNextFn: () => this.processNext(),
      isRunningRef: { current: this.isRunning },
      currentJobRef: { current: this.currentJob }
    });

    // Re-conectar FileWatcher con BatchProcessor
    this.fileWatcher.removeAllListeners('file:created');
    this.fileWatcher.removeAllListeners('file:modified');
    this.fileWatcher.removeAllListeners('file:deleted');
    
    this.fileWatcher.on('file:created', (event) => {
      this.batchProcessor?.addChange(event.filePath, 'created');
    });
    this.fileWatcher.on('file:modified', (event) => {
      this.batchProcessor?.addChange(event.filePath, 'modified');
    });
    this.fileWatcher.on('file:deleted', (event) => {
      this.batchProcessor?.addChange(event.filePath, 'deleted');
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
    logger.error('\n❌ Initialization failed:', error.message);
    logger.error(error.stack);
    throw error;
  }
}

/**
 * Recarga metadata (API pública - compatible)
 */
export async function reloadMetadata() {
  return analysisManager.reloadMetadata({
    cache: this.cache,
    projectPath: this.projectPath,
    wsManager: this.wsManager
  });
}

/**
 * Verifica si existe análisis (API pública - compatible)
 */
export async function hasExistingAnalysis() {
  return cacheManager.hasExistingAnalysis(this.OmnySysDataPath);
}

/**
 * Encola análisis inicial (API pública - compatible)
 */
export async function queueInitialAnalysis() {
  return analysisManager.queueInitialAnalysis(
    this.projectPath,
    () => this.reloadMetadata()
  );
}

// APIs de inicialización individuales (para uso avanzado)
export {
  cacheManager,
  analysisManager,
  fileWatcherInit,
  batchProcessorInit,
  websocketInit,
  orchestratorInit
};
