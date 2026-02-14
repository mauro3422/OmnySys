/**
 * @fileoverview Cache Statistics
 * 
 * Statistics utilities for cache monitoring.
 * 
 * @module llm-service/cache/response-cache/utils/stats
 */

/**
 * Get cache statistics
 * @param {Map} cache - Cache storage
 * @param {Object} config - Cache configuration
 * @param {Object} stats - Cache statistics
 * @returns {object}
 */
export function getStats(cache, config, stats) {
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
  
  let expiredCount = 0;
  for (const entry of cache.values()) {
    if (entry.isExpired()) expiredCount++;
  }

  return {
    enabled: config.enabled,
    size: cache.size,
    maxSize: config.maxSize,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${hitRate.toFixed(2)}%`,
    expiredEntries: expiredCount,
    defaultTTL: config.defaultTTL
  };
}
