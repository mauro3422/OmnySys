/**
 * @fileoverview cycle-detector.js
 * 
 * Algoritmo para detectar ciclos en el grafo de dependencias.
 * Usa DFS con detección de back-edges.
 * 
 * @module graph/algorithms/cycle-detector
 */

/**
 * Detecta ciclos en el grafo usando DFS
 * 
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @param {Function} getDependencies - Función que recibe un nodo y retorna sus dependencias
 * @returns {string[][]} - Array de ciclos encontrados (cada ciclo es un array de paths)
 */
export function detectCycles(files, getDependencies = (node) => node.dependsOn) {
  if (files == null) return [];
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(node, path) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const fileNode = files[node];
    if (!fileNode) {
      recursionStack.delete(node);
      return false;
    }

    const dependencies = getDependencies(fileNode);
    if (!dependencies || !Array.isArray(dependencies)) {
      recursionStack.delete(node);
      return false;
    }
    
    for (const dependent of dependencies) {
      if (!visited.has(dependent)) {
        if (dfs(dependent, [...path])) {
          return true;
        }
      } else if (recursionStack.has(dependent)) {
        // Ciclo encontrado
        const cycleStartIndex = path.indexOf(dependent);
        const cycle = path.slice(cycleStartIndex).concat([dependent]);
        cycles.push(cycle);
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const filePath of Object.keys(files)) {
    if (!visited.has(filePath)) {
      dfs(filePath, []);
    }
  }

  return cycles;
}

/**
 * Verifica si un archivo específico está en un ciclo
 * 
 * @param {string} filePath
 * @param {string[][]} cycles
 * @returns {boolean}
 */
export function isInCycle(filePath, cycles) {
  if (!cycles || !Array.isArray(cycles)) return false;
  return cycles.some(cycle => cycle.includes(filePath));
}

/**
 * Obtiene todos los archivos involucrados en ciclos
 * 
 * @param {string[][]} cycles
 * @returns {Set<string>}
 */
export function getFilesInCycles(cycles) {
  const files = new Set();
  if (!cycles || !Array.isArray(cycles)) return files;
  for (const cycle of cycles) {
    if (Array.isArray(cycle)) {
      for (const file of cycle) {
        files.add(file);
      }
    }
  }
  return files;
}
