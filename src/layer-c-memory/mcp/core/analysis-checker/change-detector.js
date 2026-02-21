/**
 * Change detection utilities
 * @module mcp/core/analysis-checker/change-detector
 */

import { scanCurrentFiles } from './file-scanner.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:analysis:checker');

/**
 * Detectar cambios entre proyecto y cache
 * @param {string} projectPath - Project root path
 * @param {Object} metadata - Project metadata
 * @returns {Promise<Object>} - Changes object
 */
export async function detectCacheChanges(projectPath, metadata) {
  try {
    const currentFiles = await scanCurrentFiles(projectPath);
    const currentFileMap = new Map(currentFiles.map(f => [f.path, f]));
    
    const cachedFiles = metadata?.fileIndex || metadata?.files || {};
    const cachedFileSet = new Set(Object.keys(cachedFiles));
    
    const changes = {
      newFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
      unchangedFiles: []
    };
    
    for (const [filePath, fileInfo] of currentFileMap) {
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      if (!cachedFileSet.has(normalizedPath)) {
        changes.newFiles.push(normalizedPath);
      } else {
        const cachedInfo = cachedFiles[normalizedPath];
        const cachedTime = cachedInfo?.lastAnalyzed || cachedInfo?.metadata?.lastAnalyzed || 0;
        
        if (fileInfo.mtime > cachedTime) {
          changes.modifiedFiles.push(normalizedPath);
        } else {
          changes.unchangedFiles.push(normalizedPath);
        }
      }
    }
    
    for (const cachedPath of cachedFileSet) {
      if (!currentFileMap.has(cachedPath)) {
        changes.deletedFiles.push(cachedPath);
      }
    }
    
    return changes;
  } catch (error) {
    logger.warn('   ⚠️  Failed to detect cache changes:', error.message);
    return { newFiles: [], modifiedFiles: [], deletedFiles: [], unchangedFiles: [], error: true };
  }
}
