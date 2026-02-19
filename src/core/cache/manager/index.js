import path from 'path';

import { CACHE_DIR, INDEX_FILE } from '#config/paths.js';
import { SemanticChangeType as ChangeType } from '#config/change-types.js';
import { detectChangeType } from './utils.js';

import * as storage from './storage.js';
import * as register from './register.js';
import * as dependency from './dependency.js';
import * as ramCache from './ram-cache.js';
import * as stats from './stats.js';
import * as cleanup from './cleanup.js';
import * as atoms from './atoms.js';

/**
 * Unified Cache Manager
 */
class UnifiedCacheManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.cacheDir = path.join(projectPath, CACHE_DIR);
    this.indexPath = path.join(this.cacheDir, INDEX_FILE);

    // Índice en memoria (persistente)
    this.index = {
      version: '1.0.0',
      timestamp: Date.now(),
      entries: {}, // filePath -> CacheEntry
      dependencyGraph: {}, // filePath -> [filePaths]
      metadata: {
        totalFiles: 0,
        totalDependencies: 0
      }
    };

    // Caché RAM (reemplaza QueryCache)
    this.ramCache = new Map();
    this.defaultTtlMinutes = 5;
    this.maxRamEntries = 1000;

    this.loaded = false;
  }
}

Object.assign(
  UnifiedCacheManager.prototype,
  storage,
  register,
  dependency,
  ramCache,
  stats,
  cleanup,
  atoms
);

export { UnifiedCacheManager, ChangeType, detectChangeType };
export { hashContent } from './utils.js';
export default UnifiedCacheManager;
