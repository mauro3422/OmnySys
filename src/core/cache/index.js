/**
 * @fileoverview Cache - API Unificada
 * 
 * Sistema de cache centralizado para OmnySys.
 * 
 * @module core/cache
 */

// Manager (UnifiedCacheManager)
export { 
  UnifiedCacheManager,
  ChangeType,
  detectChangeType,
  hashContent
} from './manager/index.js';

// Singleton factory — usar en lugar de `new UnifiedCacheManager + initialize()`
export {
  getCacheManager,
  invalidateCacheInstance,
  getCacheInstanceCount,
  getCacheInstanceKeys
} from './singleton.js';

// Integration
export {
  analyzeWithUnifiedCache,
  analyzeLLMWithUnifiedCache,
  // Alias backward-compatible
  analyzeLLMWithUnifiedCache as analyzeWithLLMCache
} from './integration.js';

// Invalidator
export {
  CacheInvalidator,
  InvalidationEvents
} from './invalidator/index.js';

// Namespace exports
import * as managerModule from './manager/index.js';
import * as integrationModule from './integration.js';
import * as invalidatorModule from './invalidator/index.js';
import * as singletonModule from './singleton.js';

export const manager = managerModule;
export const integration = integrationModule;
export const invalidator = invalidatorModule;
export const singleton = singletonModule;
