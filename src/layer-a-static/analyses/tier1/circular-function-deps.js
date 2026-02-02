/**
 * Circular Function Dependencies Analyzer
 *
 * Responsabilidad:
 * - Detectar ciclos entre funciones (A → B → A)
 * - Diferenciar recursión legítima de circular dependencies problemáticas
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de dependencias circulares
 */
export function findCircularFunctionDeps(systemMap) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(nodeId, path) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    // Encontrar todos los links que SALEN de este nodo
    const outgoingLinks = systemMap.function_links.filter(
      link => link.from === nodeId
    );

    for (const link of outgoingLinks) {
      const targetId = link.to;

      if (!visited.has(targetId)) {
        dfs(targetId, [...path]);
      } else if (recursionStack.has(targetId)) {
        // Ciclo encontrado
        const cycleStart = path.indexOf(targetId);
        const cycle = path.slice(cycleStart).concat([targetId]);
        cycles.push({
          cycle: cycle,
          length: cycle.length,
          severity: cycle.length === 2 ? 'CRITICAL' : 'WARNING'
        });
      }
    }

    recursionStack.delete(nodeId);
  }

  // Ejecutar DFS desde cada función
  for (const link of systemMap.function_links) {
    if (!visited.has(link.from)) {
      dfs(link.from, []);
    }
  }

  // Clasificar ciclos: recursión legítima vs problemas reales
  const recursiveFunctions = []; // Funciones recursivas (A → A)
  const mutualRecursion = [];    // Recursión mutua (A → B → A)
  const problematicCycles = [];  // Ciclos problemáticos

  for (const cycle of cycles) {
    const cycleLength = cycle.cycle.length - 1; // -1 porque el último repite el primero

    // Recursión directa: función se llama a sí misma
    if (cycleLength === 1) {
      const funcName = cycle.cycle[0].split(':')[1] || cycle.cycle[0];
      const isRecursivePattern = isLikelyRecursive(funcName);

      recursiveFunctions.push({
        ...cycle,
        isLegitimate: isRecursivePattern,
        reason: isRecursivePattern ? 'Recursive function (DFS, traversal, etc.)' : 'Self-call detected'
      });
    }
    // Recursión mutua: 2-3 funciones en ciclo
    else if (cycleLength >= 2 && cycleLength <= 3) {
      const funcNames = cycle.cycle.map(id => id.split(':')[1] || id);
      const areRecursiveNames = funcNames.some(name => isLikelyRecursive(name));

      mutualRecursion.push({
        ...cycle,
        isLegitimate: areRecursiveNames,
        reason: areRecursiveNames ? 'Mutual recursion (helper functions)' : 'Mutual dependency detected'
      });
    }
    // Ciclos largos: probablemente problemáticos
    else {
      problematicCycles.push({
        ...cycle,
        isLegitimate: false,
        reason: `Long cycle (${cycleLength} functions) - likely a design issue`
      });
    }
  }

  const legitimateCount = recursiveFunctions.filter(c => c.isLegitimate).length +
                          mutualRecursion.filter(c => c.isLegitimate).length;
  const problematicCount = problematicCycles.length +
                           recursiveFunctions.filter(c => !c.isLegitimate).length +
                           mutualRecursion.filter(c => !c.isLegitimate).length;

  return {
    total: cycles.length,
    cycles: cycles,
    recursiveFunctions: recursiveFunctions,
    mutualRecursion: mutualRecursion,
    problematicCycles: problematicCycles,
    legitimateCount: legitimateCount,
    problematicCount: problematicCount,
    hasMutualRecursion: cycles.some(c => c.length === 2),
    recommendation: problematicCount > 0
      ? `Found ${problematicCount} problematic circular dependency(ies) - review and refactor`
      : legitimateCount > 0
        ? `Found ${legitimateCount} legitimate recursive function(s) - no action needed`
        : 'No circular function dependencies detected'
  };
}

/**
 * Detecta si un nombre de función sugiere recursión legítima
 *
 * @param {string} funcName - Nombre de la función
 * @returns {boolean}
 */
function isLikelyRecursive(funcName) {
  const recursivePatterns = [
    /^dfs$/i,           // Depth-first search
    /^bfs$/i,           // Breadth-first search
    /traverse/i,        // traverseTree, traverse, etc.
    /walk/i,            // walk, walkAST, etc.
    /visit/i,           // visit, visitNode, etc.
    /search/i,          // search, searchTree, etc.
    /find/i,            // findCycle, findPath, etc.
    /recursive/i,       // recursiveHelper, etc.
    /helper/i           // helper (common in mutual recursion)
  ];

  return recursivePatterns.some(pattern => pattern.test(funcName));
}
