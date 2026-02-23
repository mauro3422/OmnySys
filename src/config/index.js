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
  ISSUES_FILE,
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
