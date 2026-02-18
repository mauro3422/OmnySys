import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  generateReport,
  generateSummary,
  groupIssuesByCategory,
  calculateIssueStats
} from '#layer-c/verification/orchestrator/reporters/report-generator.js';
import { VerificationStatus, Severity, IssueCategory, DataSystem } from '#layer-c/verification/types/index.js';

function createIssue(overrides = {}) {
  return {
    id: `issue-${Date.now()}`,
    category: IssueCategory.INTEGRITY,
    severity: Severity.MEDIUM,
    system: DataSystem.ATOMS,
    path: '/test/path.js',
    message: 'Test issue',
    ...overrides
  };
}

function createValidationResult(overrides = {}) {
  return {
    status: VerificationStatus.PASSED,
    issues: [],
    stats: { total: 10, valid: 10, invalid: 0 },
    ...overrides
  };
}

describe('Report Generator', () => {
  let tempDir;
  const projectPath = '/test/project';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'report-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('generateReport()', () => {
    it('creates proper report structure', () => {
      const results = [createValidationResult()];
      const validators = [{}];
      const startTime = Date.now();

      const report = generateReport(results, validators, projectPath, startTime);

      expect(report).toHaveProperty('projectPath');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('stats');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('validatorResults');
    });

    it('includes projectPath', () => {
      const results = [];
      const validators = [];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.projectPath).toBe(projectPath);
    });

    it('includes timestamp', () => {
      const results = [];
      const validators = [];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp)).toBeInstanceOf(Date);
    });

    it('calculates duration', () => {
      const results = [];
      const validators = [];
      const startTime = Date.now() - 100;

      const report = generateReport(results, validators, projectPath, startTime);

      expect(report.duration).toBeGreaterThanOrEqual(100);
    });

    it('returns PASSED status for no issues', () => {
      const results = [createValidationResult()];
      const validators = [{}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.status).toBe(VerificationStatus.PASSED);
    });

    it('returns FAILED status for critical issues', () => {
      const results = [createValidationResult({
        status: VerificationStatus.FAILED,
        issues: [createIssue({ severity: Severity.CRITICAL })]
      })];
      const validators = [{}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.status).toBe(VerificationStatus.FAILED);
    });

    it('returns WARNING status for non-critical issues', () => {
      const results = [createValidationResult({
        status: VerificationStatus.WARNING,
        issues: [createIssue({ severity: Severity.HIGH })]
      })];
      const validators = [{}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.status).toBe(VerificationStatus.WARNING);
    });

    it('includes all validator results', () => {
      const results = [createValidationResult(), createValidationResult()];
      const validators = [{}, {}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.validatorResults).toHaveLength(2);
    });

    it('counts validators run', () => {
      const results = [];
      const validators = [{}, {}, {}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.stats.validatorsRun).toBe(3);
    });
  });

  describe('stats generation', () => {
    it('calculates totalIssues correctly', () => {
      const results = [
        createValidationResult({ issues: [createIssue()] }),
        createValidationResult({ issues: [createIssue(), createIssue()] })
      ];
      const validators = [{}, {}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.stats.totalIssues).toBe(3);
    });

    it('groups issues by severity', () => {
      const results = [createValidationResult({
        issues: [
          createIssue({ severity: Severity.CRITICAL }),
          createIssue({ severity: Severity.HIGH }),
          createIssue({ severity: Severity.MEDIUM }),
          createIssue({ severity: Severity.LOW }),
          createIssue({ severity: Severity.INFO })
        ]
      })];
      const validators = [{}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.stats.bySeverity.critical).toBe(1);
      expect(report.stats.bySeverity.high).toBe(1);
      expect(report.stats.bySeverity.medium).toBe(1);
      expect(report.stats.bySeverity.low).toBe(1);
      expect(report.stats.bySeverity.info).toBe(1);
    });

    it('groups issues by system', () => {
      const results = [createValidationResult({
        issues: [
          createIssue({ system: DataSystem.ATOMS }),
          createIssue({ system: DataSystem.FILES }),
          createIssue({ system: DataSystem.ATOMS })
        ]
      })];
      const validators = [{}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.stats.bySystem[DataSystem.ATOMS]).toBe(2);
      expect(report.stats.bySystem[DataSystem.FILES]).toBe(1);
    });
  });

  describe('generateSummary()', () => {
    it('returns PASSED message for no issues', () => {
      const issues = [];

      const summary = generateSummary(issues);

      expect(summary.message).toContain('PASSED');
    });

    it('returns CRITICAL message for critical issues', () => {
      const issues = [createIssue({ severity: Severity.CRITICAL })];

      const summary = generateSummary(issues);

      expect(summary.message).toContain('CRITICAL');
      expect(summary.message).toContain('1');
    });

    it('returns WARNING message for high severity issues', () => {
      const issues = [createIssue({ severity: Severity.HIGH })];

      const summary = generateSummary(issues);

      expect(summary.message).toContain('WARNING');
    });

    it('returns INFO message for minor issues', () => {
      const issues = [createIssue({ severity: Severity.LOW })];

      const summary = generateSummary(issues);

      expect(summary.message).toContain('INFO');
    });

    it('includes recommendations', () => {
      const issues = [];

      const summary = generateSummary(issues);

      expect(summary).toHaveProperty('recommendations');
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    it('shows correct critical count', () => {
      const issues = [
        createIssue({ severity: Severity.CRITICAL }),
        createIssue({ severity: Severity.CRITICAL }),
        createIssue({ severity: Severity.HIGH })
      ];

      const summary = generateSummary(issues);

      expect(summary.message).toContain('2 critical');
    });
  });

  describe('groupIssuesByCategory()', () => {
    it('groups issues by category', () => {
      const issues = [
        createIssue({ category: IssueCategory.INTEGRITY }),
        createIssue({ category: IssueCategory.INTEGRITY }),
        createIssue({ category: IssueCategory.CONSISTENCY })
      ];

      const grouped = groupIssuesByCategory(issues);

      expect(grouped[IssueCategory.INTEGRITY]).toHaveLength(2);
      expect(grouped[IssueCategory.CONSISTENCY]).toHaveLength(1);
    });

    it('handles uncategorized issues', () => {
      const issues = [{ message: 'no category' }];

      const grouped = groupIssuesByCategory(issues);

      expect(grouped['uncategorized']).toHaveLength(1);
    });

    it('returns empty object for empty issues', () => {
      const grouped = groupIssuesByCategory([]);

      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('calculateIssueStats()', () => {
    it('calculates total count', () => {
      const issues = [createIssue(), createIssue(), createIssue()];

      const stats = calculateIssueStats(issues);

      expect(stats.total).toBe(3);
    });

    it('calculates bySeverity counts', () => {
      const issues = [
        createIssue({ severity: Severity.CRITICAL }),
        createIssue({ severity: Severity.HIGH }),
        createIssue({ severity: Severity.MEDIUM }),
        createIssue({ severity: Severity.LOW }),
        createIssue({ severity: Severity.INFO })
      ];

      const stats = calculateIssueStats(issues);

      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.medium).toBe(1);
      expect(stats.bySeverity.low).toBe(1);
      expect(stats.bySeverity.info).toBe(1);
    });

    it('calculates bySystem counts', () => {
      const issues = [
        createIssue({ system: DataSystem.ATOMS }),
        createIssue({ system: DataSystem.ATOMS }),
        createIssue({ system: DataSystem.FILES })
      ];

      const stats = calculateIssueStats(issues);

      expect(stats.bySystem[DataSystem.ATOMS]).toBe(2);
      expect(stats.bySystem[DataSystem.FILES]).toBe(1);
    });

    it('returns zero counts for empty issues', () => {
      const stats = calculateIssueStats([]);

      expect(stats.total).toBe(0);
      expect(stats.bySeverity.critical).toBe(0);
      expect(stats.bySeverity.high).toBe(0);
      expect(stats.bySeverity.medium).toBe(0);
      expect(stats.bySeverity.low).toBe(0);
      expect(stats.bySeverity.info).toBe(0);
    });
  });

  describe('validatorResults', () => {
    it('includes status for each validator', () => {
      const results = [
        createValidationResult({ status: VerificationStatus.PASSED }),
        createValidationResult({ status: VerificationStatus.FAILED })
      ];
      const validators = [{}, {}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.validatorResults[0].status).toBe(VerificationStatus.PASSED);
      expect(report.validatorResults[1].status).toBe(VerificationStatus.FAILED);
    });

    it('includes issueCount for each validator', () => {
      const results = [
        createValidationResult({ issues: [createIssue()] }),
        createValidationResult({ issues: [createIssue(), createIssue()] })
      ];
      const validators = [{}, {}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.validatorResults[0].issueCount).toBe(1);
      expect(report.validatorResults[1].issueCount).toBe(2);
    });

    it('includes stats for each validator', () => {
      const results = [createValidationResult({
        stats: { total: 10, valid: 9, invalid: 1 }
      })];
      const validators = [{}];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.validatorResults[0].stats.total).toBe(10);
    });
  });

  describe('Integration', () => {
    it('generates complete report from multiple validators', () => {
      const results = [
        createValidationResult({
          status: VerificationStatus.PASSED,
          stats: { total: 50, valid: 50, invalid: 0 }
        }),
        createValidationResult({
          status: VerificationStatus.WARNING,
          issues: [createIssue({ severity: Severity.HIGH, system: DataSystem.ATOMS })],
          stats: { total: 30, valid: 29, invalid: 1 }
        })
      ];
      const validators = [
        { constructor: { name: 'IntegrityValidator' } },
        { constructor: { name: 'ConsistencyValidator' } }
      ];

      const report = generateReport(results, validators, projectPath, Date.now());

      expect(report.projectPath).toBe(projectPath);
      expect(report.status).toBe(VerificationStatus.WARNING);
      expect(report.stats.totalIssues).toBe(1);
      expect(report.stats.validatorsRun).toBe(2);
      expect(report.validatorResults).toHaveLength(2);
      expect(report.summary).toBeDefined();
    });
  });
});
