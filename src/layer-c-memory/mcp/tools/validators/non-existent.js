/**
 * @fileoverview non-existent.js
 * Valida imports que no existen en el filesystem
 */

import { checkImportExists } from '../utils/file-utils.js';
import { getImportSuggestion } from '../utils/suggestions.js';

/**
 * Encuentra imports que no existen en el filesystem
 * @param {Array} imports - Lista de imports
 * @param {string} filePath - Archivo actual
 * @param {string} projectPath - Path del proyecto
 * @returns {Array} Imports no existentes
 */
export async function findNonExistentImports(imports, filePath, projectPath) {
  const nonExistent = [];
  
  for (const imp of imports) {
    const source = imp.source || imp.module;
    if (!source) continue;
    
    // Skip node_modules
    if (!source.startsWith('.') && !source.startsWith('#')) {
      continue;
    }
    
    // Validación estricta: verificar existencia real en filesystem
    const checkResult = await checkImportExists(source, filePath, projectPath);
    
    if (!checkResult.exists) {
      nonExistent.push({
        import: source,
        line: imp.line,
        reason: 'Module does not exist in filesystem',
        attemptedPaths: checkResult.attemptedPaths.slice(0, 5),
        suggestion: getImportSuggestion(source, checkResult.attemptedPaths)
      });
    }
  }
  
  return nonExistent;
}
