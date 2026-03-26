import { PatternDetector } from '../detector-base.js';
import { BusinessLogicHotspotRule } from './rules/hotspot-rules.js';

/**
 * Detector de puntos críticos (Hotspots) en lógica de negocio.
 */
export class HotspotsDetector extends PatternDetector {
  constructor(config = {}, globalConfig = {}) {
    super({
      ...config,
      id: 'hotspots',
      name: 'Critical Function Hotspots',
      description: 'Detects business logic functions with excessive usage (code smells)'
    }, globalConfig);
    this._initRules();
  }

  _initRules() {
    this.rules = [
      new BusinessLogicHotspotRule(this.config || {})
    ];
  }

  async detect(systemMap) {
    if (!systemMap) return this._emptyResult();

    const findings = [];
    const usageStats = this.calculateUsageStats(systemMap);
    const generateFinding = data => ({
      id: `${data.type}-${data.metadata.fullId}`,
      ...data,
      recommendation: buildHotspotRecommendation(
        data.metadata.usageCount,
        data.metadata.functionName,
        data.metadata.riskScore
      )
    });
    const ruleContext = {
      calculateRiskScore: (s) => scoreHotspot(s),
      isUtilityFunction: (id, data) => this.isUtilityFunction(id, data),
      generateFinding
    };

    for (const stats of Object.values(usageStats)) {
      for (const rule of this.rules) {
        rule.check(findings, stats, ruleContext);
      }
    }

    const totalFindings = findings.length;
    return {
      detector: this.getId(),
      name: this._name || this.getId(),
      description: this._description,
      findings: findings.sort((a, b) => b.metadata.riskScore - a.metadata.riskScore),
      score: this.scoreFindings(findings),
      weight: this.globalConfig.weights?.hotspots || 0.15,
      recommendation: totalFindings > 0
        ? `Found ${totalFindings} hotspot(s). Review high-usage functions for potential refactoring.`
        : 'No hotspots detected. Code structure looks healthy.',
      summary: { totalFindings }
    };
  }

  calculateUsageStats(systemMap) {
    const stats = {};
    for (const link of systemMap.function_links || []) {
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
      if (!stats[link.to].callers.includes(link.from)) stats[link.to].callers.push(link.from);
    }
    return stats;
  }

  isUtilityFunction(funcId, functionData) {
    const name = funcId.split('::').pop()?.toLowerCase() || '';
    const path = funcId.split('::')[0]?.toLowerCase() || '';
    if (/utils?|helpers?|lib\/|shared\/utils/i.test(path)) return true;
    const utils = /^(log|debug|get[a-z]|is[a-z]|format|parse|validate|clone|map|filter)/i;
    return utils.test(name) || ((functionData?.complexity || 0) <= 3 && !functionData?.hasSideEffects);
  }

  _emptyResult() {
    return {
      detector: this.getId(),
      name: this._name || this.getId(),
      description: this._description,
      findings: [],
      score: 100,
      weight: this.globalConfig.weights?.hotspots || 0.15,
      recommendation: 'No hotspots detected. Code structure looks healthy.',
      summary: { totalFindings: 0 }
    };
  }
}

function scoreHotspot(stats) {
    const { usageCount, callers, functionData } = stats;
    let score = (usageCount * 1.5);
    const uniqueFiles = new Set(callers.map(c => c.split('::')[0])).size;
    score += (uniqueFiles * 2);
    if (functionData?.complexity) score += Math.min(20, functionData.complexity);
    if (functionData?.hasSideEffects) score += 10;
    return score;
}

function buildHotspotRecommendation(usageCount, funcName, riskScore) {
  if (usageCount >= 20) return `Function "${funcName}" is used excessively. Consider split.`;
  if (riskScore >= 40) return `Function "${funcName}" has high complexity. Review responsibilities.`;
  return `Monitor usage of "${funcName}".`;
}

export default HotspotsDetector;
