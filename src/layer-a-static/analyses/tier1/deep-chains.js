/**
 * Deep Dependency Chains Analyzer
 *
 * Responsabilidad:
 * - Encontrar cadenas profundas de dependencias (A → B → C → D → E → F)
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de cadenas profundas
 */
export function findDeepDependencyChains(systemMap) {
  const chains = [];
  const visited = new Set();

  function buildChain(currentId, path, maxDepth = 10) {
    if (path.length > maxDepth) {
      return [path.slice(0, maxDepth)];
    }

    const outgoing = systemMap.function_links.filter(
      link => link.from === currentId && !path.includes(link.to)
    );

    if (outgoing.length === 0) {
      return [path];
    }

    const allChains = [];
    for (const link of outgoing) {
      allChains.push(...buildChain(link.to, [...path, link.to], maxDepth));
    }
    return allChains;
  }

  // Buscar cadenas desde funciones sin incoming (entry functions)
  for (const link of systemMap.function_links) {
    const hasIncoming = systemMap.function_links.some(l => l.to === link.from);
    if (!hasIncoming && !visited.has(link.from)) {
      const chainsFromHere = buildChain(link.from, [link.from]);
      chainsFromHere.forEach(chain => {
        if (chain.length >= 5) {
          chains.push({
            chain: chain,
            depth: chain.length,
            impact: `Changing root function affects ${chain.length} levels`
          });
        }
      });
      visited.add(link.from);
    }
  }

  return {
    totalDeepChains: chains.length,
    maxDepth: chains.length > 0 ? Math.max(...chains.map(c => c.depth)) : 0,
    chains: chains.sort((a, b) => b.depth - a.depth).slice(0, 10), // Top 10
    recommendation:
      chains.length > 0
        ? `Found ${chains.length} deep dependency chains - high risk for tunnel vision`
        : 'No very deep dependency chains detected'
  };
}
