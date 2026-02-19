/**
 * @fileoverview index.js
 * 
 * Config module - SSOT for all configuration
 * Re-exports all configuration constants and utilities
 * 
 * @module config
 */

// Paths
export {
  DATA_DIR,
  CACHE_DIR,
  UNIFIED_CACHE_DIR,
  INDEX_FILE,
  SYSTEM_MAP_FILE,
  ENHANCED_MAP_FILE,
  ISSUES_FILE,
  ORCHESTRATOR_STATE_FILE,
  CACHE_INDEX_FILE,
  getIndexPath,
  getSystemMapPath,
  getEnhancedMapPath,
  getIssuesPath,
  getOrchestratorStatePath,
  getCacheDir,
  getUnifiedCacheDir,
  getDataPath,
  getFileAnalysisPath
} from './paths.js';

// Limits
export {
  BATCH,
  ANALYSIS,
  LLM,
  CACHE,
  WATCHER,
  CONNECTIONS,
  ARCHITECTURAL,
  RETRY,
  SERVER
} from './limits.js';

// Change Types
export {
  FileChangeType,
  SemanticChangeType,
  Priority,
  BatchState,
  AnalysisState,
  ConnectionType,
  ArchetypeType,
} from './change-types.js';
