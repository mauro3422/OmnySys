/**
 * extractors/file-extractor.js
 * Single file TypeScript analysis
 */

import { extractTypeScriptDefinitions } from '../extractor.js';
import { detectPotentialBreakingChanges } from '../connections/breaking-changes.js';

/**
 * Extract TypeScript analysis from a single file
 * @param {string} filePath - File path
 * @param {string} code - Source code
 * @returns {Object} - Complete analysis
 */
export function extractTypeScriptFromFile(filePath, code) {
  const definitions = extractTypeScriptDefinitions(code);

  return {
    filePath,
    ...definitions,
    breakingChangeAlerts: detectPotentialBreakingChanges({ [filePath]: definitions }),
    timestamp: new Date().toISOString()
  };
}
