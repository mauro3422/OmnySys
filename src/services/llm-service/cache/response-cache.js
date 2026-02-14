/**
 * @fileoverview response-cache.js
 * 
 * Caching layer for LLM responses.
 * Implements TTL-based caching with configurable options.
 * 
 * @module llm-service/cache/response-cache
 * @deprecated Use modular version: response-cache/index.js
 */

// Re-export from modular version for backward compatibility
export { 
  ResponseCache, 
  CacheEntry, 
  generateKey,
  default 
} from './response-cache/index.js';
