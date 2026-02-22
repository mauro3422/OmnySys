/**
 * @fileoverview ReportDataBuilder - Builder for report data
 */

import { RiskScoreBuilder } from './risk-score-builder.js';

export class ReportDataBuilder {
  constructor() {
    this.riskScores = {};
  }

  withRiskScore(filePath, score) {
    if (score instanceof RiskScoreBuilder) {
      this.riskScores[filePath] = score.build();
    } else {
      this.riskScores[filePath] = score;
    }
    return this;
  }

  withMultipleScores(count, severity = 'low') {
    for (let i = 0; i < count; i++) {
      const builder = RiskScoreBuilder.create(`file${i}.js`);
      switch (severity) {
        case 'critical':
          builder.asCriticalRisk();
          break;
        case 'high':
          builder.asHighRisk();
          break;
        case 'medium':
          builder.asMediumRisk();
          break;
        default:
          builder.asLowRisk();
      }
      this.riskScores[`file${i}.js`] = builder.build();
    }
    return this;
  }

  withMixedRiskScores() {
    this.riskScores['low.js'] = RiskScoreBuilder.create('low.js').asLowRisk().build();
    this.riskScores['medium.js'] = RiskScoreBuilder.create('medium.js').asMediumRisk().build();
    this.riskScores['high.js'] = RiskScoreBuilder.create('high.js').asHighRisk().build();
    this.riskScores['critical.js'] = RiskScoreBuilder.create('critical.js').asCriticalRisk().build();
    return this;
  }

  build() {
    return this.riskScores;
  }

  static create() {
    return new ReportDataBuilder();
  }
}
