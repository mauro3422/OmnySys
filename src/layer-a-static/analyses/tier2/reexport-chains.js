/**
 * Re-export Chains Analyzer
 *
 * Responsabilidad:
 * - Rastrear cadenas de re-exports (A→B→C)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de cadenas de re-exports
 */
export function analyzeReexportChains(systemMap) {
  if (!systemMap || !systemMap.files) {
    return { total: 0, chains: [] };
  }
  
  const chains = [];
  const visited = new Set();

  // Buscar archivos que solo reexportan (no tienen funciones originales)
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const functions = (systemMap.files[filePath] && systemMap.files[filePath].functions) || [];
    const isBarrel = functions.length === 0 && fileNode.exports.length > 0 && fileNode.imports.length > 0;

    if (isBarrel && !visited.has(filePath)) {
      // Seguir la cadena
      const chain = [filePath];
      let current = filePath;
      visited.add(current);

      while (true) {
        const currentNode = systemMap.files[current];
        if (!currentNode || currentNode.dependsOn.length === 0) break;

        const next = currentNode.dependsOn[0];
        if (visited.has(next)) break;

        chain.push(next);
        visited.add(next);
        current = next;
      }

      if (chain.length > 1) {
        chains.push({
          chain: chain,
          depth: chain.length,
          recommendation: chain.length > 2 ? 'MEDIUM' : 'LOW'
        });
      }
    }
  }

  return {
    total: chains.length,
    chains: chains,
    recommendation: chains.length > 0 ? `Simplify ${chains.length} re-export chain(s) for clarity` : 'No complex re-export chains'
  };
}
