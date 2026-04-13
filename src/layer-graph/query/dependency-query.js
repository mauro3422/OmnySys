/**
 * @fileoverview dependency-query.js
 * 
 * Consultas de dependencias
 * 
 * @module query/queries/dependency-query
 */

import { getFileAnalysis } from '#layer-c/query/queries/file-query/core/single-file.js';
import { getProjectMetadata } from '#layer-c/query/queries/project-query.js';

/**
 * Obtiene el grafo de dependencias de un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {number} depth - Profundidad máxima
 * @returns {Promise<object>}
 */
export async function getDependencyGraph(rootPath, filePath, depth) {
  const maxDepth = depth ?? 2;
  const visited = new Set();
  const graph = { nodes: [], edges: [] };

  async function traverse(currentPath, currentDepth, isRoot = false) {
    if (visited.has(currentPath) || currentDepth > maxDepth) return;
    visited.add(currentPath);
    graph.nodes.push(currentPath);

    try {
      const analysis = await getFileAnalysis(rootPath, currentPath);
      const imports = analysis?.imports || [];

      for (const imp of imports) {
        if (imp.resolvedPath) {
          graph.edges.push({ from: currentPath, to: imp.resolvedPath });
          await traverse(imp.resolvedPath, currentDepth + 1);
        }
      }
    } catch (err) {
      // Skip files that can't be analyzed
    }
  }

  await traverse(filePath, 0, true);
  return graph;
}

/**
 * Encuentra archivos que dependen transitivamente de uno dado
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getTransitiveDependents(rootPath, filePath) {
  const allFiles = await getProjectMetadata(rootPath).then(m => m.files || []);
  const dependents = new Set();
  
  for (const file of allFiles) {
    try {
      const analysis = await getFileAnalysis(rootPath, file);
      const imports = analysis?.imports || [];
      
      if (imports.some(imp => 
        imp.resolvedPath === filePath || imp.source === filePath
      )) {
        dependents.add(file);
      }
    } catch {
      // Ignorar errores
    }
  }
  
  return Array.from(dependents);
}
