/**
 * Data loading utilities for check command
 * @module src/cli/commands/check/data-loader
 */

import fs from 'fs/promises';
import path from 'path';
import { hasExistingAnalysis } from '#layer-c/storage/setup/index.js';
import { normalizePath } from '../../utils/paths.js';

/**
 * Loads file data from system map
 * @param {string} projectPath - Project root path
 * @param {string} filePath - File path to check
 * @returns {Promise<{success: boolean, fileData?: object, matchedPath?: string, systemMap?: object, error?: string, exitCode?: number, availableFiles?: string[], hint?: string}>} Load result
 */
export async function loadFileData(projectPath, filePath) {
  const hasAnalysis = await hasExistingAnalysis(projectPath);
  if (!hasAnalysis) {
    return {
      success: false,
      error: 'No analysis data found',
      exitCode: 1,
      hint: 'Run first: omnysystem analyze .'
    };
  }

  const systemMapPath = path.join(projectPath, 'system-map-enhanced.json');
  const systemMapContent = await fs.readFile(systemMapPath, 'utf-8');
  const systemMap = JSON.parse(systemMapContent);

  const normalizedFilePath = normalizePath(filePath);
  let fileData = null;
  let matchedPath = null;

  for (const [key, value] of Object.entries(systemMap.files || {})) {
    const normalizedKey = normalizePath(key);
    if (normalizedKey.endsWith(normalizedFilePath) || normalizedFilePath.endsWith(normalizedKey)) {
      fileData = value;
      matchedPath = key;
      break;
    }
  }

  if (!fileData) {
    const availableFiles = Object.keys(systemMap.files || {}).slice(0, 10);
    return {
      success: false,
      error: `File not found in analysis: ${filePath}`,
      exitCode: 1,
      availableFiles
    };
  }

  return { success: true, fileData, matchedPath, systemMap };
}
