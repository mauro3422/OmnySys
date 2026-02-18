/**
 * @fileoverview Layer C Verification Factory
 * 
 * Builders para testing de verificación y certificación
 * 
 * @module tests/factories/layer-c-verification
 */

import { Severity, IssueCategory, DataSystem, VerificationStatus } from '../../../src/layer-c-memory/verification/types/index.js';

/**
 * Builder para resultados de validación
 */
export class ValidationResultBuilder {
  constructor() {
    this.result = {
      status: VerificationStatus.PASSED,
      issues: [],
      stats: {
        total: 0,
        valid: 0,
        invalid: 0
      }
    };
  }

  asPassed() {
    this.result.status = VerificationStatus.PASSED;
    return this;
  }

  asFailed() {
    this.result.status = VerificationStatus.FAILED;
    return this;
  }

  asWarning() {
    this.result.status = VerificationStatus.WARNING;
    return this;
  }

  withIssues(issues) {
    this.result.issues = Array.isArray(issues) ? issues : [issues];
    this.result.stats.invalid = this.result.issues.length;
    return this;
  }

  withIssue(issue) {
    this.result.issues.push(issue);
    this.result.stats.invalid = this.result.issues.length;
    return this;
  }

  withStats(stats) {
    this.result.stats = { ...this.result.stats, ...stats };
    return this;
  }

  withScore(score) {
    this.result.score = score;
    return this;
  }

  withError(message) {
    this.result.status = VerificationStatus.FAILED;
    this.result.error = message;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new ValidationResultBuilder();
  }
}

/**
 * Builder para issues de validación
 */
export class IssueBuilder {
  constructor() {
    this.issue = {
      id: `issue-${Date.now()}`,
      category: IssueCategory.INTEGRITY,
      severity: Severity.MEDIUM,
      system: DataSystem.ATOMS,
      path: '/test/path.json',
      message: 'Test issue'
    };
  }

  asCritical() {
    this.issue.severity = Severity.CRITICAL;
    return this;
  }

  asWarning() {
    this.issue.severity = Severity.MEDIUM;
    return this;
  }

  asHigh() {
    this.issue.severity = Severity.HIGH;
    return this;
  }

  asLow() {
    this.issue.severity = Severity.LOW;
    return this;
  }

  asInfo() {
    this.issue.severity = Severity.INFO;
    return this;
  }

  withMessage(message) {
    this.issue.message = message;
    return this;
  }

  withFile(path) {
    this.issue.path = path;
    return this;
  }

  withLine(line) {
    this.issue.line = line;
    return this;
  }

  withCode(code) {
    this.issue.code = code;
    return this;
  }

  withCategory(category) {
    this.issue.category = category;
    return this;
  }

  withSystem(system) {
    this.issue.system = system;
    return this;
  }

  withExpected(expected) {
    this.issue.expected = expected;
    return this;
  }

  withActual(actual) {
    this.issue.actual = actual;
    return this;
  }

  withSuggestion(suggestion) {
    this.issue.suggestion = suggestion;
    return this;
  }

  withMetadata(metadata) {
    this.issue.metadata = metadata;
    return this;
  }

  build() {
    return { ...this.issue };
  }

  static create() {
    return new IssueBuilder();
  }
}

/**
 * Builder para reportes de verificación
 */
export class ReportBuilder {
  constructor() {
    this.report = {
      projectPath: '/test/project',
      timestamp: new Date().toISOString(),
      duration: 100,
      status: VerificationStatus.PASSED,
      summary: {
        message: '✅ PASSED: All systems verified.',
        recommendations: []
      },
      stats: {
        totalIssues: 0,
        bySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0
        },
        bySystem: {},
        validatorsRun: 2
      },
      issues: [],
      validatorResults: []
    };
  }

  asPassed() {
    this.report.status = VerificationStatus.PASSED;
    this.report.summary.message = '✅ PASSED: All systems verified.';
    return this;
  }

  asFailed() {
    this.report.status = VerificationStatus.FAILED;
    this.report.summary.message = '❌ CRITICAL: Critical issues found.';
    return this;
  }

  asWarning() {
    this.report.status = VerificationStatus.WARNING;
    this.report.summary.message = '⚠️ WARNING: Issues found.';
    return this;
  }

  withSummary(summary) {
    this.report.summary = { ...this.report.summary, ...summary };
    return this;
  }

  withValidators(count) {
    this.report.stats.validatorsRun = count;
    return this;
  }

  withValidatorResult(result) {
    this.report.validatorResults.push(result);
    return this;
  }

  withIssues(issues) {
    this.report.issues = Array.isArray(issues) ? issues : [issues];
    this.report.stats.totalIssues = this.report.issues.length;
    return this;
  }

  withIssue(issue) {
    this.report.issues.push(issue);
    this.report.stats.totalIssues = this.report.issues.length;
    return this;
  }

  withCertificate(certificate) {
    this.report.certificate = certificate;
    return this;
  }

  withProjectPath(path) {
    this.report.projectPath = path;
    return this;
  }

  withDuration(duration) {
    this.report.duration = duration;
    return this;
  }

  withBySeverity(bySeverity) {
    this.report.stats.bySeverity = { ...this.report.stats.bySeverity, ...bySeverity };
    return this;
  }

  withBySystem(bySystem) {
    this.report.stats.bySystem = { ...this.report.stats.bySystem, ...bySystem };
    return this;
  }

  build() {
    return { ...this.report };
  }

  static create() {
    return new ReportBuilder();
  }
}

