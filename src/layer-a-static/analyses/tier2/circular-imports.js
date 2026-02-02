/**
 * Circular Imports Analyzer
 *
 * Responsabilidad:
 * - Encontrar circular imports (A imports B, B imports A)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de imports circulares
 */
export function findCircularImports(systemMap) {
  const cycles = systemMap.metadata.cyclesDetected || [];
  const circularImportPairs = [];

  // Procesar ciclos detectados
  for (const cycle of cycles) {
    if (cycle && Array.isArray(cycle) && cycle.length >= 2) {
      // Verificar que sea un ciclo directo (A -> B -> A)
      for (let i = 0; i < cycle.length; i++) {
        const current = cycle[i];
        const next = cycle[(i + 1) % cycle.length];

        // Solo reportar ciclos de 2 (importación directa circular)
        if (cycle.length === 2) {
          const pair = [current, next].sort().join(' <-> ');
          if (!circularImportPairs.includes(pair)) {
            circularImportPairs.push(pair);
          }
        }
      }
    }
  }

  // Verificar ciclos de archivo usando DFS
  const visited = new Set();
  const recursionStack = new Set();
  const foundCycles = [];

  function hasCycle(filePath) {
    visited.add(filePath);
    recursionStack.add(filePath);

    const fileNode = systemMap.files[filePath];
    if (fileNode && fileNode.dependsOn) {
      for (const dependency of fileNode.dependsOn) {
        if (!visited.has(dependency)) {
          if (hasCycle(dependency)) {
            return true;
          }
        } else if (recursionStack.has(dependency)) {
          // Ciclo encontrado
          if (!foundCycles.some(c => c.includes(filePath) && c.includes(dependency))) {
            foundCycles.push([filePath, dependency]);
          }
          return true;
        }
      }
    }

    recursionStack.delete(filePath);
    return false;
  }

  // Buscar ciclos
  for (const filePath of Object.keys(systemMap.files)) {
    if (!visited.has(filePath)) {
      visited.clear();
      recursionStack.clear();
      hasCycle(filePath);
    }
  }

  return {
    total: Math.max(foundCycles.length, cycles.length),
    cycles: foundCycles.length > 0 ? foundCycles : cycles,
    circularPairs: circularImportPairs,
    recommendation:
      foundCycles.length > 0 || cycles.length > 0
        ? `Found circular imports - breaks module loading`
        : 'No circular imports detected'
  };
}
