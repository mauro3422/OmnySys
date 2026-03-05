import { PatternDetector } from '../detector-base.js';
import { GodObjectRule } from './rules/coupling-rules.js';

/**
 * Detector de acoplamiento arquitectural problemático.
 */
export class CouplingDetector extends PatternDetector {
  constructor(config = {}, globalConfig = {}) {
    super(config, globalConfig);
    this._initRules();
  }

  getId() { return 'coupling'; }
  getName() { return 'Architectural Coupling'; }
  getDescription() { return 'Detects files with excessive coupling that may indicate architectural issues'; }

  _initRules() {
    this.rules = [
      new GodObjectRule(this.config)
    ];
  }

  async detect(systemMap) {
    if (!systemMap) return this._emptyResult();

    const findings = [];
    const files = systemMap.files || {};

    for (const [filePath, fileNode] of Object.entries(files)) {
      if (this.isIntentionallyCoupled(filePath)) continue;

      for (const rule of this.rules) {
        rule.check(findings, filePath, fileNode, {
          generateFinding: (data) => ({
            id: `${data.type}-${data.filePath}`,
            ...data,
            file: data.filePath,
            recommendation: this.generateRecommendation(data.metadata.importCount, data.metadata.dependentCount),
            metadata: {
              ...data.metadata,
              factors: this.identifyRiskFactors(fileNode)
            }
          })
        });
      }
    }

    return {
      detector: this.getId(),
      name: this.getName(),
      description: this.getDescription(),
      findings: findings.sort((a, b) => b.metadata.riskScore - a.metadata.riskScore),
      score: this.calculateScore(findings),
      weight: this.globalConfig.weights?.coupling || 0.15,
      recommendation: findings.length > 0
        ? `Found ${findings.length} files with excessive coupling`
        : 'No architectural coupling issues detected'
    };
  }

  _emptyResult() {
    return {
      detector: this.getId(),
      findings: [],
      score: 100,
      recommendation: 'No decoupling data available'
    };
  }

  isIntentionallyCoupled(filePath) {
    if (/index\.(js|ts)$/i.test(filePath)) return true;
    if (/config\//i.test(filePath)) return true;
    if (/test\/|__tests__\/|\.test\./i.test(filePath)) return true;
    if (/cli\/commands\//i.test(filePath)) return true;
    if (/api\/routes\//i.test(filePath)) return true;
    return false;
  }

  generateRecommendation(imports, dependents) {
    if (imports > 20 && dependents > 10) return 'Consider splitting this file into smaller, focused modules';
    if (imports > 20) return 'This module depends on too many others. Consider facade pattern';
    if (dependents > 10) return 'Many modules depend on this. Ensure a stable, minimal interface';
    return 'Review if this level of coupling is intentional';
  }

  identifyRiskFactors(fileNode) {
    const factors = [];
    if (fileNode.imports?.length > 20) factors.push('high_imports');
    if (fileNode.usedBy?.length > 15) factors.push('high_dependents');
    const mutualDeps = fileNode.dependsOn?.filter(dep => fileNode.usedBy?.includes(dep)) || [];
    if (mutualDeps.length > 0) factors.push('potential_circular_deps');
    return factors;
  }
}

export default CouplingDetector;
