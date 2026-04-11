export function calculateUsageStats(systemMap) {
  const stats = {};

  for (const link of systemMap?.function_links || []) {
    if (!stats[link.to]) {
      stats[link.to] = {
        funcId: link.to,
        usageCount: 0,
        callers: [],
        functionData: systemMap.functions?.[link.to] || { line: link.line },
        filePath: link.file_to || link.to.split('::')[0]
      };
    }

    stats[link.to].usageCount++;
    if (!stats[link.to].callers.includes(link.from)) {
      stats[link.to].callers.push(link.from);
    }
  }

  return stats;
}

export function scoreHotspot(stats) {
  const { usageCount, callers, functionData } = stats;
  let score = usageCount * 1.5;
  const uniqueFiles = new Set(callers.map((caller) => caller.split('::')[0])).size;
  score += uniqueFiles * 2;
  if (functionData?.complexity) score += Math.min(20, functionData.complexity);
  if (functionData?.hasSideEffects) score += 10;
  return score;
}

export function buildHotspotRecommendation(usageCount, funcName, riskScore) {
  if (usageCount >= 20) return `Function "${funcName}" is used excessively. Consider split.`;
  if (riskScore >= 40) return `Function "${funcName}" has high complexity. Review responsibilities.`;
  return `Monitor usage of "${funcName}".`;
}

export function buildHotspotFinding(data) {
  return {
    id: `${data.type}-${data.metadata.fullId}`,
    ...data,
    recommendation: buildHotspotRecommendation(
      data.metadata.usageCount,
      data.metadata.functionName,
      data.metadata.riskScore
    )
  };
}

export function isUtilityFunction(funcId, functionData) {
  const name = funcId.split('::').pop()?.toLowerCase() || '';
  const path = funcId.split('::')[0]?.toLowerCase() || '';
  if (/utils?|helpers?|lib\/|shared\/utils/i.test(path)) return true;
  const utils = /^(log|debug|get[a-z]|is[a-z]|format|parse|validate|clone|map|filter)/i;
  return utils.test(name) || ((functionData?.complexity || 0) <= 3 && !functionData?.hasSideEffects);
}

export function scoreHotspotFindings(findings = []) {
  if (findings.length === 0) return 100;

  const highCount = findings.filter((finding) => finding.severity === 'high').length;
  const medCount = findings.filter((finding) => finding.severity === 'medium').length;
  return Math.max(0, 100 - (highCount * 15) - (medCount * 5));
}

export default {
  buildHotspotFinding,
  buildHotspotRecommendation,
  calculateUsageStats,
  isUtilityFunction,
  scoreHotspot,
  scoreHotspotFindings
};
