import { PatternDetector } from '../detector-base.js';
import { BusinessLogicHotspotRule } from './rules/hotspot-rules.js';

/**
 * Detector de puntos críticos (Hotspots) en lógica de negocio.
 */
export class HotspotsDetector extends PatternDetector {
  constructor(config = {}, globalConfig = {}) {
    super(config, globalConfig);
    this._initRules();
  }

  getId() { return 'hotspots'; }
  getName() { return 'Critical Function Hotspots'; }
  getDescription() { return 'Detects business logic functions with excessive usage'; }

  _initRules() {
    this.rules = [
      new BusinessLogicHotspotRule(this.config)
    ];
  }

  async detect(systemMap) {
    if (!systemMap) return this._emptyResult();

    const findings = [];
    const usageStats = this.calculateUsageStats(systemMap);

    for (const stats of Object.values(usageStats)) {
      for (const rule of this.rules) {
        rule.check(findings, stats, {
          calculateRiskScore: (s) => this.calculateRiskScore(s),
          isUtilityFunction: (id, data) => this.isUtilityFunction(id, data),
          generateFinding: (data) => ({
            id: `${data.type}-${data.metadata.fullId}`,
            ...data,
            recommendation: this.generateRecommendation(data.metadata.usageCount, data.metadata.functionName, data.metadata.riskScore)
          })
        });
      }
    }

    return {
      detector: this.getId(),
      findings: findings.sort((a, b) => b.metadata.riskScore - a.metadata.riskScore),
      score: this.calculateScore(findings),
      summary: { totalFindings: findings.length }
    };
  }

  calculateUsageStats(systemMap) {
    const stats = {};
    (systemMap.function_links || []).forEach(link => {
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
    });
    return stats;
  }

  calculateRiskScore(stats) {
    const { usageCount, callers, functionData } = stats;
    let score = (usageCount * 1.5);
    const uniqueFiles = new Set(callers.map(c => c.split('::')[0])).size;
    score += (uniqueFiles * 2);
    if (functionData?.complexity) score += Math.min(20, functionData.complexity);
    if (functionData?.hasSideEffects) score += 10;
    return score;
  }

  isUtilityFunction(funcId, functionData) {
    const name = funcId.split('::').pop()?.toLowerCase() || '';
    const path = funcId.split('::')[0]?.toLowerCase() || '';
    if (/utils?|helpers?|lib\/|shared\/utils/i.test(path)) return true;
    const utils = /^(log|debug|get[a-z]|is[a-z]|format|parse|validate|clone|map|filter)/i;
    return utils.test(name) || ((functionData?.complexity || 0) <= 3 && !functionData?.hasSideEffects);
  }

  generateRecommendation(usageCount, funcName, riskScore) {
    if (usageCount >= 20) return `Function "${funcName}" is used excessively. Consider split.`;
    if (riskScore >= 40) return `Function "${funcName}" has high complexity. Review responsibilities.`;
    return `Monitor usage of "${funcName}".`;
  }

  _emptyResult() {
    return { detector: this.getId(), findings: [], score: 100 };
  }
}

export default HotspotsDetector;
