/**
 * @fileoverview circular-deps.js
 * Detecta dependencias circulares entre archivos
 */

/**
 * DFS helper para detectar ciclos
 * @param {string} node - Nodo actual
 * @param {Array} path - Path actual
 * @param {Map} graph - Grafo de dependencias
 * @param {Set} recursionStack - Stack de recursión
 * @param {Array} cycles - Ciclos encontrados
 */
function dfs(node, path, graph, recursionStack, cycles) {
  if (recursionStack.has(node)) {
    // Found a cycle
    const cycleStart = path.indexOf(node);
    const cycle = path.slice(cycleStart);
    cycles.push({
      files: cycle,
      length: cycle.length,
      severity: cycle.length > 5 ? 'critical' : (cycle.length > 3 ? 'high' : 'medium')
    });
    return;
  }
  
  if (path.includes(node)) {
    // Already visited, not a cycle
    return;
  }
  
  recursionStack.add(node);
  path.push(node);
  
  const neighbors = graph.get(node) || [];
  for (const neighbor of neighbors) {
    dfs(neighbor, [...path], graph, recursionStack, cycles);
  }
  
  recursionStack.delete(node);
}

/**
 * Encuentra dependencias circulares
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Ciclos encontrados
 */
export function findCircularDependencies(atoms) {
  // Build dependency graph
  const graph = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    
    if (!graph.has(atom.filePath)) {
      graph.set(atom.filePath, new Set());
    }
    
    // Add imports as dependencies
    if (atom.imports) {
      for (const imp of atom.imports) {
        const source = imp.source || imp.module;
        if (source && (source.startsWith('.') || source.startsWith('#'))) {
          // Normalize the path (simplified)
          graph.get(atom.filePath).add(source);
        }
      }
    }
  }
  
  // Find cycles using DFS
  const cycles = [];
  const recursionStack = new Set();
  
  for (const file of graph.keys()) {
    if (!recursionStack.has(file)) {
      dfs(file, [], graph, recursionStack, cycles);
    }
  }
  
  // Remove duplicate cycles (same files, different starting point)
  const uniqueCycles = [];
  const seen = new Set();
  
  for (const cycle of cycles) {
    const key = cycle.files.slice().sort().join(',');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCycles.push(cycle);
    }
  }
  
  return uniqueCycles.slice(0, 10); // Limit to top 10 cycles
}
