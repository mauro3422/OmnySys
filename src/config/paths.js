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
 * Issues file name (still used for CLI output)
 * @constant {string}
 */
export const ISSUES_FILE = 'semantic-issues.json';

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

// DEAD CODE REMOVED: CACHE_DIR, INDEX_FILE, SYSTEM_MAP_FILE, getIndexPath, getSystemMapPath
