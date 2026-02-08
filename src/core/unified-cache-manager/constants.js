/**
 * @fileoverview constants.js
 * 
 * Unified Cache Manager Constants
 * 
 * @module unified-cache-manager/constants
 */

// Import from centralized config
import { CACHE_DIR as ConfigCacheDir, INDEX_FILE as ConfigIndexFile } from '#config/paths.js';
import { SemanticChangeType } from '#config/change-types.js';

/**
 * Cache directory path
 * @deprecated Use CACHE_DIR from '#config/paths.js' instead
 */
export const CACHE_DIR = ConfigCacheDir;

/**
 * Index file name
 * @deprecated Use INDEX_FILE from '#config/paths.js' instead
 */
export const INDEX_FILE = ConfigIndexFile;

/**
 * Tipos de cambios detectados (semánticos)
 * @readonly
 * @enum {string}
 * @deprecated Use SemanticChangeType from '#config/change-types.js' instead
 */
export const ChangeType = SemanticChangeType;
