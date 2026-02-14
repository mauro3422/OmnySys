/**
 * @fileoverview Cache Entry
 * 
 * Represents a single cache entry with TTL support.
 * 
 * @module llm-service/cache/response-cache/cache/cache-entry
 */

/**
 * Cache entry
 */
export class CacheEntry {
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

export default CacheEntry;
