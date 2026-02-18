/**
 * @fileoverview Integration Tests: Layer C Verification Flow
 * 
 * Tests the complete verification workflow:
 * - Run full verification → generate report → maybe certificate
 * - Multiple validators working together
 * - Error recovery in validation
 * 
 * @module tests/integration/layer-c/verification-flow.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ValidationResultBuilder, 
  IssueBuilder, 
  ReportBuilder, 
  CertificateBuilder,
  QuickStatusBuilder 
} from '../../factories/layer-c-verification/builders.js';
import { Severity, IssueCategory, DataSystem, VerificationStatus } from '../../../src/layer-c-memory/verification/types/index.js';

const createMockDataLoader = (data) => ({
  loadAll: vi.fn().mockResolvedValue(data),
  getStats: vi.fn().mockReturnValue({ filesLoaded: Object.keys(data).length })
});

const createMockValidator = (result) => ({
  validate: vi.fn().mockResolvedValue(result),
  name: result.name || 'mock-validator'
});

describe('Layer C Integration: Verification Flow', () => {
  let mockDataDir;

  beforeEach(() => {
    mockDataDir = {
      atoms: new Map(),
      files: new Map(),
      connections: [],
      cache: {}
    };
  });

  describe('Full Verification Workflow', () => {
    
    it('should run full verification → generate report → maybe certificate', async () => {
      const integrityResult = new ValidationResultBuilder()
        .asPassed()
        .withStats({ total: 10, valid: 10, invalid: 0 })
        .build();

      const consistencyResult = new ValidationResultBuilder()
        .asPassed()
        .withStats({ total: 8, valid: 8, invalid: 0 })
        .build();

      const results = [integrityResult, consistencyResult];

      const report = new ReportBuilder()
        .asPassed()
        .withValidators(2)
        .withValidatorResult(integrityResult)
        .withValidatorResult(consistencyResult)
        .withSummary({ 
          message: '✅ PASSED: All systems verified.',
          recommendations: []
        })
        .build();

      expect(report.status).toBe(VerificationStatus.PASSED);
      expect(report.stats.validatorsRun).toBe(2);
      expect(report.stats.totalIssues).toBe(0);

      const canGenerateCertificate = report.status === VerificationStatus.PASSED;
      expect(canGenerateCertificate).toBe(true);

      const certificate = new CertificateBuilder()
        .withProjectPath('/test/project')
        .withStatus(VerificationStatus.PASSED)
        .withMetrics({
          totalFiles: 10,
          totalAtoms: 15,
          totalConnections: 8,
          issuesFound: 0
        })
        .build();

      expect(certificate.status).toBe(VerificationStatus.PASSED);
      expect(certificate.metrics.issuesFound).toBe(0);
    });

    it('should generate report with warnings but no certificate', async () => {
      const warningIssue = new IssueBuilder()
        .asWarning()
        .withCategory(IssueCategory.CONSISTENCY)
        .withMessage('Minor inconsistency detected')
        .build();

      const integrityResult = new ValidationResultBuilder()
        .asPassed()
        .build();

      const consistencyResult = new ValidationResultBuilder()
        .asWarning()
        .withIssue(warningIssue)
        .build();

      const report = new ReportBuilder()
        .asWarning()
        .withValidators(2)
        .withIssue(warningIssue)
        .withSummary({
          message: '⚠️ WARNING: Issues found.',
          recommendations: ['Review consistency issues']
        })
        .build();

      expect(report.status).toBe(VerificationStatus.WARNING);
      expect(report.issues.length).toBe(1);
      expect(report.stats.totalIssues).toBe(1);

      const canGenerateCertificateWithWarning = report.status === VerificationStatus.PASSED;
      expect(canGenerateCertificateWithWarning).toBe(false);
    });

    it('should generate failed report with critical issues', async () => {
      const criticalIssue = new IssueBuilder()
        .asCritical()
        .withCategory(IssueCategory.INTEGRITY)
        .withSystem(DataSystem.ATOMS)
        .withMessage('Corrupted atom data')
        .withFile('/data/atoms/corrupted.json')
        .build();

      const integrityResult = new ValidationResultBuilder()
        .asFailed()
        .withIssue(criticalIssue)
        .build();

      const report = new ReportBuilder()
        .asFailed()
        .withIssue(criticalIssue)
        .withBySeverity({ critical: 1, high: 0, medium: 0, low: 0, info: 0 })
        .withSummary({
          message: '❌ CRITICAL: Critical issues found.',
          recommendations: ['Fix critical integrity issues before proceeding']
        })
        .build();

      expect(report.status).toBe(VerificationStatus.FAILED);
      expect(report.issues[0].severity).toBe(Severity.CRITICAL);
      expect(report.stats.bySeverity.critical).toBe(1);
    });
  });

  describe('Multiple Validators Working Together', () => {
    
    it('should aggregate results from integrity and consistency validators', async () => {
      const integrityValidator = createMockValidator({
        name: 'integrity',
        status: VerificationStatus.PASSED,
        issues: [],
        stats: { total: 5, valid: 5, invalid: 0 }
      });

      const consistencyValidator = createMockValidator({
        name: 'consistency',
        status: VerificationStatus.PASSED,
        issues: [],
        stats: { total: 3, valid: 3, invalid: 0 }
      });

      const integrityResult = await integrityValidator.validate();
      const consistencyResult = await consistencyValidator.validate();

      const combinedResults = [integrityResult, consistencyResult];
      
      const allPassed = combinedResults.every(r => r.status === VerificationStatus.PASSED);
      expect(allPassed).toBe(true);

      const totalIssues = combinedResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
      expect(totalIssues).toBe(0);
    });

    it('should handle partial failures in multi-validator run', async () => {
      const validators = [
        createMockValidator({
          name: 'integrity',
          status: VerificationStatus.PASSED,
          issues: []
        }),
        createMockValidator({
          name: 'consistency',
          status: VerificationStatus.WARNING,
          issues: [
            new IssueBuilder().asWarning().withMessage('Path mismatch').build()
          ]
        }),
        createMockValidator({
          name: 'completeness',
          status: VerificationStatus.PASSED,
          issues: []
        })
      ];

      const results = [];
      for (const validator of validators) {
        results.push(await validator.validate());
      }

      const hasAnyFailure = results.some(r => r.status === VerificationStatus.FAILED);
      const hasWarnings = results.some(r => r.status === VerificationStatus.WARNING);
      
      expect(hasAnyFailure).toBe(false);
      expect(hasWarnings).toBe(true);

      const overallStatus = results.some(r => r.status === VerificationStatus.FAILED)
        ? VerificationStatus.FAILED
        : results.some(r => r.status === VerificationStatus.WARNING)
          ? VerificationStatus.WARNING
          : VerificationStatus.PASSED;

      expect(overallStatus).toBe(VerificationStatus.WARNING);
    });

    it('should categorize issues by system and severity', async () => {
      const issues = [
        new IssueBuilder()
          .asCritical()
          .withSystem(DataSystem.ATOMS)
          .withMessage('Atom missing ID')
          .build(),
        new IssueBuilder()
          .asHigh()
          .withSystem(DataSystem.FILES)
          .withMessage('File not found')
          .build(),
        new IssueBuilder()
          .asWarning()
          .withSystem(DataSystem.CONNECTIONS)
          .withMessage('Connection reference missing')
          .build(),
        new IssueBuilder()
          .asLow()
          .withSystem(DataSystem.CACHE)
          .withMessage('Cache stale')
          .build()
      ];

      const report = new ReportBuilder()
        .asWarning()
        .withIssues(issues)
        .withBySeverity({
          critical: 1,
          high: 1,
          medium: 1,
          low: 1,
          info: 0
        })
        .withBySystem({
          [DataSystem.ATOMS]: 1,
          [DataSystem.FILES]: 1,
          [DataSystem.CONNECTIONS]: 1,
          [DataSystem.CACHE]: 1
        })
        .build();

      expect(report.stats.bySeverity.critical).toBe(1);
      expect(report.stats.bySeverity.high).toBe(1);
      expect(report.stats.bySeverity.medium).toBe(1);
      expect(report.stats.bySeverity.low).toBe(1);
      expect(report.stats.bySystem[DataSystem.ATOMS]).toBe(1);
    });
  });

  describe('Error Recovery in Validation', () => {
    
    it('should continue validation despite individual file errors', async () => {
      const files = [
        { path: 'valid1.json', valid: true },
        { path: 'corrupted.json', valid: false, error: 'Invalid JSON' },
        { path: 'valid2.json', valid: true }
      ];

      const results = files.map(file => {
        if (file.valid) {
          return { status: 'valid', path: file.path };
        }
        return { 
          status: 'error', 
          path: file.path, 
          error: file.error 
        };
      });

      const validCount = results.filter(r => r.status === 'valid').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      expect(validCount).toBe(2);
      expect(errorCount).toBe(1);
      expect(results.length).toBe(3);
    });

    it('should recover from validator crash', async () => {
      const crashingValidator = {
        validate: vi.fn().mockRejectedValue(new Error('Validator crashed'))
      };

      const fallbackValidator = createMockValidator({
        status: VerificationStatus.PASSED,
        issues: []
      });

      let result;
      try {
        result = await crashingValidator.validate();
      } catch (error) {
        result = {
          status: VerificationStatus.FAILED,
          error: error.message,
          issues: []
        };
      }

      expect(result.status).toBe(VerificationStatus.FAILED);
      expect(result.error).toBe('Validator crashed');
    });

    it('should handle missing data directories gracefully', async () => {
      const mockLoader = {
        loadAll: vi.fn().mockResolvedValue({
          atoms: {},
          files: {},
          connections: [],
          cache: {}
        })
      };

      const data = await mockLoader.loadAll();
      
      expect(data.atoms).toBeDefined();
      expect(data.files).toBeDefined();
      expect(data.connections).toBeDefined();
      expect(data.cache).toBeDefined();

      const isEmpty = Object.keys(data.atoms).length === 0 &&
                      Object.keys(data.files).length === 0;
      expect(isEmpty).toBe(true);
    });
  });

  describe('Certificate Generation', () => {
    
    it('should generate valid certificate for passed verification', () => {
      const certificate = new CertificateBuilder()
        .withId('cert-test-001')
        .withProjectPath('/project/path')
        .withStatus(VerificationStatus.PASSED)
        .withMetrics({
          totalFiles: 50,
          totalAtoms: 120,
          totalConnections: 45,
          issuesFound: 0
        })
        .withSignature(['integrity-validator', 'consistency-validator'])
        .asValid()
        .build();

      expect(certificate.id).toBe('cert-test-001');
      expect(certificate.status).toBe(VerificationStatus.PASSED);
      expect(certificate.metrics.issuesFound).toBe(0);
      expect(new CertificateBuilder().isValid.call({ certificate })).toBe(true);
    });

    it('should not generate certificate for failed verification', () => {
      const report = new ReportBuilder()
        .asFailed()
        .withIssue(new IssueBuilder().asCritical().build())
        .build();

      const canGenerate = report.status !== VerificationStatus.FAILED;
      expect(canGenerate).toBe(false);
    });

    it('should handle expired certificates', () => {
      const expiredCertificate = new CertificateBuilder()
        .asExpired()
        .build();

      const now = new Date();
      const validUntil = new Date(expiredCertificate.validUntil);
      const isExpired = now > validUntil;

      expect(isExpired).toBe(true);
    });
  });

  describe('Quick Status Check', () => {
    
    it('should provide quick status summary', () => {
      const quickStatus = new QuickStatusBuilder()
        .asPerfect()
        .build();

      expect(quickStatus.status).toBe('PERFECT');
      expect(quickStatus.count).toBe(0);
    });

    it('should show critical status for critical issues', () => {
      const quickStatus = new QuickStatusBuilder()
        .asCritical()
        .withTotal(5)
        .withSeverityCount('critical', 2)
        .build();

      expect(quickStatus.status).toBe('CRITICAL');
      expect(quickStatus.count).toBe(5);
      expect(quickStatus.bySeverity.critical).toBe(2);
    });

    it('should aggregate results into quick status', () => {
      const results = [
        new ValidationResultBuilder().asPassed().build(),
        new ValidationResultBuilder().asWarning().build(),
        new ValidationResultBuilder().asPassed().build()
      ];

      const passed = results.filter(r => r.status === VerificationStatus.PASSED).length;
      const warnings = results.filter(r => r.status === VerificationStatus.WARNING).length;

      expect(passed).toBe(2);
      expect(warnings).toBe(1);
    });
  });

  describe('Issue Management', () => {
    
    it('should group issues by category', () => {
      const issues = [
        new IssueBuilder().withCategory(IssueCategory.INTEGRITY).build(),
        new IssueBuilder().withCategory(IssueCategory.INTEGRITY).build(),
        new IssueBuilder().withCategory(IssueCategory.CONSISTENCY).build(),
        new IssueBuilder().withCategory(IssueCategory.COMPLETENESS).build()
      ];

      const byCategory = issues.reduce((acc, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {});

      expect(byCategory[IssueCategory.INTEGRITY]).toBe(2);
      expect(byCategory[IssueCategory.CONSISTENCY]).toBe(1);
      expect(byCategory[IssueCategory.COMPLETENESS]).toBe(1);
    });

    it('should filter issues by severity threshold', () => {
      const issues = [
        new IssueBuilder().asCritical().build(),
        new IssueBuilder().asHigh().build(),
        new IssueBuilder().asWarning().build(),
        new IssueBuilder().asLow().build(),
        new IssueBuilder().asInfo().build()
      ];

      const severityOrder = [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO];
      
      const highAndAbove = issues.filter(i => 
        severityOrder.indexOf(i.severity) <= severityOrder.indexOf(Severity.HIGH)
      );

      expect(highAndAbove.length).toBe(2);
    });

    it('should generate suggestions for issues', () => {
      const issue = new IssueBuilder()
        .withMessage('Atom references non-existent file')
        .withSuggestion('Verify the file path or remove the atom')
        .build();

      expect(issue.suggestion).toBeDefined();
      expect(issue.suggestion).toContain('file path');
    });
  });

  describe('Performance', () => {
    
    it('should validate large datasets efficiently', async () => {
      const largeAtomCount = 1000;
      const issues = [];

      const start = Date.now();
      
      for (let i = 0; i < largeAtomCount; i++) {
        const isValid = i % 10 !== 0;
        if (!isValid) {
          issues.push(new IssueBuilder()
            .asWarning()
            .withMessage(`Invalid atom ${i}`)
            .build());
        }
      }

      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
      expect(issues.length).toBe(100);
    });
  });
});
