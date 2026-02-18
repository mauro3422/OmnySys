/**
 * @fileoverview Cache Invalidator - Main Entry Point (Refactored)
 * 
 * Sistema de invalidación de caché síncrono y atómico - Ahora modular
 * 
 * @module cache-invalidator
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger.js';
import { DEFAULT_CONFIG, InvalidationEvents } from './constants.js';
import { RamStorageOperations, DiskStorageOperations, IndexOperations } from './storage-operations.js';
import { AtomicTransaction, OperationFactory } from './atomic-operation.js';
import { createInvalidationOrchestrator } from './operations/invalidation-orchestrator.js';
import { createRetryManager } from './operations/retry-manager.js';
import { createStateValidator } from './validators/state-validator.js';

const logger = createLogger('OmnySys:cache:invalidator');

/**
 * Cache Invalidator - Componente principal
 */
export class CacheInvalidator extends EventEmitter {
  constructor(cacheManager, config = {}) {
    super();

    this.cache = cacheManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize operations (DIP)
    this.ramOps = new RamStorageOperations(cacheManager);
    this.diskOps = new DiskStorageOperations(cacheManager.projectPath);
    this.indexOps = new IndexOperations(cacheManager);

    // State
    this.pendingOperations = new Map();

    // Create bound emit
    this._emit = this.emit.bind(this);

    // Initialize modules
    this.orchestrator = createInvalidationOrchestrator({
      ramOps: this.ramOps,
      diskOps: this.diskOps,
      indexOps: this.indexOps,
      config: this.config,
      emit: this._emit,
      AtomicTransaction
    });

    this.retryManager = createRetryManager({
      config: this.config,
      emit: this._emit,
      delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
    });

    this.validator = createStateValidator(cacheManager);

    logger.info('🛡️  Cache Invalidator initialized');
  }

  /**
   * Invalidate cache synchronously
   * @param {string} filePath - File path
   * @returns {Promise<Object>} Result
   */
  async invalidateSync(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    logger.info(`🗑️  Invalidating cache for: ${normalizedPath}`);

    const transaction = this.orchestrator.createTransaction(normalizedPath);
    const result = await this.orchestrator.execute(transaction, normalizedPath);

    if (result.success) {
      logger.info(`✅ Cache invalidated in ${result.duration}ms: ${normalizedPath}`);
    } else {
      logger.error(`❌ Cache invalidation failed: ${normalizedPath}`, result.error);
    }

    return result;
  }

  /**
   * Invalidate with retry
   * @param {string} filePath - File path
   * @param {number} maxRetries - Max retries
   * @returns {Promise<Object>} Result
   */
  async invalidateWithRetry(filePath, maxRetries = null) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const retries = maxRetries || this.config.maxRetries;

    logger.info(`🔄 Invalidating with retry (${retries} max): ${normalizedPath}`);

    return this.retryManager.executeWithRetry(
      () => this.invalidateSync(filePath),
      normalizedPath,
      retries
    );
  }

  /**
   * Invalidate multiple files
   * @param {string[]} filePaths - File paths
   * @returns {Promise<Object>} Results
   */
  async invalidateMultiple(filePaths) {
    logger.info(`🗑️  Invalidating ${filePaths.length} files...`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const filePath of filePaths) {
      const result = await this.invalidateSync(filePath);
      results.push(result);

      if (result.success) successCount++;
      else failCount++;
    }

    logger.info(`✅ Completed: ${successCount} success, ${failCount} failed`);

    return {
      total: filePaths.length,
      success: successCount,
      failed: failCount,
      results
    };
  }

  /**
   * Get invalidation status
   * @param {string} filePath - File path
   * @returns {Object} Status
   */
  getStatus(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return this.validator.getStatus(normalizedPath);
  }

  /**
   * Cleanup old backups
   */
  async cleanup() {
    await this.diskOps.cleanupBackups();
  }

  /**
   * Get statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      pendingOperations: this.pendingOperations.size,
      config: this.config
    };
  }
}

// Singleton
let invalidator = null;

export function getCacheInvalidator(cacheManager, config) {
  if (!invalidator) {
    invalidator = new CacheInvalidator(cacheManager, config);
  }
  return invalidator;
}

export function resetCacheInvalidator() {
  invalidator = null;
}

export default CacheInvalidator;
