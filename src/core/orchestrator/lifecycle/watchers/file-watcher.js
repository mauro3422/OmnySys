import { FileWatcher } from '../../../file-watcher/index.js';
import { BatchProcessor } from '../../../batch-processor/index.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:lifecycle');

/**
 * Initialize file watcher and batch processor
 */
export async function _initializeFileWatcher() {
  logger.info('👁️  Initializing File Watcher...');

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
  logger.info('✅ File Watcher ready\n');
}
