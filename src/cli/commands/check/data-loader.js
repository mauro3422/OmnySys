/**
 * Data loading utilities for check command
 * Uses SQLite for data loading
 * @module src/cli/commands/check/data-loader
 */

import { hasExistingAnalysis } from '#layer-c/storage/setup/index.js';
import { getRepository } from '#layer-c/storage/repository/repository-factory.js';
import { normalizePath } from '../../utils/paths.js';

/**
 * Loads file data from SQLite
 * @param {string} projectPath - Project root path
 * @param {string} filePath - File path to check
 * @returns {Promise<{success: boolean, fileData?: object, matchedPath?: string, atoms?: object[], error?: string, exitCode?: number, availableFiles?: string[], hint?: string}>} Load result
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

  try {
    const repo = getRepository(projectPath);
    
    const normalizedFilePath = normalizePath(filePath);
    
    const atoms = repo.query({ filePath: normalizedFilePath, limit: 100 });
    
    if (!atoms || atoms.length === 0) {
      const allAtoms = repo.query({ limit: 1000 });
      const availableFiles = [...new Set(allAtoms.map(a => a.file_path))].slice(0, 10);
      
      return {
        success: false,
        error: `File not found in analysis: ${filePath}`,
        exitCode: 1,
        availableFiles
      };
    }
    
    const fileData = {
      filePath: normalizedFilePath,
      atoms: atoms,
      totalAtoms: atoms.length,
      imports: atoms.flatMap(a => a.imports || []),
      exports: atoms.filter(a => a.isExported).map(a => a.name)
    };
    
    return { 
      success: true, 
      fileData, 
      matchedPath: normalizedFilePath, 
      atoms 
    };
  } catch (error) {
    return {
      success: false,
      error: `Error loading from SQLite: ${error.message}`,
      exitCode: 1
    };
  }
}
