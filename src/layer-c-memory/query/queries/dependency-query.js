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
import { getAtomsInFile } from '#layer-c/storage/index.js';
import { normalizePath } from '#shared/utils/path-utils.js';
import { getFileDependents } from './file-query/dependencies/deps.js';

const IMPACT_THRESHOLDS = Object.freeze({
  directHigh: 5,
  transitiveHigh: 10,
  directMedium: 1,
  transitiveMedium: 3
});

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
 * Reads from file_dependencies table, and optionally from atom_relations (semantic).
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {Object} options - Opciones (includeSemantic = true para incluir shares_state)
 * @returns {Promise<string[]>}
 */
export async function getTransitiveDependents(rootPath, filePath, options = {}) {
  const repo = getRepository(rootPath);
  if (!repo?.db) return [];

  // Build reverse dependency map: target → sources
  const allRows = repo.db.prepare(
    'SELECT source_path, target_path FROM file_dependencies'
  ).all();

  const reverseMap = new Map(); // target_path → Set<source_path>

  function addLink(source, target) {
    if (!reverseMap.has(target)) reverseMap.set(target, new Set());
    reverseMap.get(target).add(source);
  }

  for (const { source_path, target_path } of allRows) {
    addLink(source_path, target_path);
  }

  // OPTIONAL: Include semantic relations (shares_state) from atom_relations
  if (options.includeSemantic) {
    const semanticRows = repo.db.prepare(`
      SELECT DISTINCT a1.file_path as source_file, a2.file_path as target_file
      FROM atom_relations ar
      JOIN atoms a1 ON ar.source_id = a1.id
      JOIN atoms a2 ON ar.target_id = a2.id
      WHERE ar.relation_type = 'shares_state'
    `).all();

    for (const { source_file, target_file } of semanticRows) {
      if (source_file && target_file && source_file !== target_file) {
        addLink(source_file, target_file);
      }
    }
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

export function classifyImpactSeverity({ directCount = 0, transitiveCount = 0 } = {}) {
  if (directCount > IMPACT_THRESHOLDS.directHigh || transitiveCount > IMPACT_THRESHOLDS.transitiveHigh) {
    return 'high';
  }

  if (directCount >= IMPACT_THRESHOLDS.directMedium || transitiveCount >= IMPACT_THRESHOLDS.transitiveMedium) {
    return 'medium';
  }

  return 'low';
}

export async function getFileImpactSummary(rootPath, filePath, options = {}) {
  const {
    includeSemantic = true,
    includeAtoms = true,
    fragilityThreshold = 0.5
  } = options;

  const normalizedFilePath = normalizePath(filePath, rootPath);
  const [directDependents, transitiveDependents, fileAtoms] = await Promise.all([
    getFileDependents(rootPath, normalizedFilePath, { includeSemantic }),
    getTransitiveDependents(rootPath, normalizedFilePath, { includeSemantic }),
    includeAtoms ? getAtomsInFile(rootPath, normalizedFilePath) : Promise.resolve([])
  ]);

  const directSet = new Set(
    (directDependents || [])
      .map((dep) => normalizePath(dep, rootPath))
      .filter(Boolean)
      .filter((dep) => dep !== normalizedFilePath)
  );
  const transitiveSet = new Set(
    (transitiveDependents || [])
      .map((dep) => normalizePath(dep, rootPath))
      .filter(Boolean)
      .filter((dep) => dep !== normalizedFilePath)
  );

  const highFragilityAtoms = (fileAtoms || []).filter((atom) => {
    const derivedFragility = atom.derived?.fragilityScore;
    const persistedFragility = atom.fragilityScore ?? atom.fragility_score;
    return Math.max(Number(derivedFragility) || 0, Number(persistedFragility) || 0) > fragilityThreshold;
  });

  return {
    filePath: normalizedFilePath,
    directDependents: Array.from(directSet),
    transitiveDependents: Array.from(transitiveSet),
    directCount: directSet.size,
    transitiveCount: transitiveSet.size,
    severity: classifyImpactSeverity({
      directCount: directSet.size,
      transitiveCount: transitiveSet.size
    }),
    highFragilityAtoms,
    maxFragility: highFragilityAtoms.reduce((max, atom) => {
      const derivedFragility = atom.derived?.fragilityScore;
      const persistedFragility = atom.fragilityScore ?? atom.fragility_score;
      return Math.max(max, Number(derivedFragility) || 0, Number(persistedFragility) || 0);
    }, 0)
  };
}
