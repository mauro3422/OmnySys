/**
 * Deep Dependency Chains Analyzer
 *
 * Responsabilidad:
 * - Encontrar cadenas de dependencias REALMENTE problemáticas.
 * - No todas las cadenas profundas son malas: solo son riesgo si son muy
 *   profundas (>7 niveles) Y tienen alto acoplamiento (fan-in > 3).
 *
 * Algoritmo V2: risk-scoring por cadena (reemplaza V1 que reportaba todo).
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de cadenas de alto riesgo
 */
export function findDeepDependencyChains(systemMap) {
  if (!systemMap || !systemMap.function_links) {
    return {
      totalDeepChains: 0,
      maxDepth: 0,
      chains: [],
      averageRisk: 0,
      recommendation: 'No dependency data available'
    };
  }

  const MAX_DEPTH = 7;
  const MAX_FAN_IN = 3;
  const links = systemMap.function_links;

  function buildChainLimited(startId, maxDepth) {
    const chain = [startId];
    const visited = new Set([startId]);

    let frontier = [startId];
    while (frontier.length > 0 && chain.length < maxDepth) {
      const next = [];
      for (const nodeId of frontier) {
        for (const link of links) {
          if (link.from === nodeId && !visited.has(link.to)) {
            visited.add(link.to);
            chain.push(link.to);
            next.push(link.to);
          }
        }
      }
      frontier = next;
    }
    return chain;
  }

  function calculateRiskScore(chain, rootId) {
    let score = 0;

    const depth = chain.length;
    if (depth > MAX_DEPTH) {
      score += Math.pow(depth - MAX_DEPTH, 2);
    }

    const fanIn = links.filter(l => l.to === rootId).length;
    if (fanIn > MAX_FAN_IN) {
      score += (fanIn - MAX_FAN_IN) * 2;
    }

    return score;
  }

  const problematicChains = [];
  const seen = new Set();

  for (const link of links) {
    const nodeId = link.from;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);

    const incoming = links.filter(l => l.to === nodeId).length;
    const outgoing = links.filter(l => l.from === nodeId).length;

    // Solo explorar desde entry points reales (pocos incoming, múltiples outgoing)
    if (incoming <= 1 && outgoing >= 2) {
      const chain = buildChainLimited(nodeId, MAX_DEPTH + 3);
      const riskScore = calculateRiskScore(chain, nodeId);

      if (riskScore > 10) {
        problematicChains.push({
          chain,
          depth: chain.length,
          riskScore,
          rootFanIn: incoming,
          impact: `High-risk chain: ${riskScore} risk score, depth ${chain.length}`
        });
      }
    }
  }

  problematicChains.sort((a, b) => b.riskScore - a.riskScore);

  return {
    totalDeepChains: problematicChains.length,
    maxDepth: problematicChains.length > 0
      ? Math.max(...problematicChains.map(c => c.depth))
      : 0,
    chains: problematicChains.slice(0, 5),
    averageRisk: problematicChains.length > 0
      ? problematicChains.reduce((sum, c) => sum + c.riskScore, 0) / problematicChains.length
      : 0,
    recommendation: problematicChains.length > 0
      ? `Found ${problematicChains.length} high-risk dependency chains (risk > 10)`
      : 'No problematic deep chains detected'
  };
}
