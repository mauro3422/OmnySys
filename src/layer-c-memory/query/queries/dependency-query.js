/**
 * @fileoverview dependency-query.js
 * 
 * Consultas de dependencias — lee desde file_dependencies (SQLite)
 * que contiene las 2557+ deps resueltas por el system graph.
 * 
 * FIX v0.9.78: Reescrito para leer file_dependencies en lugar de
 * atoms.imports (que no contenía imports resueltos a nivel de archivo).
 * 
 * @module query/queries/dependency-query
 */

import { getRepository } from '#layer-c/storage/repository/index.js';

/**
 * Builds a BFS dependency graph starting from filePath,
 * reading the file_dependencies table (populated by the system graph pipeline).
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo de entrada
 * @param {number} depth - Profundidad máxima del grafo
 * @returns {Promise<{nodes: Array, edges: Array}>}
 */
export async function getDependencyGraph(rootPath, filePath, depth) {
  const repo = getRepository(rootPath);
  if (!repo?.db) return { nodes: [], edges: [] };

  const maxDepth = depth ?? 2;
  const visited = new Set();
  const graph = { nodes: [], edges: [] };

  // Load full dependency map once into memory (fast O(1) lookups)
  const allRows = repo.db.prepare(
    'SELECT source_path, target_path FROM file_dependencies'
  ).all();

  const depMap = new Map(); // source → Set<target>
  for (const { source_path, target_path } of allRows) {
    if (!depMap.has(source_path)) depMap.set(source_path, new Set());
    depMap.get(source_path).add(target_path);
  }

  function bfs(startPath) {
    const queue = [{ path: startPath, depth: 0 }];
    visited.add(startPath);
    graph.nodes.push({ id: startPath, depth: 0 });

    while (queue.length > 0) {
      const { path: current, depth: currentDepth } = queue.shift();
      if (currentDepth >= maxDepth) continue;

      const targets = depMap.get(current) || new Set();
      for (const target of targets) {
        graph.edges.push({ from: current, to: target });
        if (!visited.has(target)) {
          visited.add(target);
          graph.nodes.push({ id: target, depth: currentDepth + 1 });
          queue.push({ path: target, depth: currentDepth + 1 });
        }
      }
    }
  }

  bfs(filePath);
  return graph;
}

/**
 * Finds all files that (transitively) depend on the given file.
 * Reads from file_dependencies table.
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getTransitiveDependents(rootPath, filePath) {
  const repo = getRepository(rootPath);
  if (!repo?.db) return [];

  // Build reverse dependency map: target → sources
  const allRows = repo.db.prepare(
    'SELECT source_path, target_path FROM file_dependencies'
  ).all();

  const reverseMap = new Map(); // target → Set<source>
  for (const { source_path, target_path } of allRows) {
    if (!reverseMap.has(target_path)) reverseMap.set(target_path, new Set());
    reverseMap.get(target_path).add(source_path);
  }

  // BFS from filePath in the reverse graph
  const visited = new Set();
  const queue = [filePath];
  visited.add(filePath);

  while (queue.length > 0) {
    const current = queue.shift();
    const sources = reverseMap.get(current) || new Set();
    for (const src of sources) {
      if (!visited.has(src)) {
        visited.add(src);
        queue.push(src);
      }
    }
  }

  // Remove the starting file itself
  visited.delete(filePath);
  return Array.from(visited);
}
