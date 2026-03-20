/**
 * Re-export Chains Analyzer
 *
 * Responsabilidad:
 * - Rastrear cadenas de re-exports (A→B→C)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de cadenas de re-exports
 */
function isBarrelFile(fileNode, functions) {
  const exportsList = fileNode.exports || [];
  const importsList = fileNode.imports || [];
  return functions.length === 0 && exportsList.length > 0 && importsList.length > 0;
}

function followReexportChain(files, startPath, visited) {
  const chain = [startPath];
  let current = startPath;

  visited.add(current);

  while (true) {
    const currentNode = files[current];
    const dependsOn = currentNode?.dependsOn || [];

    if (dependsOn.length === 0) {
      break;
    }

    const next = dependsOn[0];
    if (visited.has(next)) {
      break;
    }

    chain.push(next);
    visited.add(next);
    current = next;
  }

  return chain;
}

export function analyzeReexportChains(systemMap) {
  if (!systemMap || !systemMap.files) {
    return { total: 0, chains: [] };
  }

  const files = systemMap.files;
  const functionsByFile = systemMap.functions || {};
  const chains = [];
  const visited = new Set();

  for (const [filePath, fileNode] of Object.entries(files)) {
    if (visited.has(filePath)) {
      continue;
    }

    const functions = functionsByFile[filePath] || fileNode.functions || [];
    if (!isBarrelFile(fileNode, functions)) {
      continue;
    }

    const chain = followReexportChain(files, filePath, visited);
    if (chain.length > 1) {
      chains.push({
        chain,
        depth: chain.length,
        recommendation: chain.length > 2 ? 'MEDIUM' : 'LOW'
      });
    }
  }

  return {
    total: chains.length,
    chains,
    recommendation: chains.length > 0
      ? `Simplify ${chains.length} re-export chain(s) for clarity`
      : 'No complex re-export chains'
  };
}
