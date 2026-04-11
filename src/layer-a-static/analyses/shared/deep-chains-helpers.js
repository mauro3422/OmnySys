function buildFunctionStats(links = []) {
  const stats = new Map();
  const adjacency = new Map();

  for (const link of links) {
    if (!link?.from || !link?.to) {
      continue;
    }

    if (!stats.has(link.from)) {
      stats.set(link.from, { incoming: 0, outgoing: 0, file: link.fromFile || null });
    }
    if (!stats.has(link.to)) {
      stats.set(link.to, { incoming: 0, outgoing: 0, file: link.toFile || null });
    }

    stats.get(link.from).outgoing += 1;
    stats.get(link.to).incoming += 1;

    if (!adjacency.has(link.from)) {
      adjacency.set(link.from, []);
    }
    adjacency.get(link.from).push(link.to);
  }

  return { stats, adjacency };
}

export function findDeepChainEntryPoints(links = []) {
  const { stats } = buildFunctionStats(links);
  const entryPoints = [];

  for (const [funcId, info] of stats.entries()) {
    if (info.incoming <= 1 && info.outgoing >= 2) {
      entryPoints.push({
        id: funcId,
        name: funcId.split('::').pop(),
        file: info.file || null,
        fanIn: info.incoming,
        fanOut: info.outgoing
      });
    }
  }

  return entryPoints;
}

export function buildDeepChain(links = [], startId, maxDepth = 10, branchLimit = 3) {
  if (!startId) {
    return [];
  }

  const { adjacency } = buildFunctionStats(links);

  const walk = (currentId, path) => {
    if (path.length >= maxDepth) {
      return path;
    }

    const outgoing = (adjacency.get(currentId) || []).filter((nextId) => !path.includes(nextId));
    if (outgoing.length === 0) {
      return path;
    }

    let longestPath = path;
    for (const nextId of outgoing.slice(0, branchLimit)) {
      const subPath = walk(nextId, [...path, nextId]);
      if (subPath.length > longestPath.length) {
        longestPath = subPath;
      }
    }

    return longestPath;
  };

  return walk(startId, [startId]);
}

export function scoreDeepChainRisk(chain = [], entry = {}, minDepth = 7, maxFanOut = 5) {
  let score = 0;
  const depth = chain.length;

  if (depth > minDepth) {
    score += Math.pow(depth - minDepth, 2);
  }

  if ((entry.fanIn || 0) > 3) {
    score += ((entry.fanIn || 0) - 3) * 5;
  }

  if ((entry.fanOut || 0) > maxFanOut) {
    score += ((entry.fanOut || 0) - maxFanOut) * 3;
  }

  return score;
}

export function scoreDeepChainFindings(findings = [], maxAcceptable = 20) {
  if (findings.length === 0) {
    return 100;
  }

  const highRiskCount = findings.filter((finding) => finding.severity === 'high').length;
  if (highRiskCount > maxAcceptable) {
    return Math.max(0, 100 - ((highRiskCount - maxAcceptable) * 5));
  }

  const mediumRiskCount = findings.filter((finding) => finding.severity === 'medium').length;
  return Math.max(50, 100 - (highRiskCount * 5) - (mediumRiskCount * 2));
}

export function summarizeDeepChains(systemMap, options = {}) {
  if (!systemMap || !Array.isArray(systemMap.function_links)) {
    return {
      entryPoints: [],
      chains: [],
      totalDeepChains: 0,
      maxDepth: 0,
      averageRisk: 0,
      score: 100,
      recommendation: 'No dependency data available'
    };
  }

  const links = systemMap.function_links;
  const minDepth = options.minDepth || 7;
  const maxAcceptable = options.maxAcceptable || 20;
  const branchLimit = options.branchLimit || 3;
  const riskThreshold = options.riskThreshold || 20;
  const maxFanOut = options.maxFanOut || 5;

  const entryPoints = findDeepChainEntryPoints(links);
  const chains = [];

  for (const entry of entryPoints) {
    const chain = buildDeepChain(links, entry.id, minDepth + 3, branchLimit);
    const riskScore = scoreDeepChainRisk(chain, entry, minDepth, maxFanOut);

    if (chain.length >= minDepth && riskScore >= riskThreshold) {
      chains.push({
        entryPoint: entry,
        chain,
        depth: chain.length,
        riskScore
      });
    }
  }

  chains.sort((a, b) => b.riskScore - a.riskScore || b.depth - a.depth);

  return {
    entryPoints,
    chains,
    totalDeepChains: chains.length,
    maxDepth: chains.length > 0 ? Math.max(...chains.map((chain) => chain.depth)) : 0,
    averageRisk: chains.length > 0
      ? chains.reduce((sum, chain) => sum + chain.riskScore, 0) / chains.length
      : 0,
    score: scoreDeepChainFindings(chains.map((chain) => ({
      severity: chain.riskScore >= 50 ? 'high' : 'medium'
    })), maxAcceptable),
    recommendation: chains.length > 0
      ? `Found ${chains.length} high-risk dependency chains (risk > ${riskThreshold})`
      : 'No problematic deep chains detected'
  };
}

export default {
  buildDeepChain,
  findDeepChainEntryPoints,
  scoreDeepChainFindings,
  scoreDeepChainRisk,
  summarizeDeepChains
};
