/**
 * @fileoverview response-cache/index.js
 * 
 * Caching layer for LLM responses.
 * Implements TTL-based caching with configurable options.
 * 
 * @module llm-service/cache/response-cache
 */

import { createLogger } from '../../../utils/logger.js';
import { CacheEntry } from './cache/cache-entry.js';
import { generateKey } from './cache/key-generator.js';
import { get, set, has, del } from './storage/cache-operations.js';
import { clear, cleanup, startCleanup, stopCleanup } from './storage/cache-maintenance.js';
import { getStats } from './utils/stats.js';

const logger = createLogger('OmnySys:llm:cache');

/**
 * Response cache with TTL support
 */
export class ResponseCache {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxSize: config.maxSize || 1000,
      checkInterval: config.checkInterval || 60 * 1000, // 1 minute
      ...config
    };

    this._cache = new Map();
    this._cleanupInterval = null;
    this._hits = 0;
    this._misses = 0;

    if (this.config.enabled) {
      startCleanup(this);
    }

    logger.debug('ResponseCache initialized:', {
      enabled: this.config.enabled,
      defaultTTL: this.config.defaultTTL,
      maxSize: this.config.maxSize
    });
  }

  generateKey(prompt, options) {
    return generateKey(prompt, options);
  }

  get(key) {
    return get(this._cache, this.config, { hits: this._hits, misses: this._misses }, key);
  }

  set(key, value, ttlMs = null) {
    const result = set(this._cache, this.config, key, value, ttlMs);
    // Update stats reference
    this._stats = { hits: this._hits, misses: this._misses };
    return result;
  }

  has(key) {
    return has(this._cache, this.config, key);
  }

  delete(key) {
    return del(this._cache, key);
  }

  clear() {
    clear(this._cache, { hits: this._hits, misses: this._misses });
  }

  getStats() {
    return getStats(this._cache, this.config, { hits: this._hits, misses: this._misses });
  }

  enable() {
    this.config.enabled = true;
    startCleanup(this);
    logger.info('Cache enabled');
  }

  disable() {
    this.config.enabled = false;
    stopCleanup(this);
    logger.info('Cache disabled');
  }

  dispose() {
    stopCleanup(this);
    this.clear();
    logger.debug('ResponseCache disposed');
  }
}

export { CacheEntry, generateKey };
export default ResponseCache;
