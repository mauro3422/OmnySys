/**
 * @fileoverview Cache Operations
 * 
 * Core cache get/set/has/delete operations.
 * 
 * @module llm-service/cache/response-cache/storage/cache-operations
 */

import { CacheEntry } from '../cache/cache-entry.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:cache');

/**
 * Get a cached response
 * @param {Map} cache - Cache storage
 * @param {Object} config - Cache configuration
 * @param {Object} stats - Cache statistics
 * @param {string} key - Cache key
 * @returns {object|null}
 */
export function get(cache, config, stats, key) {
  if (!config.enabled) {
    return null;
  }

  const entry = cache.get(key);
  
  if (!entry) {
    stats.misses++;
    return null;
  }

  if (entry.isExpired()) {
    cache.delete(key);
    stats.misses++;
    return null;
  }

  entry.touch();
  stats.hits++;
  logger.debug('Cache hit:', key);
  return entry.value;
}

/**
 * Store a response in the cache
 * @param {Map} cache - Cache storage
 * @param {Object} config - Cache configuration
 * @param {string} key - Cache key
 * @param {object} value - Response to cache
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {boolean}
 */
export function set(cache, config, key, value, ttlMs = null) {
  if (!config.enabled) {
    return false;
  }

  // Check cache size limit
  if (cache.size >= config.maxSize && !cache.has(key)) {
    evictLRU(cache);
  }

  const ttl = ttlMs || config.defaultTTL;
  const entry = new CacheEntry(key, value, ttl);
  
  cache.set(key, entry);
  logger.debug('Cache set:', key, `TTL: ${ttl}ms`);
  return true;
}

/**
 * Check if a key exists in the cache
 * @param {Map} cache - Cache storage
 * @param {Object} config - Cache configuration
 * @param {string} key
 * @returns {boolean}
 */
export function has(cache, config, key) {
  if (!config.enabled) return false;
  
  const entry = cache.get(key);
  if (!entry) return false;
  if (entry.isExpired()) {
    cache.delete(key);
    return false;
  }
  return true;
}

/**
 * Delete a cache entry
 * @param {Map} cache - Cache storage
 * @param {string} key
 * @returns {boolean}
 */
export function del(cache, key) {
  return cache.delete(key);
}

/**
 * Evict least recently used entries
 * @param {Map} cache - Cache storage
 */
function evictLRU(cache) {
  let oldest = null;
  let oldestKey = null;

  for (const [key, entry] of cache.entries()) {
    if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
      oldest = entry;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
    logger.debug('Evicted LRU entry:', oldestKey);
  }
}
