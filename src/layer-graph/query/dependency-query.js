/**
 * @fileoverview dependency-query.js
 * 
 * Consultas de dependencias
 * 
 * @module query/queries/dependency-query
 */

import { getFileAnalysis } from '#layer-a/query/queries/file-query/core/single-file.js';
import { getProjectMetadata } from '#layer-a/query/queries/project-query.js';

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
    if (currentDepth > maxDepth) return false;
    if (visited.has(currentPath)) return true;

    try {
      const analysis = await getFileAnalysis(rootPath, currentPath);
      visited.add(currentPath);
      graph.nodes.push({ id: currentPath, depth: currentDepth });
      const imports = analysis?.imports || [];
      
      for (const imp of imports) {
        const target = imp.resolvedPath || imp.source;
        const targetLoaded = await traverse(target, currentDepth + 1, false);
        if (targetLoaded) {
          graph.edges.push({ from: currentPath, to: target });
        }
      }
      return true;
    } catch {
      if (isRoot) {
        visited.add(currentPath);
        graph.nodes.push({ id: currentPath, depth: currentDepth });
      }
      // Archivo no encontrado, continuar
      return false;
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
