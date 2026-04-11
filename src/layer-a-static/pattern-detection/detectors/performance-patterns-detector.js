/**
 * @fileoverview Performance Patterns Detector
 *
 * Automates the detection of performance anti-patterns during the static analysis phase.
 * Leverages the pre-extracted `performance_json` metadata.
 *
 * @module pattern-detection/detectors/performance-patterns-detector
 */

import { PatternDetector } from '../detector-base.js';
import {
  buildPerformanceMessage,
  buildPerformanceRecommendation,
  calculatePerformanceRisk,
  getPerformanceAtoms,
  scorePerformanceFindings
} from './performance-patterns-helpers.js';

export class PerformancePatternsDetector extends PatternDetector {
  constructor(config = {}, globalConfig = {}) {
    super({
      ...config,
      id: 'performance-patterns',
      name: 'Performance Anti-Patterns',
      description: 'Detects algorithmic complexity risks and blocking operations in hot paths'
    }, globalConfig);
  }

  async detect(systemMap) {
    const findings = [];
    const atoms = getPerformanceAtoms(systemMap);

    for (const atom of atoms) {
      const perf = atom.performance || {};
      const riskScore = calculatePerformanceRisk(perf);

      if (riskScore >= 20) {
        const severity = riskScore >= 50 ? 'high' : 'medium';

        findings.push({
          id: `perf-${atom.id}`,
          type: 'performance_risk',
          severity,
          file: atom.file,
          line: atom.line || 1,
          message: buildPerformanceMessage(atom, perf),
          recommendation: buildPerformanceRecommendation(perf),
          metadata: {
            atomId: atom.id,
            complexity: perf.estimatedComplexity,
            riskScore
          }
        });
      }
    }

    return {
      detector: this.getId(),
      name: this._name || this.getId(),
      description: this._description,
      findings: findings.sort((a, b) => b.metadata.riskScore - a.metadata.riskScore),
      score: this.scoreFindings(findings),
      weight: 0.20
    };
  }

  scoreFindings(findings) {
    return scorePerformanceFindings(findings);
  }
}

export default PerformancePatternsDetector;
