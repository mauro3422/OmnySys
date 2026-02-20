/**
 * @fileoverview broken.js
 * Valida imports que no se pueden resolver
 */

import { resolveImportPath } from '../resolvers/path-resolver.js';
import { fileExists } from '../utils/file-utils.js';

/**
 * Encuentra imports rotos (que no se pueden resolver)
 * @param {Array} imports - Lista de imports
 * @param {string} filePath - Archivo actual
 * @param {string} projectPath - Path del proyecto
 * @param {Array} allFiles - Lista de todos los archivos
 * @returns {Array} Imports rotos encontrados
 */
export async function findBrokenImports(imports, filePath, projectPath, allFiles) {
  const broken = [];
  
  for (const imp of imports) {
    const source = imp.source || imp.module;
    if (!source) continue;
    
    // Skip node_modules
    if (!source.startsWith('.') && !source.startsWith('#')) {
      continue;
    }
    
    // Check if import resolves
    const possiblePaths = resolveImportPath(source, filePath, projectPath);
    let found = false;
    
    for (const p of possiblePaths) {
      if (p === 'node_module') {
        found = true;
        break;
      }
      if (await fileExists(p) || allFiles.some(f => f === p || f.replace(/\\/g, '/') === p.replace(/\\/g, '/'))) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      broken.push({
        import: source,
        line: imp.line,
        reason: 'Cannot resolve import path',
        attemptedPaths: possiblePaths.slice(0, 3)
      });
    }
  }
  
  return broken;
}
