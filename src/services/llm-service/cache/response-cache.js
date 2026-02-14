/**
 * @fileoverview response-cache.js
 * 
 * Caching layer for LLM responses.
 * Implements TTL-based caching with configurable options.
 * 
 * @module llm-service/cache/response-cache
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:cache');

/**
 * Cache entry
 */
class CacheEntry {
  constructor(key, value, ttlMs) {
    this.key = key;
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + ttlMs;
    this.accessCount = 0;
    this.lastAccessedAt = this.createdAt;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  touch() {
    this.accessCount++;
    this.lastAccessedAt = Date.now();
  }
}

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
      this._startCleanup();
    }

    logger.debug('ResponseCache initialized:', {
      enabled: this.config.enabled,
      defaultTTL: this.config.defaultTTL,
      maxSize: this.config.maxSize
    });
  }

  /**
   * Generate cache key from request
   * @param {string} prompt - The prompt
   * @param {Object} options - Request options
   * @returns {string}
   */
  generateKey(prompt, options = {}) {
    // Create a deterministic key based on prompt and relevant options
    const keyParts = [
      prompt,
      options.model || 'default',
      options.systemPrompt || '',
      options.temperature,
      options.maxTokens
    ];
    
    // Simple hash function
    const str = JSON.stringify(keyParts);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `cache_${hash.toString(36)}`;
  }

  /**
   * Get a cached response
   * @param {string} key - Cache key
   * @returns {object|null}
   */
  get(key) {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this._cache.get(key);
    
    if (!entry) {
      this._misses++;
      return null;
    }

    if (entry.isExpired()) {
      this._cache.delete(key);
      this._misses++;
      return null;
    }

    entry.touch();
    this._hits++;
    logger.debug('Cache hit:', key);
    return entry.value;
  }

  /**
   * Store a response in the cache
   * @param {string} key - Cache key
   * @param {object} value - Response to cache
   * @param {number} ttlMs - Time to live in milliseconds
   * @returns {boolean}
   */
  set(key, value, ttlMs = null) {
    if (!this.config.enabled) {
      return false;
    }

    // Check cache size limit
    if (this._cache.size >= this.config.maxSize && !this._cache.has(key)) {
      this._evictLRU();
    }

    const ttl = ttlMs || this.config.defaultTTL;
    const entry = new CacheEntry(key, value, ttl);
    
    this._cache.set(key, entry);
    logger.debug('Cache set:', key, `TTL: ${ttl}ms`);
    return true;
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    if (!this.config.enabled) return false;
    
    const entry = this._cache.get(key);
    if (!entry) return false;
    if (entry.isExpired()) {
      this._cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a cache entry
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    return this._cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this._cache.clear();
    this._hits = 0;
    this._misses = 0;
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getStats() {
    const total = this._hits + this._misses;
    const hitRate = total > 0 ? (this._hits / total) * 100 : 0;
    
    let expiredCount = 0;
    for (const entry of this._cache.values()) {
      if (entry.isExpired()) expiredCount++;
    }

    return {
      enabled: this.config.enabled,
      size: this._cache.size,
      maxSize: this.config.maxSize,
      hits: this._hits,
      misses: this._misses,
      hitRate: `${hitRate.toFixed(2)}%`,
      expiredEntries: expiredCount,
      defaultTTL: this.config.defaultTTL
    };
  }

  /**
   * Enable the cache
   */
  enable() {
    this.config.enabled = true;
    this._startCleanup();
    logger.info('Cache enabled');
  }

  /**
   * Disable the cache
   */
  disable() {
    this.config.enabled = false;
    this._stopCleanup();
    logger.info('Cache disabled');
  }

  /**
   * Dispose of cache resources
   */
  dispose() {
    this._stopCleanup();
    this.clear();
    logger.debug('ResponseCache disposed');
  }

  /**
   * Evict least recently used entries
   * @private
   */
  _evictLRU() {
    let oldest = null;
    let oldestKey = null;

    for (const [key, entry] of this._cache.entries()) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._cache.delete(oldestKey);
      logger.debug('Evicted LRU entry:', oldestKey);
    }
  }

  /**
   * Clean up expired entries
   * @private
   */
  _cleanup() {
    const beforeSize = this._cache.size;
    
    for (const [key, entry] of this._cache.entries()) {
      if (entry.isExpired()) {
        this._cache.delete(key);
      }
    }

    const removed = beforeSize - this._cache.size;
    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Start cleanup interval
   * @private
   */
  _startCleanup() {
    if (this._cleanupInterval) return;
    
    this._cleanupInterval = setInterval(() => {
      this._cleanup();
    }, this.config.checkInterval);
    
    logger.debug('Cleanup interval started');
  }

  /**
   * Stop cleanup interval
   * @private
   */
  _stopCleanup() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
      logger.debug('Cleanup interval stopped');
    }
  }
}

export default ResponseCache;
