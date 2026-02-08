/**
 * @fileoverview paths.js
 * 
 * SSOT - Single Source of Truth for all paths in OmnySys
 * Centralizes all directory and file paths to avoid hardcoding
 * 
 * @module config/paths
 */

import path from 'path';

/**
 * Base directory name for all OmnySys data
 * @constant {string}
 */
export const DATA_DIR = '.omnysysdata';

/**
 * Cache subdirectory
 * @constant {string}
 */
export const CACHE_DIR = `${DATA_DIR}/cache`;

/**
 * Unified cache subdirectory  
 * @constant {string}
 */
export const UNIFIED_CACHE_DIR = `${DATA_DIR}/unified-cache`;

/**
 * Index file name
 * @constant {string}
 */
export const INDEX_FILE = 'index.json';

/**
 * System map file name
 * @constant {string}
 */
export const SYSTEM_MAP_FILE = 'system-map.json';

/**
 * Enhanced system map file name
 * @constant {string}
 */
export const ENHANCED_MAP_FILE = 'system-map-enhanced.json';

/**
 * Issues file name
 * @constant {string}
 */
export const ISSUES_FILE = 'semantic-issues.json';

/**
 * Orchestrator state file name
 * @constant {string}
 */
export const ORCHESTRATOR_STATE_FILE = 'orchestrator-state.json';

/**
 * Cache index file name
 * @constant {string}
 */
export const CACHE_INDEX_FILE = 'cache-index.json';

/**
 * Full path to index.json
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getIndexPath(projectPath) {
  return path.join(projectPath, DATA_DIR, INDEX_FILE);
}

/**
 * Full path to system-map.json
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getSystemMapPath(projectPath) {
  return path.join(projectPath, DATA_DIR, SYSTEM_MAP_FILE);
}

/**
 * Full path to system-map-enhanced.json
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getEnhancedMapPath(projectPath) {
  return path.join(projectPath, DATA_DIR, ENHANCED_MAP_FILE);
}

/**
 * Full path to semantic-issues.json
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getIssuesPath(projectPath) {
  return path.join(projectPath, DATA_DIR, ISSUES_FILE);
}

/**
 * Full path to orchestrator-state.json
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getOrchestratorStatePath(projectPath) {
  return path.join(projectPath, DATA_DIR, ORCHESTRATOR_STATE_FILE);
}

/**
 * Full path to cache directory
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getCacheDir(projectPath) {
  return path.join(projectPath, CACHE_DIR);
}

/**
 * Full path to unified cache directory
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getUnifiedCacheDir(projectPath) {
  return path.join(projectPath, UNIFIED_CACHE_DIR);
}

/**
 * Full path to any file in .omnysysdata
 * @param {string} projectPath - Project root path
 * @param {string} filename - Filename (can include subdirectories)
 * @returns {string}
 */
export function getDataPath(projectPath, filename) {
  return path.join(projectPath, DATA_DIR, filename);
}

/**
 * Full path to a file's analysis data
 * @param {string} projectPath - Project root path
 * @param {string} filePath - Relative file path
 * @returns {string}
 */
export function getFileAnalysisPath(projectPath, filePath) {
  return path.join(projectPath, DATA_DIR, 'files', `${filePath}.json`);
}
