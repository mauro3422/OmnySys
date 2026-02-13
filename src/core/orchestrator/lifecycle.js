import path from 'path';

import { AnalysisWorker } from '../analysis-worker.js';
import { StateManager } from '../state-manager.js';
import { FileWatcher } from '../file-watcher.js';
import { WebSocketManager } from '../websocket/index.js';
import { BatchProcessor } from '../batch-processor/index.js';
import { UnifiedCacheManager } from '../unified-cache-manager.js';
import { LLMAnalyzer } from '../../layer-b-semantic/llm-analyzer/index.js';
import { indexProject } from '../../layer-a-static/indexer.js';
import { createLogger } from '../../utils/logger.js';
import { loadAIConfig } from '../../ai/llm-client.js';

const logger = createLogger('OmnySys:lifecycle');



/**
 * Initialize the orchestrator
 */
export async function initialize() {
  logger.info('\nðŸ”§ Initializing Orchestrator...\n');

  // Initialize cache
  this.cache = new UnifiedCacheManager(this.projectPath, {
    enableChangeDetection: true,
    cascadeInvalidation: true
  });
  await this.cache.initialize();

  // Initialize state manager
  this.stateManager = new StateManager(
    path.join(this.OmnySysDataPath, 'orchestrator-state.json')
  );

  // OPTIMIZATION: Create single LLMAnalyzer instance once to avoid repeated initialization
  let llmAnalyzer = null;
  try {
    const aiConfig = await loadAIConfig();
    llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
    // Share the same cache instance to avoid re-reading files
    llmAnalyzer.cache = this.cache;
    await llmAnalyzer.initialize();
    logger.info('✅ Shared LLM analyzer initialized with cache');
  } catch (err) {
    logger.warn('⚠️ LLM analyzer initialization failed:', err.message);
  }

  // Initialize worker with injected LLMAnalyzer
  this.worker = new AnalysisWorker(this.projectPath, {
    onProgress: (job, progress) => this._onJobProgress(job, progress),
    onComplete: (job, result) => this._onJobComplete(job, result),
    onError: (job, error) => this._onJobError(job, error)
  }, {
    llmAnalyzer
  });
  await this.worker.initialize();

  // Initialize optional components
  if (this.options.enableFileWatcher) {
    await this._initializeFileWatcher();
  }

  if (this.options.enableWebSocket) {
    await this._initializeWebSocket();
  }

  // Load existing state
  await this._loadState();

  // Analyze complex files with LLM based on Layer A metadata
  // NOTE: _analyzeComplexFilesWithLLM internally calls _processNext() when ready
  // So we DON'T call _processNext() here to avoid race condition
  this._analyzeComplexFilesWithLLM().then(() => {
    logger.info("✅ LLM analysis queue ready");
  }).catch(err => {
    logger.error("❌ LLM analysis setup failed:", err.message);
    // Start processing anyway in case there are jobs
    this._processNext();
  });

  // Don't call _processNext() here - let _analyzeComplexFilesWithLLM handle it
  // This prevents the race condition where we process before jobs are queued

  logger.info('âœ… Orchestrator initialized\n');
}

/**
 * Start background indexing if no data exists
 */
export async function startBackgroundIndexing() {
  const hasData = await this._hasExistingAnalysis();

  if (hasData) {
    logger.info('ðŸ“Š Analysis data found, skipping initial indexing');
    return;
  }

  logger.info('\nðŸš€ Starting background indexing...\n');
  this.isIndexing = true;

  // Check LLM availability
  let llmAvailable = false;
  if (this.options.autoStartLLM) {
    llmAvailable = await this._ensureLLMAvailable();
  }

  // Start indexing in background (don't await)
  indexProject(this.projectPath, {
    outputPath: 'system-map.json',
    verbose: true,
    skipLLM: !llmAvailable
  }).then((result) => {
    logger.info('\nâœ… Background indexing completed');
    this.isIndexing = false;
    this.indexingProgress = 100;
    this.emit('indexing:completed', result);
  }).catch((error) => {
    logger.error('\nâŒ Background indexing failed:', error.message);
    this.isIndexing = false;
    this.emit('indexing:failed', error);
  });

  // Monitor progress
  this._monitorIndexingProgress();
}

/**
 * Stop the orchestrator
 */
export async function stop() {
  logger.info('\nðŸ‘‹ Stopping Orchestrator...');
  this.isRunning = false;

  if (this.fileWatcher) {
    await this.fileWatcher.stop();
  }

  if (this.batchProcessor) {
    this.batchProcessor.stop();
  }

  if (this.wsManager) {
    await this.wsManager.stop();
  }

  if (this.worker) {
    await this.worker.stop();
  }

  logger.info('âœ… Orchestrator stopped');
}