/**
 * Builder para certificados de verificación
 */
export class CertificateBuilder {
  constructor() {
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + 7);
    
    this.certificate = {
      id: `cert-${Date.now()}-abc123`,
      projectPath: '/test/project',
      issuedAt: now.toISOString(),
      validUntil: validUntil.toISOString(),
      status: VerificationStatus.PASSED,
      version: '1.0.0',
      metrics: {
        totalFiles: 10,
        totalAtoms: 5,
        totalConnections: 3,
        issuesFound: 0
      },
      hash: 'abc123def456',
      signatures: ['integrity-validator', 'consistency-validator']
    };
  }

  withTimestamp(timestamp) {
    this.certificate.issuedAt = timestamp;
    return this;
  }

  withSignature(signature) {
    if (Array.isArray(signature)) {
      this.certificate.signatures = signature;
    } else {
      this.certificate.signatures.push(signature);
    }
    return this;
  }

  withExpiry(date) {
    this.certificate.validUntil = date;
    return this;
  }

  isValid() {
    const now = new Date();
    const validUntil = new Date(this.certificate.validUntil);
    return now < validUntil;
  }

  isExpired() {
    return !this.isValid();
  }

  withId(id) {
    this.certificate.id = id;
    return this;
  }

  withProjectPath(path) {
    this.certificate.projectPath = path;
    return this;
  }

  withStatus(status) {
    this.certificate.status = status;
    return this;
  }

  withMetrics(metrics) {
    this.certificate.metrics = { ...this.certificate.metrics, ...metrics };
    return this;
  }

  withHash(hash) {
    this.certificate.hash = hash;
    return this;
  }

  asExpired() {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    this.certificate.validUntil = past.toISOString();
    return this;
  }

  asValid() {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    this.certificate.validUntil = future.toISOString();
    return this;
  }

  build() {
    return { ...this.certificate };
  }

  static create() {
    return new CertificateBuilder();
  }
}

/**
 * Builder para estado rápido (QuickStatus)
 */
export class QuickStatusBuilder {
  constructor() {
    this.status = {
      status: 'PERFECT',
      emoji: '✅',
      count: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      }
    };
  }

  withTotal(total) {
    this.status.count = total;
    return this;
  }

  withPassed(count) {
    this.status.passed = count;
    return this;
  }

  withFailed(count) {
    this.status.failed = count;
    return this;
  }

  withWarnings(count) {
    this.status.warnings = count;
    return this;
  }

  withSeverityCount(severity, count) {
    this.status.bySeverity[severity] = count;
    return this;
  }

  asCritical() {
    this.status.status = 'CRITICAL';
    this.status.emoji = '🔴';
    return this;
  }

  asWarning() {
    this.status.status = 'WARNING';
    this.status.emoji = '🟡';
    return this;
  }

  asOk() {
    this.status.status = 'OK';
    this.status.emoji = '🟢';
    return this;
  }

  asPerfect() {
    this.status.status = 'PERFECT';
    this.status.emoji = '✅';
    this.status.count = 0;
    return this;
  }

  build() {
    return { ...this.status };
  }

  static create() {
    return new QuickStatusBuilder();
  }
}

export default {
  ValidationResultBuilder,
  IssueBuilder,
  ReportBuilder,
  CertificateBuilder,
  QuickStatusBuilder
};
