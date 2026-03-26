/**
 * @fileoverview Cache Invalidator core implementation.
 *
 * @module cache-invalidator/cache-invalidator-core
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger.js';
import { DEFAULT_CONFIG, InvalidationEvents } from './constants.js';
import { RamStorageOperations, DiskStorageOperations, IndexOperations } from './storage-operations.js';
import { AtomicTransaction } from './atomic-operation.js';
import { createInvalidationOrchestrator } from './operations/invalidation-orchestrator.js';
import { createRetryManager } from './operations/retry-manager.js';
import { createStateValidator } from './validators/state-validator.js';
import {
  invalidateSync,
  invalidateWithRetry,
  invalidateMultiple,
  getFileStatus,
  cleanup,
  getCacheInvalidatorStats
} from './index-methods.js';

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
}

Object.assign(CacheInvalidator.prototype, {
  invalidateSync,
  invalidateWithRetry,
  invalidateMultiple,
  getFileStatus,
  cleanup,
  getCacheInvalidatorStats
});

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

export { InvalidationEvents };
export default CacheInvalidator;
