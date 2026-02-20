/**
 * @fileoverview path-resolver.js
 * Resuelve paths de imports a rutas del filesystem
 */

import path from 'path';

/**
 * Resuelve un import a posibles rutas del filesystem
 * @param {string} importSource - Path del import
 * @param {string} currentFile - Archivo que hace el import
 * @param {string} projectPath - Path del proyecto
 * @returns {Array} Posibles rutas
 */
export function resolveImportPath(importSource, currentFile, projectPath) {
  const currentDir = path.dirname(currentFile);
  
  // Relative imports
  if (importSource.startsWith('./') || importSource.startsWith('../')) {
    const resolved = path.resolve(currentDir, importSource);
    // Try with and without extension (avoid double .js.js)
    const hasExt = path.extname(resolved);
    if (hasExt) {
      return [resolved];
    }
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
    return [resolved, ...extensions.map(ext => resolved + ext)];
  }
  
  // Path aliases (e.g., #core/*, #layer-c/*)
  if (importSource.startsWith('#')) {
    const aliasMap = {
      '#core': 'src/core',
      '#layer-a': 'src/layer-a-static',
      '#layer-b': 'src/layer-b-semantic',
      '#layer-c': 'src/layer-c-memory',
      '#layer-graph': 'src/layer-graph',
      '#ai': 'src/ai',
      '#services': 'src/services',
      '#utils': 'src/utils',
      '#config': 'src/config',
      '#shared': 'src/shared',
      '#cli': 'src/cli'
    };
    
    for (const [alias, realPath] of Object.entries(aliasMap)) {
      if (importSource.startsWith(alias)) {
        const relativePath = importSource.slice(alias.length + 1);
        // Avoid double extension
        const hasExt = path.extname(relativePath);
        const finalPath = hasExt ? relativePath : relativePath + '.js';
        return [path.join(projectPath, realPath, finalPath)];
      }
    }
  }
  
  // Node modules
  if (!importSource.startsWith('.')) {
    return ['node_module'];
  }
  
  return [importSource];
}
