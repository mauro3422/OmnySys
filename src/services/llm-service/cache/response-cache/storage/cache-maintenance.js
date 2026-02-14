/**
 * @fileoverview Cache Maintenance
 * 
 * Maintenance operations for cache cleanup and management.
 * 
 * @module llm-service/cache/response-cache/storage/cache-maintenance
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:cache');

/**
 * Clear all cache entries
 * @param {Map} cache - Cache storage
 * @param {Object} stats - Cache statistics
 */
export function clear(cache, stats) {
  cache.clear();
  stats.hits = 0;
  stats.misses = 0;
  logger.info('Cache cleared');
}

/**
 * Clean up expired entries
 * @param {Map} cache - Cache storage
 * @returns {number} Number of entries removed
 */
export function cleanup(cache) {
  const beforeSize = cache.size;
  
  for (const [key, entry] of cache.entries()) {
    if (entry.isExpired()) {
      cache.delete(key);
    }
  }

  const removed = beforeSize - cache.size;
  if (removed > 0) {
    logger.debug(`Cleaned up ${removed} expired cache entries`);
  }
  return removed;
}

/**
 * Start cleanup interval
 * @param {Object} responseCache - ResponseCache instance
 */
export function startCleanup(responseCache) {
  if (responseCache._cleanupInterval) return;
  
  responseCache._cleanupInterval = setInterval(() => {
    cleanup(responseCache._cache);
  }, responseCache.config.checkInterval);
  
  logger.debug('Cleanup interval started');
}

/**
 * Stop cleanup interval
 * @param {Object} responseCache - ResponseCache instance
 */
export function stopCleanup(responseCache) {
  if (responseCache._cleanupInterval) {
    clearInterval(responseCache._cleanupInterval);
    responseCache._cleanupInterval = null;
    logger.debug('Cleanup interval stopped');
  }
}
