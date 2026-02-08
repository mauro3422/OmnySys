import path from 'path';

import { AnalysisWorker } from '../analysis-worker.js';
import { StateManager } from '../state-manager.js';
import { FileWatcher } from '../file-watcher.js';
import { WebSocketManager } from '../websocket/index.js';
import { BatchProcessor } from '../batch-processor/index.js';
import { UnifiedCacheManager } from '../unified-cache-manager.js';
import { indexProject } from '../../layer-a-static/indexer.js';

/**
 * Initialize the orchestrator
 */
export async function initialize() {
  console.log('\nðŸ”§ Initializing Orchestrator...\n');

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

  // Initialize worker
  this.worker = new AnalysisWorker(this.projectPath, {
    onProgress: (job, progress) => this._onJobProgress(job, progress),
    onComplete: (job, result) => this._onJobComplete(job, result),
    onError: (job, error) => this._onJobError(job, error)
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
  this._analyzeComplexFilesWithLLM().then(() => {
    console.log("✅ LLM analysis queue ready");
  }).catch(err => {
    console.error("❌ LLM analysis setup failed:", err.message);
  });

  // Start processing loop
  this._processNext();

  console.log('âœ… Orchestrator initialized\n');
}

/**
 * Start background indexing if no data exists
 */
export async function startBackgroundIndexing() {
  const hasData = await this._hasExistingAnalysis();

  if (hasData) {
    console.log('ðŸ“Š Analysis data found, skipping initial indexing');
    return;
  }

  console.log('\nðŸš€ Starting background indexing...\n');
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
    console.log('\nâœ… Background indexing completed');
    this.isIndexing = false;
    this.indexingProgress = 100;
    this.emit('indexing:completed', result);
  }).catch((error) => {
    console.error('\nâŒ Background indexing failed:', error.message);
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
  console.log('\nðŸ‘‹ Stopping Orchestrator...');
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

  console.log('âœ… Orchestrator stopped');
}

// ==========================================
// Private methods
// ==========================================

export async function _initializeFileWatcher() {
  console.log('ðŸ‘ï¸  Initializing File Watcher...');

  this.fileWatcher = new FileWatcher(this.projectPath, {
    debounceMs: 500,
    batchDelayMs: 1000,
    maxConcurrent: 3
  });

  this.fileWatcher.on('file:created', (event) => {
    this.batchProcessor?.addChange(event.filePath, 'created');
  });

  this.fileWatcher.on('file:modified', (event) => {
    this.batchProcessor?.addChange(event.filePath, 'modified');
  });

  this.fileWatcher.on('file:deleted', (event) => {
    this.batchProcessor?.addChange(event.filePath, 'deleted');
  });

  // Tunnel vision warnings
  this.fileWatcher.on('tunnel-vision:detected', (event) => {
    console.warn(`\n🔍 Tunnel Vision Alert: ${event.file} → ${event.totalAffected} files affected`);
    this.wsManager?.broadcast({
      type: 'tunnel-vision:detected',
      ...event,
      timestamp: Date.now()
    });
  });

  // Archetype changes
  this.fileWatcher.on('archetype:changed', (event) => {
    console.warn(`\n🏗️ Archetype Change: ${event.filePath}`);
    this.wsManager?.broadcast({
      type: 'archetype:changed',
      ...event,
      timestamp: Date.now()
    });
  });

  // Broken dependencies - re-queue affected files
  this.fileWatcher.on('dependency:broken', (event) => {
    console.warn(`\n⚠️ Broken dependency: ${event.affectedFile} (broken by ${event.brokenBy})`);
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
  console.log('âœ… File Watcher ready\n');
}

export async function _initializeWebSocket() {
  console.log('ðŸ“¡ Initializing WebSocket...');
  this.wsManager = new WebSocketManager({
    port: this.options.ports.webSocket,
    maxClients: 50
  });
  await this.wsManager.start();
  console.log('âœ… WebSocket ready\n');
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
