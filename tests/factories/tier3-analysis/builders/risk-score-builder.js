/**
 * @fileoverview RiskScoreBuilder - Builder for risk scores
 */

export class RiskScoreBuilder {
  constructor(filePath = 'test.js') {
    this.filePath = filePath;
    this.total = 0;
    this.severity = 'low';
    this.explanation = '';
    this.breakdown = {
      complexity: 0,
      semanticConnections: 0,
      sideEffects: 0,
      graphMetrics: 0
    };
  }

  withTotal(score) {
    this.total = score;
    return this;
  }

  withSeverity(severity) {
    this.severity = severity;
    return this;
  }

  withExplanation(explanation) {
    this.explanation = explanation;
    return this;
  }

  withBreakdown(breakdown) {
    this.breakdown = { ...this.breakdown, ...breakdown };
    return this;
  }

  asLowRisk() {
    this.total = 2;
    this.severity = 'low';
    this.explanation = '';
    return this;
  }

  asMediumRisk() {
    this.total = 5;
    this.severity = 'medium';
    this.explanation = 'Medium risk file';
    return this;
  }

  asHighRisk() {
    this.total = 8;
    this.severity = 'high';
    this.explanation = 'High risk file';
    return this;
  }

  asCriticalRisk() {
    this.total = 10;
    this.severity = 'critical';
    this.explanation = 'Critical risk file';
    return this;
  }

  build() {
    return {
      file: this.filePath,
      total: this.total,
      severity: this.severity,
      explanation: this.explanation,
      breakdown: this.breakdown
    };
  }

  static create(filePath) {
    return new RiskScoreBuilder(filePath);
  }
}
