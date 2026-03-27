import { buildFindingIdentity, calculateDebtScore, calculateTrend } from './duplicate-debt-scoring.js';
import { mapDebtFinding } from './duplicate-debt-formatters.js';
import { generateDebtRecommendations } from './duplicate-debt-recommendations.js';

export function buildDuplicateDebtHistory(filePath, currentFindings = [], previousFindings = []) {
  const currentSymbols = new Set(currentFindings.map(buildFindingIdentity));
  const previousSymbols = new Set(previousFindings.map(buildFindingIdentity));

  const newFindings = currentFindings.filter((finding) => !previousSymbols.has(buildFindingIdentity(finding)));
  const resolvedFindings = previousFindings.filter((finding) => !currentSymbols.has(buildFindingIdentity(finding)));
  const persistentFindings = currentFindings.filter((finding) => previousSymbols.has(buildFindingIdentity(finding)));

  const debtScore = calculateDebtScore(newFindings, persistentFindings, resolvedFindings);
  const trend = calculateTrend(newFindings.length, resolvedFindings.length, persistentFindings.length);

  return {
    filePath,
    detectedAt: new Date().toISOString(),
    summary: {
      total: currentFindings.length,
      new: newFindings.length,
      persistent: persistentFindings.length,
      resolved: resolvedFindings.length,
      resolutionRate: previousFindings.length > 0
        ? Math.round((resolvedFindings.length / previousFindings.length) * 100)
        : 0
    },
    debt: {
      score: debtScore,
      level: debtScore >= 75 ? 'critical' : debtScore >= 50 ? 'high' : debtScore >= 25 ? 'medium' : 'low',
      trend,
      accumulationRate: persistentFindings.length > 0 ? 'high' : newFindings.length > 0 ? 'medium' : 'low'
    },
    history: {
      new: newFindings.map((finding) => mapDebtFinding(finding)),
      persistent: persistentFindings.map((finding) => ({
        ...mapDebtFinding(finding),
        isDebt: true
      })),
      resolved: resolvedFindings.map((finding) => ({
        symbol: finding.symbol,
        type: finding.duplicateType,
        resolvedAt: new Date().toISOString()
      }))
    },
    recommendations: generateDebtRecommendations(newFindings, persistentFindings, resolvedFindings)
  };
}