// ==========================================
// Private methods
// ==========================================

export async function _initializeFileWatcher() {
  logger.info('ðŸ‘ï¸  Initializing File Watcher...');

  this.fileWatcher = new FileWatcher(this.projectPath, {
    debounceMs: 500,
    batchDelayMs: 1000,
    maxConcurrent: 3
  });

  this.fileWatcher.on('file:created', (event) => {
    this.batchProcessor?.addChange(event.filePath, 'created');
  });

  this.fileWatcher.on('file:modified', async (event) => {
    // 🆕 INVALIDACIÓN SÍNCRONA INMEDIATA (nueva arquitectura)
    logger.info(`🗑️  Cache invalidation starting for: ${event.filePath}`);

    const cacheInvalidator = this.cacheInvalidator || await this._getCacheInvalidator();

    try {
      // Invalidar caché ANTES de continuar (síncrono)
      const result = await cacheInvalidator.invalidateSync(event.filePath);

      if (!result.success) {
        logger.error(`❌ Cache invalidation failed for ${event.filePath}:`, result.error);
        // No continuar si invalidación falla
        return;
      }

      logger.info(`✅ Cache invalidated (${result.duration}ms): ${event.filePath}`);

      // Solo agregar a batch si invalidación exitosa
      this.batchProcessor?.addChange(event.filePath, 'modified');

    } catch (error) {
      logger.error(`💥 Unexpected error during cache invalidation:`, error.message);
      // No propagar error, solo loguear
    }
  });

  this.fileWatcher.on('file:deleted', (event) => {
    this.batchProcessor?.addChange(event.filePath, 'deleted');
  });

  // Tunnel vision warnings
  this.fileWatcher.on('tunnel-vision:detected', (event) => {
    logger.warn(`\n🔍 Tunnel Vision Alert: ${event.file} → ${event.totalAffected} files affected`);
    this.wsManager?.broadcast({
      type: 'tunnel-vision:detected',
      ...event,
      timestamp: Date.now()
    });
  });

  // Archetype changes
  this.fileWatcher.on('archetype:changed', (event) => {
    logger.warn(`\n🏗️ Archetype Change: ${event.filePath}`);
    this.wsManager?.broadcast({
      type: 'archetype:changed',
      ...event,
      timestamp: Date.now()
    });
  });

  // Broken dependencies - re-queue affected files
  this.fileWatcher.on('dependency:broken', (event) => {
    logger.warn(`\n⚠️ Broken dependency: ${event.affectedFile} (broken by ${event.brokenBy})`);
    this.batchProcessor?.addChange(event.affectedFile, 'modified');
  });

  await this.fileWatcher.initialize();

  // Initialize batch processor
  this.batchProcessor = new BatchProcessor({
    maxBatchSize: 20,
    batchTimeoutMs: 1000,
    processChange: async (change) => {
      // 📝 NOTA: La invalidación de caché ahora se hace SÍNCRONAMENTE
      // en el handler de 'file:modified' ANTES de llegar aquí.
      // Esto garantiza que el caché esté limpio antes de procesar.
      // 
      // La llamada anterior a _invalidateFileCache() se mantiene como
      // fallback por compatibilidad, pero no es necesaria:
      // await this._invalidateFileCache(change.filePath);

      const priority = this._calculateChangePriority(change);
      this.queue.enqueue(change.filePath, priority);

      if (!this.currentJob && this.isRunning) {
        this._processNext();
      }

      this.wsManager?.broadcast({
        type: 'file:queued',
        filePath: change.filePath,
        priority,
        timestamp: Date.now()
      });
    }
  });

  this.batchProcessor.start();
  logger.info('âœ… File Watcher ready\n');
}

export async function _initializeWebSocket() {
  logger.info('ðŸ“¡ Initializing WebSocket...');
  this.wsManager = new WebSocketManager({
    port: this.options.ports.webSocket,
    maxClients: 50
  });
  await this.wsManager.start();
  logger.info('âœ… WebSocket ready\n');
}

export async function _loadState() {
  try {
    const state = await this.stateManager.read();
    if (state.queue) {
      // Restore queue if needed
    }
  } catch {
    // No previous state
  }
}

export function _monitorIndexingProgress() {
  const checkProgress = () => {
    if (!this.isIndexing) return;

    // Update progress based on indexed files
    // This is a simplified version - could be more sophisticated
    this.emit('indexing:progress', this.indexingProgress);
    setTimeout(checkProgress, 1000);
  };

  checkProgress();
}
