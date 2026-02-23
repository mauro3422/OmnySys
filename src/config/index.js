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
  INDEX_FILE,
  SYSTEM_MAP_FILE,
  ISSUES_FILE,
  getIndexPath,
  getSystemMapPath,
  getIssuesPath,
  getDataPath
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
