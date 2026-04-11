/**
 * Deep Dependency Chains Analyzer
 *
 * Detecta cadenas profundas con alto acoplamiento. La lógica de recorrido y
 * scoring vive en un helper compartido para no duplicarla con el detector.
 */

import { summarizeDeepChains } from '../shared/deep-chains-helpers.js';

export function findDeepDependencyChains(systemMap) {
  const summary = summarizeDeepChains(systemMap, {
    minDepth: 7,
    maxAcceptable: 20,
    branchLimit: 3,
    riskThreshold: 10
  });

  return {
    totalDeepChains: summary.totalDeepChains,
    maxDepth: summary.maxDepth,
    chains: summary.chains.map((chain) => ({
      chain: chain.chain,
      depth: chain.depth,
      riskScore: chain.riskScore,
      rootFanIn: chain.entryPoint.fanIn,
      impact: `High-risk chain: ${chain.riskScore} risk score, depth ${chain.depth}`
    })),
    averageRisk: summary.averageRisk,
    recommendation: summary.recommendation
  };
}

export default findDeepDependencyChains;
