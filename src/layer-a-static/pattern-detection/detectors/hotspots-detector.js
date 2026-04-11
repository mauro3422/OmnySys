import { PatternDetector } from '../detector-base.js';
import { BusinessLogicHotspotRule } from './rules/hotspot-rules.js';
import {
  buildHotspotFinding,
  calculateUsageStats,
  isUtilityFunction,
  scoreHotspot,
  scoreHotspotFindings
} from './hotspots-helpers.js';

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
    const usageStats = calculateUsageStats(systemMap);
    const ruleContext = {
      calculateRiskScore: (stats) => scoreHotspot(stats),
      isUtilityFunction: (id, data) => isUtilityFunction(id, data),
      generateFinding: (data) => buildHotspotFinding(data)
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

  scoreFindings(findings) {
    return scoreHotspotFindings(findings);
  }
}

export default HotspotsDetector;
