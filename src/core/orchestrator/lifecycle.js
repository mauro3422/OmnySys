import path from 'path';

import { AnalysisWorker } from '../analysis-worker.js';
import { StateManager } from '../state-manager.js';
import { FileWatcher } from '../file-watcher.js';
import { WebSocketManager } from '../websocket/index.js';
import { BatchProcessor } from '../batch-processor/index.js';
import { UnifiedCacheManager } from '../unified-cache-manager.js';
import { indexProject } from '../../layer-a-static/indexer.js';
import { createLogger } from '../../utils/logger.js';
import { loadAIConfig } from '../../ai/llm-client.js';
import { LLMService } from '../../services/llm-service.js';

const logger = createLogger('OmnySys:lifecycle');



/**
 * Initialize the orchestrator
 */
export async function initialize() {
  logger.info('\n🔧 Initializing Orchestrator...\n');

  // Initialize cache - use external cache if provided, otherwise create new
  if (this.options.cache) {
    this.cache = this.options.cache;
    logger.info('  ✅ Using shared cache from server');
  } else {
    this.cache = new UnifiedCacheManager(this.projectPath, {
      enableChangeDetection: true,
      cascadeInvalidation: true
    });
    await this.cache.initialize();
    logger.info('  ✅ Cache initialized');
  }

  // Initialize state manager
  this.stateManager = new StateManager(
    path.join(this.OmnySysDataPath, 'orchestrator-state.json')
  );

  // Load AI config
  this.aiConfig = await loadAIConfig();
  this.maxConcurrentAnalyses = this.aiConfig?.performance?.maxConcurrentAnalyses || 2;
  
  // Initialize LLMService (singleton)
  // El servicio se inicializa lazy, aquí solo nos aseguramos que exista
  try {
    await LLMService.getInstance();
    logger.info('  ✅ LLMService initialized');
  } catch (err) {
    logger.warn('⚠️  LLMService not ready yet:', err.message);
  }

  // Initialize worker
  // El worker obtendrá el LLMService del singleton automáticamente
  this.worker = new AnalysisWorker(this.projectPath, {
    onProgress: (job, progress) => this._onJobProgress(job, progress),
    onComplete: (job, result) => this._onJobComplete(job, result),
    onError: (job, error) => this._onJobError(job, error)
  });
  await this.worker.initialize();
  logger.info('  ✅ Worker initialized');

  // Initialize optional components
  if (this.options.enableFileWatcher) {
    await this._initializeFileWatcher();
  }

  if (this.options.enableWebSocket) {
    await this._initializeWebSocket();
  }

  // Load existing state
  await this._loadState();

  // Start LLM availability monitoring
  this._startLLMHealthChecker();

  // Analyze complex files with LLM based on Layer A metadata
  // El LLMService manejará la disponibilidad automáticamente
  this._analyzeComplexFilesWithLLM().then(() => {
    logger.info("✅ LLM analysis queue ready");
  }).catch(err => {
    logger.error("❌ LLM analysis setup failed:", err.message);
  });

  logger.info('✅ Orchestrator initialized\n');
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

  // Check LLM availability via service
  let llmAvailable = false;
  if (this.options.autoStartLLM) {
    const service = await LLMService.getInstance();
    llmAvailable = await service.waitForAvailable(10000);
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
  logger.info('\n👋 Stopping Orchestrator...');
  this.isRunning = false;

  if (this._llmHealthRunning) {
    this._llmHealthRunning = false;
    logger.info('✅ LLM health checker stopped');
  }

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

  logger.info('✅ Orchestrator stopped');
}

/**
 * Start periodic LLM health checker
 * Ahora simplificado usando LLMService
 */
export function _startLLMHealthChecker() {
  logger.info('🔍 [HEALTH-CHECK] Starting...');
  
  if (this._llmHealthRunning) {
    logger.info('⏳ Health checker already running');
    return;
  }
  
  this._llmHealthRunning = true;
  let attempts = 0;
  const maxAttempts = 60;
  
  const checkLLM = async () => {
    if (!this._llmHealthRunning) return;
    
    try {
      logger.info(`🔍 [HEALTH-CHECK] Attempt ${attempts + 1}/${maxAttempts}`);
      
      const service = await LLMService.getInstance();
      const isAvailable = service.isAvailable();
      
      if (isAvailable) {
        logger.info('✅ LLM server is available (via LLMService)');
        this._llmHealthRunning = false;
        
        // Trigger analysis if not already done
        if (!this._llmAnalysisTriggered) {
          logger.info('🤖 Triggering LLM analysis queue...');
          this._llmAnalysisTriggered = true;
          this._analyzeComplexFilesWithLLM().then(() => {
            logger.info("✅ LLM analysis queue completed");
          }).catch(err => {
            logger.error("❌ LLM analysis failed:", err.message);
            this._llmAnalysisTriggered = false;
          });
        }
        return;
      }
      
      // Try to force health check
      await service.checkHealth();
      
      attempts++;
      if (attempts % 6 === 0) {
        logger.info(`⏳ Still waiting for LLM server... (${attempts}/${maxAttempts})`);
      }
      
      if (attempts >= maxAttempts) {
        logger.warn('⚠️  LLM health checker stopped after 5 minutes');
        this._llmHealthRunning = false;
        return;
      }
      
      // Schedule next check
      setTimeout(checkLLM, 5000);
    } catch (error) {
      logger.warn('⚠️  LLM health check error:', error.message);
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkLLM, 5000);
      } else {
        this._llmHealthRunning = false;
      }
    }
  };
  
  // Start first check immediately
  setTimeout(checkLLM, 0);
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
    logger.info(`🗑️  Cache invalidation starting for: ${event.filePath}`);

    const cacheInvalidator = this.cacheInvalidator || await this._getCacheInvalidator();

    try {
      const result = await cacheInvalidator.invalidateSync(event.filePath);

      if (!result.success) {
        logger.error(`❌ Cache invalidation failed for ${event.filePath}:`, result.error);
        return;
      }

      logger.info(`✅ Cache invalidated (${result.duration}ms): ${event.filePath}`);
      this.batchProcessor?.addChange(event.filePath, 'modified');

    } catch (error) {
      logger.error(`💥 Unexpected error during cache invalidation:`, error.message);
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

    this.emit('indexing:progress', this.indexingProgress);
    setTimeout(checkProgress, 1000);
  };

  checkProgress();
}
