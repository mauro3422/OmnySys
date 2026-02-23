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
 * Issues file name
 * @constant {string}
 */
export const ISSUES_FILE = 'semantic-issues.json';

// DEAD CODE REMOVED: ENHANCED_MAP_FILE, ORCHESTRATOR_STATE_FILE, CACHE_INDEX_FILE, UNIFIED_CACHE_DIR, CACHE_INDEX_FILE

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
 * Full path to semantic-issues.json
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
export function getIssuesPath(projectPath) {
  return path.join(projectPath, DATA_DIR, ISSUES_FILE);
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

// DEAD CODE REMOVED: getEnhancedMapPath, getOrchestratorStatePath, getCacheDir, getUnifiedCacheDir, getFileAnalysisPath
